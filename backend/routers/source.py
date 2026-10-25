import logging
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, insert, select
from sqlalchemy.exc import IntegrityError, DataError
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.dependencies import get_current_user, verify_request_origin
from backend.models import Account, Service, SourceTransaction, ModelSettings
from backend.source_schemas import SnapshotInput
from backend.analytics_schemas import SnapshotResponse
from backend.scoring import calculate_all

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/source", tags=["Source"], dependencies=[Depends(get_current_user)])

@router.put("/snapshot", response_model=SnapshotResponse)
def replace_snapshot(
    payload: SnapshotInput,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[None, Depends(verify_request_origin)],
):
    try:
        settings = db.scalar(select(ModelSettings).where(ModelSettings.id == 1).with_for_update())
        if settings is None:
            raise HTTPException(status_code=503, detail="Model settings are not initialized")
        for model in (SourceTransaction, Service, Account):
            db.execute(delete(model))
        for model, rows in ((Account, payload.accounts), (Service, payload.services), (SourceTransaction, payload.transactions)):
            if rows:
                db.execute(insert(model), [row.model_dump() for row in rows])
        accounts = list(db.scalars(select(Account)))
        services = list(db.scalars(select(Service)))
        calculate_all(accounts, services, settings)
        db.commit()
    except (IntegrityError, DataError):
        db.rollback()
        logger.exception("Snapshot failed database validation")
        raise HTTPException(status_code=422, detail="Снимок нарушает ограничения базы; прежние данные сохранены") from None
    except Exception:
        db.rollback()
        raise
    return SnapshotResponse(ok=True, customers=len(payload.accounts), services=len(payload.services))
