from backend.features.registry import FEATURES, load_features

load_features()

def get_effective_weights(stored_weights: dict[str, int]) -> dict[str, int]:
    return {
        name: stored_weights.get(name, metadata["default_weight"])
        for name, metadata in FEATURES.items()
    }

def get_feature_labels() -> dict[str, str]:
    return {name: metadata["label"] for name, metadata in FEATURES.items()}
