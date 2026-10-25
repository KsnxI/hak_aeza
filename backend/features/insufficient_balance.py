from datetime import timedelta
from decimal import Decimal
from backend.features.registry import feature

@feature("insufficient_balance", label="Не хватает средств", default_weight=35)
def insufficient_balance(customer, services, settings):
    end = settings.now + timedelta(days=settings.horizon_days)
    need = sum(s.price for s in services if settings.now <= s.expires_at <= end)
    funds = customer.balance + (customer.bonus_balance if customer.bonus_state == "unlocked" else 0)
    if need == 0:
        return Decimal(0), "В горизонте анализа нет платежей за продление"
    value = max(Decimal(0), min(Decimal(1), Decimal(1) - Decimal(funds) / Decimal(need)))
    return value, f"На ближайшие продления нужно {need} единиц, доступно {funds}"
