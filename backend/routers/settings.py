from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.dependencies import (
    get_current_user,
    verify_request_origin,
)
from backend.feature_catalog import (
    FEATURES,
    get_effective_weights,
    get_feature_labels,
)
from backend.models import ModelSettings
from backend.schemas import (
    ModelSettingsPatch,
    ModelSettingsResponse,
    Thresholds,
)


router = APIRouter(
    prefix="/api/v1/model",
    tags=["Model settings"],
    dependencies=[Depends(get_current_user)],
)


def serialize_settings(
    settings: ModelSettings,
) -> ModelSettingsResponse:
    return ModelSettingsResponse(
        weights=get_effective_weights(settings.weights),
        labels=get_feature_labels(),
        thresholds=Thresholds(
            high=settings.high_threshold,
            medium=settings.medium_threshold,
        ),
        horizonDays=settings.horizon_days,
    )


def settings_unavailable() -> HTTPException:
    return HTTPException(
        status_code=503,
        detail="Model settings are not initialized",
    )


@router.get(
    "/settings",
    response_model=ModelSettingsResponse,
)
def get_model_settings(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> ModelSettingsResponse:
    settings = db.get(ModelSettings, 1)

    if settings is None:
        raise settings_unavailable()

    response.headers["Cache-Control"] = "no-store"

    return serialize_settings(settings)


@router.patch(
    "/settings",
    response_model=ModelSettingsResponse,
)
def update_model_settings(
    payload: ModelSettingsPatch,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[None, Depends(verify_request_origin)],
) -> ModelSettingsResponse:
    try:
        settings = db.scalar(
            select(ModelSettings)
            .where(ModelSettings.id == 1)
            .with_for_update()
        )

        if settings is None:
            raise settings_unavailable()

        current_weights = get_effective_weights(
            settings.weights
        )

        weight_changes = (
            payload.weights
            if payload.weights is not None
            else {}
        )

        unknown_names = set(weight_changes) - set(FEATURES)

        if unknown_names:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Unknown features: "
                    + ", ".join(sorted(unknown_names))
                ),
            )

        new_weights = {
            **current_weights,
            **weight_changes,
        }

        if sum(new_weights.values()) <= 0:
            raise HTTPException(
                status_code=422,
                detail="At least one weight must be greater than zero",
            )

        threshold_changes = (
            payload.thresholds.model_dump(exclude_unset=True)
            if payload.thresholds is not None
            else {}
        )

        try:
            new_thresholds = Thresholds.model_validate(
                {
                    "high": settings.high_threshold,
                    "medium": settings.medium_threshold,
                    **threshold_changes,
                }
            )
        except ValidationError as exc:
            raise HTTPException(
                status_code=422,
                detail=str(exc),
            ) from None

        new_horizon = (
            payload.horizon_days
            if payload.horizon_days is not None
            else settings.horizon_days
        )

        changed = (
            new_weights != current_weights
            or new_thresholds.high != settings.high_threshold
            or new_thresholds.medium != settings.medium_threshold
            or new_horizon != settings.horizon_days
        )

        if changed:
            settings.weights = {
                **settings.weights,
                **new_weights,
            }

            settings.high_threshold = new_thresholds.high
            settings.medium_threshold = new_thresholds.medium
            settings.horizon_days = new_horizon
            settings.version += 1

        db.commit()
        db.refresh(settings)

        result = serialize_settings(settings)

    except Exception:
        db.rollback()
        raise

    response.headers["Cache-Control"] = "no-store"

    return result