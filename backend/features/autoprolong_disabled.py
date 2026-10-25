from datetime import timedelta
from decimal import Decimal
from backend.features.registry import feature

@feature("autoprolong_disabled", label="Автопродление выключено", default_weight=20)
def autoprolong_disabled(customer, services, settings):
    end = settings.now + timedelta(days=settings.horizon_days)
    count = sum(not s.auto_prolong and settings.now <= s.expires_at <= end for s in services)
    return Decimal(int(count > 0)), f"Автопродление выключено, срок истекает скоро (услуг: {count})"
