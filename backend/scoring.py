from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from backend.feature_catalog import FEATURES, get_effective_weights
from backend.features.registry import CalculationSettings

ACTIVE_STATUSES = {"active", "suspended", "prolong_wait"}
FACTORS = {
    "hour": Decimal(720), "week": Decimal("4.3"), "month": Decimal(1),
    "quarter_year": Decimal(1) / Decimal(3),
    "half_year": Decimal(1) / Decimal(6), "year": Decimal(1) / Decimal(12),
}

def rounded(value):
    return int(Decimal(value).quantize(Decimal(1), rounding=ROUND_HALF_UP))

def service_view(service):
    return {
        "id": service.id, "name": service.name, "status": service.status,
        "price": service.price,
        "paymentTerm": "quater_year" if service.payment_term == "quarter_year" else service.payment_term,
        "autoprolong": service.auto_prolong, "expiresAt": service.expires_at,
    }

def score_customer(customer, services, settings, now):
    result = {
        "id": customer.id, "email": customer.email, "balance": customer.balance,
        "totalReplenished": customer.total_replenished,
        "score": None, "level": "none", "reasons": ["Недостаточно данных"],
        "potentialLoss": 0, "services": [service_view(s) for s in services], "features": [],
    }
    if not services:
        return result
    active = [s for s in services if s.status in ACTIVE_STATUSES]
    weights = get_effective_weights(settings.weights)
    total_weight = sum(weights.values())
    if total_weight <= 0:
        raise ValueError("Сумма весов должна быть положительной")
    calculation = CalculationSettings(settings.horizon_days, now)
    features = []
    exact_contributions = []
    for name, metadata in FEATURES.items():
        value, reason = metadata["calculate"](customer, active, calculation)
        value = Decimal(str(value))
        if not value.is_finite() or not 0 <= value <= 1:
            raise ValueError(f"Признак {name} вернул значение вне [0, 1]")
        exact = Decimal(100) * weights[name] * value / total_weight
        exact_contributions.append(exact)
        features.append({
            "name": name, "label": metadata["label"], "value": float(value),
            "weight": weights[name], "contribution": rounded(exact), "reason": reason,
        })
    score = rounded(sum(exact_contributions, Decimal(0)))
    level = "high" if score >= settings.high_threshold else "medium" if score >= settings.medium_threshold else "low"
    ordered = sorted(zip(features, exact_contributions), key=lambda item: item[1], reverse=True)
    reasons = [f["reason"] for f, exact in ordered if f["value"] >= 0.5 and exact > 0]
    monthly = sum((Decimal(s.price) * FACTORS[s.payment_term] for s in active), Decimal(0))
    result.update(
        score=score, level=level,
        reasons=reasons or ["Явных рисков нет"],
        potentialLoss=rounded(Decimal(score) / 100 * monthly),
        features=features,
    )
    return result

def calculate_all(accounts, services, settings, now=None):
    now = now or datetime.now(timezone.utc)
    groups = defaultdict(list)
    for service in services:
        groups[service.owner_id].append(service)
    return [score_customer(a, groups[a.id], settings, now) for a in accounts]

def services_at_risk(rows):
    return sum(
        sum(s["status"] in ACTIVE_STATUSES for s in row["services"])
        for row in rows if row["level"] in {"high", "medium"}
    )
