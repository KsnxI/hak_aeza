"""move model weights to jsonb

Revision ID: ec3433ef25e0
Revises: 0533d2b5de2b
Create Date: 2026-10-25 06:29:31.969577

"""
from typing import Sequence, Union
from sqlalchemy.dialects import postgresql
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec3433ef25e0'
down_revision: Union[str, Sequence[str], None] = '0533d2b5de2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "model_settings",
        sa.Column(
            "weights",
            postgresql.JSONB(),
            nullable=True,
        ),
    )

    op.execute(
        """
        UPDATE model_settings
        SET weights = jsonb_build_object(
            'prolong_wait', weight_prolong_wait,
            'insufficient_balance', weight_insufficient_balance,
            'autoprolong_disabled', weight_autoprolong_disabled
        )
        """
    )

    op.alter_column(
        "model_settings",
        "weights",
        nullable=False,
    )

    op.create_check_constraint(
        "ck_model_settings_weights_object",
        "model_settings",
        "jsonb_typeof(weights) = 'object'",
    )

    op.drop_constraint(
        "ck_model_settings_weights",
        "model_settings",
        type_="check",
    )

    op.drop_column(
        "model_settings",
        "weight_prolong_wait",
    )
    op.drop_column(
        "model_settings",
        "weight_insufficient_balance",
    )
    op.drop_column(
        "model_settings",
        "weight_autoprolong_disabled",
    )


def downgrade() -> None:
    op.add_column(
        "model_settings",
        sa.Column(
            "weight_prolong_wait",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("45"),
        ),
    )
    op.add_column(
        "model_settings",
        sa.Column(
            "weight_insufficient_balance",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("35"),
        ),
    )
    op.add_column(
        "model_settings",
        sa.Column(
            "weight_autoprolong_disabled",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("20"),
        ),
    )

    op.execute(
        """
        UPDATE model_settings
        SET
            weight_prolong_wait =
                COALESCE((weights->>'prolong_wait')::integer, 45),
            weight_insufficient_balance =
                COALESCE(
                    (weights->>'insufficient_balance')::integer,
                    35
                ),
            weight_autoprolong_disabled =
                COALESCE(
                    (weights->>'autoprolong_disabled')::integer,
                    20
                )
        """
    )

    op.create_check_constraint(
        "ck_model_settings_weights",
        "model_settings",
        """
        weight_prolong_wait BETWEEN 0 AND 100
        AND weight_insufficient_balance BETWEEN 0 AND 100
        AND weight_autoprolong_disabled BETWEEN 0 AND 100
        """,
    )

    op.drop_constraint(
        "ck_model_settings_weights_object",
        "model_settings",
        type_="check",
    )

    op.drop_column("model_settings", "weights")
