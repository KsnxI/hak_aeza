from decimal import Decimal
from backend.features.registry import feature

@feature("prolong_wait", label="Ожидает оплаты", default_weight=45)
def prolong_wait(customer, services, settings):
    waiting = [s for s in services if s.status == "prolong_wait"]
    if not waiting:
        return Decimal(0), "Нет услуг в ожидании оплаты"
    funds = customer.balance + (customer.bonus_balance if customer.bonus_state == "unlocked" else 0)
    insufficient = any(funds < s.price for s in waiting)
    value = Decimal(1) if insufficient else Decimal("0.6")
    reason = f"Ожидают оплаты услуг: {len(waiting)}; "
    reason += "средств не хватает хотя бы на одну" if insufficient else "средств хватает на каждую по отдельности"
    return value, reason
