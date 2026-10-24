from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.db import get_db
from backend.dependencies import (
    AuthContext,
    get_auth_context,
    get_current_user,
)
from backend.models import AuthSession, User
from backend.schemas import (
    LoginRequest,
    MessageResponse,
    TokenResponse,
    UserResponse,
)
from backend.security import (
    DUMMY_PASSWORD_HASH,
    generate_session_token,
    hash_session_token,
    verify_password,
)


router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Auth"],
)


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    user = db.scalar(
        select(User).where(
            User.username == payload.username,
        )
    )

    stored_hash = (
        user.password_hash
        if user is not None
        else DUMMY_PASSWORD_HASH
    )

    password_valid = verify_password(
        payload.password,
        stored_hash,
    )

    if user is None or not password_valid or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()

    expires_at = datetime.now(timezone.utc) + timedelta(
        hours=settings.session_ttl_hours,
    )

    token = generate_session_token()

    auth_session = AuthSession(
        user_id=user.id,
        token_hash=hash_session_token(token),
        expires_at=expires_at,
    )

    db.add(auth_session)
    db.commit()

    response.headers["Cache-Control"] = "no-store"

    return TokenResponse(
        access_token=token,
        expires_at=expires_at,
    )


@router.get("/me", response_model=UserResponse)
def me(
    response: Response,
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    response.headers["Cache-Control"] = "no-store"
    return user


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    auth: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    db.delete(auth.session)
    db.commit()

    response.headers["Cache-Control"] = "no-store"

    return MessageResponse(
        detail="Выход выполнен",
    )