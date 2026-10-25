from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Annotated
from urllib.parse import urlsplit

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import APIKeyCookie
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.db import get_db
from backend.models import AuthSession, User
from backend.security import hash_session_token


settings = get_settings()

cookie_scheme = APIKeyCookie(
    name=settings.session_cookie_name,
    auto_error=False,
    scheme_name="SessionCookie",
)


@dataclass
class AuthContext:
    user: User
    session: AuthSession


def unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )


def verify_request_origin(request: Request) -> None:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return

    origin = request.headers.get("origin")

    if origin is None:
        referer = request.headers.get("referer")

        if referer:
            parts = urlsplit(referer)
            origin = f"{parts.scheme}://{parts.netloc}"

    if origin not in settings.trusted_origins:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Untrusted request origin",
        )


def get_auth_context(
    token: Annotated[str | None, Depends(cookie_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> AuthContext:
    if not token or len(token) > 512:
        raise unauthorized()

    auth_session = db.scalar(
        select(AuthSession).where(
            AuthSession.token_hash == hash_session_token(token),
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