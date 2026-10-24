from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    username: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )


class ModelSettings(Base):
    __tablename__ = "model_settings"

    __table_args__ = (
        CheckConstraint(
            "id = 1",
            name="ck_model_settings_single_row",
        ),
        CheckConstraint(
            "horizon_days BETWEEN 1 AND 365",
            name="ck_model_settings_horizon",
        ),
        CheckConstraint(
            """
            weight_prolong_wait BETWEEN 0 AND 100
            AND weight_insufficient_balance BETWEEN 0 AND 100
            AND weight_autoprolong_disabled BETWEEN 0 AND 100
            """,
            name="ck_model_settings_weights",
        ),
        CheckConstraint(
            """
            medium_threshold > 0
            AND medium_threshold < high_threshold
            AND high_threshold <= 100
            """,
            name="ck_model_settings_thresholds",
        ),
        CheckConstraint(
            "version >= 1",
            name="ck_model_settings_version",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=False,
    )

    horizon_days: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("7"),
    )

    weight_prolong_wait: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("45"),
    )

    weight_insufficient_balance: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("35"),
    )

    weight_autoprolong_disabled: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("20"),
    )

    medium_threshold: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("30"),
    )

    high_threshold: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("60"),
    )

    version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("1"),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )