from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from typing import Self
from pydantic import model_validator



class LoginRequest(BaseModel):
    username: str = Field(
        min_length=1,
        max_length=100,
    )

    password: str = Field(
        min_length=1,
        max_length=1024,
    )


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_at: datetime


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    is_active: bool
    created_at: datetime


class MessageResponse(BaseModel):
    detail: str

class ModelSettingsValues(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        extra="forbid",
    )

    horizon_days: int = Field(
        strict=True,
        ge=1,
        le=365,
    )

    weight_prolong_wait: int = Field(
        strict=True,
        ge=0,
        le=100,
    )

    weight_insufficient_balance: int = Field(
        strict=True,
        ge=0,
        le=100,
    )

    weight_autoprolong_disabled: int = Field(
        strict=True,
        ge=0,
        le=100,
    )

    medium_threshold: int = Field(
        strict=True,
        ge=1,
        le=99,
    )

    high_threshold: int = Field(
        strict=True,
        ge=2,
        le=100,
    )

    @model_validator(mode="after")
    def validate_thresholds(self) -> Self:
        if self.medium_threshold >= self.high_threshold:
            raise ValueError(
                "medium_threshold должен быть меньше high_threshold"
            )

        return self


class ModelSettingsResponse(ModelSettingsValues):
    id: int
    version: int
    updated_at: datetime


class ModelSettingsPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    horizon_days: int | None = Field(
        default=None,
        strict=True,
        ge=1,
        le=365,
    )

    weight_prolong_wait: int | None = Field(
        default=None,
        strict=True,
        ge=0,
        le=100,
    )

    weight_insufficient_balance: int | None = Field(
        default=None,
        strict=True,
        ge=0,
        le=100,
    )

    weight_autoprolong_disabled: int | None = Field(
        default=None,
        strict=True,
        ge=0,
        le=100,
    )

    medium_threshold: int | None = Field(
        default=None,
        strict=True,
        ge=1,
        le=99,
    )

    high_threshold: int | None = Field(
        default=None,
        strict=True,
        ge=2,
        le=100,
    )

    @model_validator(mode="after")
    def reject_explicit_null(self) -> Self:
        for field_name in self.model_fields_set:
            if getattr(self, field_name) is None:
                raise ValueError(
                    f"Поле {field_name} нельзя передавать как null"
                )

        return self