FEATURES = {
    "prolong_wait": {
        "label": "Ожидает оплаты",
        "default_weight": 45,
    },
    "insufficient_balance": {
        "label": "Не хватает средств",
        "default_weight": 35,
    },
    "autoprolong_disabled": {
        "label": "Автопродление выключено",
        "default_weight": 20,
    },
}


def get_effective_weights(
    stored_weights: dict[str, int],
) -> dict[str, int]:
    return {
        name: stored_weights.get(
            name,
            metadata["default_weight"],
        )
        for name, metadata in FEATURES.items()
    }


def get_feature_labels() -> dict[str, str]:
    return {
        name: metadata["label"]
        for name, metadata in FEATURES.items()
    }