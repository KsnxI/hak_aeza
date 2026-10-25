from dataclasses import dataclass
from datetime import datetime
from importlib import import_module
from pkgutil import iter_modules
from typing import Callable

FEATURES: dict[str, dict] = {}

@dataclass(frozen=True)
class CalculationSettings:
    horizon_days: int
    now: datetime

def feature(name: str, *, label: str, default_weight: int):
    if not name or not 0 <= default_weight <= 100:
        raise ValueError("Некорректное описание признака")
    def register(function: Callable):
        if name in FEATURES:
            raise ValueError(f"Повторяющийся признак: {name}")
        FEATURES[name] = {
            "label": label,
            "default_weight": default_weight,
            "calculate": function,
        }
        return function
    return register

def load_features():
    from backend import features
    for module in sorted(iter_modules(features.__path__), key=lambda item: item.name):
        if not module.name.startswith("_") and module.name != "registry":
            import_module(f"backend.features.{module.name}")
