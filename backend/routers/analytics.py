from datetime import datetime, timedelta, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.dependencies import get_current_user
from backend.analysis_service import load_analysis
from backend.analytics_schemas import SummaryResponse
from backend.scoring import ACTIVE_STATUSES, calculate_all, services_at_risk

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"], dependencies=[Depends(get_current_user)])

@router.get("/summary", response_model=SummaryResponse, response_model_exclude_none=True)
def summary(response: Response, db: Annotated[Session, Depends(get_db)]):
    accounts, services, settings = load_analysis(db)
    now = datetime.now(timezone.utc)
    rows = calculate_all(accounts, services, settings, now)
    counts = {level: sum(r["level"] == level for r in rows) for level in ("high", "medium", "low", "none")}
    chart = []
    for offset in range(-7, 8):
        at = now + timedelta(days=offset)
        point = {"date": at.date().isoformat()}
        if offset >= 0:
            projected = rows if offset == 0 else calculate_all(accounts, services, settings, at)
            point["atRiskForecast"] = services_at_risk(projected)
            point["expectedChurn"] = sum(
                s.status in ACTIVE_STATUSES and not s.auto_prolong and s.expires_at.date() == at.date()
                for s in services
            )
        if offset == 0:
            point["atRisk"] = services_at_risk(rows)
        chart.append(point)
    response.headers["Cache-Control"] = "no-store"
    return {
        "totalCustomers": len(rows), "counts": counts,
        "potentialLoss": sum(r["potentialLoss"] for r in rows),
        "servicesAtRisk": services_at_risk(rows),
        "lossExplanation": (
            "Эвристическая оценка месячной выручки под риском, не подтверждённая вероятность потерь. "
            "Для каждого клиента: округлённый score / 100 × месячная стоимость действующих услуг. "
            "Коэффициенты: hour 720, week 4.3, month 1, quarter_year 1/3, half_year 1/6, year 1/12. "
            "deleted и blocked исключены. Баланс и доступные бонусы влияют через признаки риска. "
            "Суммы в единицах баланса: 100 = 1 EUR. "
            "Прогноз графика условный: статусы и балансы снимка фиксированы, меняется дата анализа. "
            "expectedChurn — число истекающих услуг без автопродления, не факт удаления. "
            "Исторические удаления пока не измерены."
        ),
        "chart": chart,
    }
