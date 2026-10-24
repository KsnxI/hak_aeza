from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.dependencies import get_current_user
from backend.models import ModelSettings
from backend.schemas import (
    ModelSettingsPatch,
    ModelSettingsResponse,
    ModelSettingsValues,
)


router = APIRouter(
    prefix="/api/v1/model",
    tags=["Model settings"],
    dependencies=[Depends(get_current_user)],
)


def settings_unavailable() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            "Настройки модели не инициализированы. "
            "Проверьте миграцию и начальную запись model_settings."
        ),
    )


@router.get(
    "/settings",
    response_model=ModelSettingsResponse,
)
def get_model_settings(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> ModelSettings:
    settings = db.get(ModelSettings, 1)

    if settings is None:
        raise settings_unavailable()

    response.headers["Cache-Control"] = "no-store"

    return settings


@router.patch(
    "/settings",
    response_model=ModelSettingsResponse,
)
def update_model_settings(
    payload: ModelSettingsPatch,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> ModelSettings:
    changes = payload.model_dump(exclude_unset=True)

    try:
        settings = db.scalar(
            select(ModelSettings)
            .where(ModelSettings.id == 1)
            .with_for_update()
        )

        if settings is None:
            raise settings_unavailable()

        current_values = ModelSettingsValues.model_validate(
            settings
        ).model_dump()

        merged_values = {
            **current_values,
            **changes,
        }

        try:
            validated_values = ModelSettingsValues.model_validate(
                merged_values
            )
        except ValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from None

        new_values = validated_values.model_dump()

        if new_values != current_values:
            for field_name, value in new_values.items():
                setattr(settings, field_name, value)

            settings.version += 1


        db.commit()
        db.refresh(settings)

    except Exception:
        db.rollback()
        raise

    response.headers["Cache-Control"] = "no-store"

    return settings