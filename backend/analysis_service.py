from fastapi import HTTPException
from sqlalchemy import select
from backend.models import Account, Service, ModelSettings
from backend.scoring import calculate_all

def load_analysis(db):
    settings = db.scalar(
        select(ModelSettings).where(ModelSettings.id == 1).with_for_update(read=True)
    )
    if settings is None:
        raise HTTPException(status_code=503, detail="Model settings are not initialized")
    accounts = list(db.scalars(select(Account).order_by(Account.id)))
    services = list(db.scalars(select(Service).order_by(Service.id)))
    return accounts, services, settings

def analyze(db):
    accounts, services, settings = load_analysis(db)
    return calculate_all(accounts, services, settings)
