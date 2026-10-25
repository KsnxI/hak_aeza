from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator


Weight = Annotated[int, Field(strict=True, ge=0, le=100)]
Threshold = Annotated[int, Field(strict=True, ge=1, le=100)]


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    login: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=1024)


class LoginResponse(BaseModel):
    login: str


class Thresholds(BaseModel):
    model_config = ConfigDict(extra="forbid")

    high: Threshold
    medium: Threshold

    @model_validator(mode="after")
    def validate_order(self) -> Self:
        if self.medium >= self.high:
            raise ValueError("medium должен быть меньше high")

        return self


class ThresholdsPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    high: Threshold | None = None
    medium: Threshold | None = None

    @model_validator(mode="after")
    def reject_null(self) -> Self:
        for name in self.model_fields_set:
            if getattr(self, name) is None:
                raise ValueError(f"{name} нельзя передавать как null")

        return self


class ModelSettingsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    weights: dict[str, Weight]
    labels: dict[str, str]
    thresholds: Thresholds

    horizon_days: int = Field(
        alias="horizonDays",
        strict=True,
        ge=1,
        le=365,
    )


class ModelSettingsPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    weights: dict[str, Weight] | None = None
    thresholds: ThresholdsPatch | None = None

    horizon_days: int | None = Field(
        default=None,
        alias="horizonDays",
        strict=True,
        ge=1,
        le=365,
    )

    @model_validator(mode="after")
    def reject_null(self) -> Self:
        for name in self.model_fields_set:
            if getattr(self, name) is None:
                raise ValueError(f"{name} нельзя передавать как null")

        return self