from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.models import AuthSession, User
from backend.security import hash_session_token


bearer_scheme = HTTPBearer(
    auto_error=False,
    scheme_name="SessionToken",
)


@dataclass
class AuthContext:
    user: User
    session: AuthSession


def unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Требуется вход или срок действия сессии истёк",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_auth_context(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> AuthContext:
    if credentials is None:
        raise unauthorized()

    if credentials.scheme.lower() != "bearer":
        raise unauthorized()

    token = credentials.credentials

    if len(token) > 512:
        raise unauthorized()

    token_hash = hash_session_token(token)

    auth_session = db.scalar(
        select(AuthSession).where(
            AuthSession.token_hash == token_hash,
            AuthSession.expires_at > datetime.now(timezone.utc),
        )
    )

    if auth_session is None:
        raise unauthorized()

    user = db.get(User, auth_session.user_id)

    if user is None or not user.is_active:
        raise unauthorized()

    return AuthContext(
        user=user,
        session=auth_session,
    )


def get_current_user(
    auth: Annotated[AuthContext, Depends(get_auth_context)],
) -> User:
    return auth.user