from typing import Annotated, Literal, Self
from datetime import timezone
from pydantic import BaseModel, ConfigDict, Field, AwareDatetime, field_validator, model_validator
from pydantic.alias_generators import to_camel

SourceId = Annotated[int, Field(strict=True, ge=1, le=9223372036854775807)]
Money = Annotated[int, Field(strict=True, ge=0, le=9223372036854775807)]

class SourceBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")

class AccountInput(SourceBase):
    id: SourceId
    email: str = Field(min_length=1)
    balance: Money
    withdraw_balance: Money
    total_replenished: Money
    bonus_balance: Money
    bonus_state: Literal["locked", "unlocked"]

class ServiceInput(SourceBase):
    id: SourceId
    owner_id: SourceId
    name: str = Field(pattern=r"^[A-Za-z0-9-]+$")
    payment_term: Literal["hour", "week", "month", "quarter_year", "half_year", "year"]
    auto_prolong: bool = Field(strict=True)
    created_at: AwareDatetime
    expires_at: AwareDatetime
    status: Literal["active", "blocked", "deleted", "suspended", "prolong_wait"]
    price: Money

    @model_validator(mode="before")
    @classmethod
    def map_source(cls, data):
        if not isinstance(data, dict):
            return data
        data = dict(data)
        aliases = {"pice": "price", "paymentTem": "paymentTerm", "autoprolong": "autoProlong"}
        for old, new in aliases.items():
            if old in data:
                if new in data and data[new] != data[old]:
                    raise ValueError(f"Конфликт полей {old} и {new}")
                data[new] = data.pop(old)
        for name in ("paymentTerm", "payment_term"):
            if data.get(name) == "quater_year":
                data[name] = "quarter_year"
        return data

    @field_validator("created_at", "expires_at")
    @classmethod
    def utc(cls, value):
        return value.astimezone(timezone.utc)

    @model_validator(mode="after")
    def dates_valid(self) -> Self:
        if self.expires_at < self.created_at:
            raise ValueError("expiresAt раньше createdAt")
        return self

class TransactionInput(SourceBase):
    id: SourceId
    service_id: SourceId
    amount: int = Field(strict=True, ge=0, le=1000)
    status: Literal["performed", "not_performed"]
    type: Literal["order", "prolong"]
    created_at: AwareDatetime
    performed_at: AwareDatetime | None

    @field_validator("status", mode="before")
    @classmethod
    def map_status(cls, value):
        if isinstance(value, str):
            return {"pefomed": "performed", "not_pefomed": "not_performed"}.get(value, value)
        return value

    @field_validator("created_at", "performed_at")
    @classmethod
    def utc(cls, value):
        return value.astimezone(timezone.utc) if value is not None else None

    @model_validator(mode="after")
    def dates_valid(self) -> Self:
        if self.status == "not_performed" and self.performed_at is not None:
            raise ValueError("Для not_performed performedAt должен быть null")
        if self.status == "performed":
            if self.performed_at is None or self.performed_at < self.created_at:
                raise ValueError("Для performed нужна performedAt не раньше createdAt")
        return self

class SnapshotInput(SourceBase):
    accounts: list[AccountInput]
    services: list[ServiceInput]
    transactions: list[TransactionInput]

    @model_validator(mode="after")
    def validate_relations(self) -> Self:
        for name in ("accounts", "services", "transactions"):
            rows = getattr(self, name)
            ids = [row.id for row in rows]
            if len(ids) != len(set(ids)):
                raise ValueError(f"Повторяющиеся id в {name}")
        emails = [row.email for row in self.accounts]
        if len(emails) != len(set(emails)):
            raise ValueError("Повторяющиеся email в accounts")
        account_ids = {row.id for row in self.accounts}
        service_ids = {row.id for row in self.services}
        for row in self.services:
            if row.owner_id not in account_ids:
                raise ValueError(f"У услуги {row.id} не найден аккаунт {row.owner_id}")
        for row in self.transactions:
            if row.service_id not in service_ids:
                raise ValueError(f"У транзакции {row.id} не найдена услуга {row.service_id}")
        return self
