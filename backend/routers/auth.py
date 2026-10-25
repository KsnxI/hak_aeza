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
    verify_request_origin,
)
from backend.models import AuthSession, User
from backend.schemas import LoginRequest, LoginResponse
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


@router.post(
    "/login",
    response_model=LoginResponse,
    dependencies=[Depends(verify_request_origin)],
)
def login(
    payload: LoginRequest,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> LoginResponse:
    user = db.scalar(
        select(User).where(User.username == payload.login)
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
            detail="Invalid login or password",
        )

    settings = get_settings()

    ttl_seconds = settings.session_ttl_hours * 3600

    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=ttl_seconds
    )

    token = generate_session_token()

    db.add(
        AuthSession(
            user_id=user.id,
            token_hash=hash_session_token(token),
            expires_at=expires_at,
        )
    )
    db.commit()

    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=ttl_seconds,
        expires=expires_at,
        path="/",
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
    )

    response.headers["Cache-Control"] = "no-store"

    return LoginResponse(login=user.username)


@router.get("/me", response_model=LoginResponse)
def me(
    response: Response,
    user: Annotated[User, Depends(get_current_user)],
) -> LoginResponse:
    response.headers["Cache-Control"] = "no-store"

    return LoginResponse(login=user.username)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
)
def logout(
    auth: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[None, Depends(verify_request_origin)],
) -> Response:
    db.delete(auth.session)
    db.commit()

    settings = get_settings()

    response = Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )

    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
    )

    response.headers["Cache-Control"] = "no-store"

    return response