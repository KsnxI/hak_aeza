from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import (
    BigInteger,
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
            "jsonb_typeof(weights) = 'object'",
            name="ck_model_settings_weights_object",
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

    weights: Mapped[dict[str, int]] = mapped_column(
        JSONB,
        nullable=False,
    )

    horizon_days: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("7"),
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

class Account(Base):
    __tablename__ = "accounts"

    __table_args__ = (
        CheckConstraint(
            """
            balance >= 0
            AND withdraw_balance >= 0
            AND total_replenished >= 0
            AND bonus_balance >= 0
            """,
            name="ck_accounts_nonnegative_money",
        ),
        CheckConstraint(
            "bonus_state IN ('locked', 'unlocked')",
            name="ck_accounts_bonus_state",
        ),
    )

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=False,
    )

    email: Mapped[str] = mapped_column(
        String,
        unique=True,
        nullable=False,
    )

    balance: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    withdraw_balance: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    total_replenished: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    bonus_balance: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    bonus_state: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

class Service(Base):
    __tablename__ = "services"

    __table_args__ = (
        CheckConstraint(
            "price >= 0",
            name="ck_services_price",
        ),
        CheckConstraint(
            """
            status IN (
                'active',
                'blocked',
                'deleted',
                'suspended',
                'prolong_wait'
            )
            """,
            name="ck_services_status",
        ),
        CheckConstraint(
            """
            payment_term IN (
                'hour',
                'week',
                'month',
                'quarter_year',
                'half_year',
                'year'
            )
            """,
            name="ck_services_payment_term",
        ),
        CheckConstraint(
            "expires_at >= created_at",
            name="ck_services_dates",
        ),
        CheckConstraint(
            "name ~ '^[A-Za-z0-9-]+$'",
            name="ck_services_name",
        ),
    )

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=False,
    )

    owner_id: Mapped[int] = mapped_column(
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    payment_term: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    auto_prolong: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String,
        nullable=False,
        index=True,
    )

    price: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

class SourceTransaction(Base):
    __tablename__ = "transactions"

    __table_args__ = (
        CheckConstraint(
            "amount BETWEEN 0 AND 1000",
            name="ck_transactions_amount",
        ),
        CheckConstraint(
            "status IN ('performed', 'not_performed')",
            name="ck_transactions_status",
        ),
        CheckConstraint(
            "type IN ('order', 'prolong')",
            name="ck_transactions_type",
        ),
        CheckConstraint(
            """
            (
                status = 'not_performed'
                AND performed_at IS NULL
            )
            OR
            (
                status = 'performed'
                AND performed_at IS NOT NULL
                AND performed_at >= created_at
            )
            """,
            name="ck_transactions_performed",
        ),
    )

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=False,
    )

    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    type: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    performed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )