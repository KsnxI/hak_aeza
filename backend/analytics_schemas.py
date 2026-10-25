from datetime import datetime
from typing import Literal
from pydantic import BaseModel

Level = Literal["high", "medium", "low", "none"]

class FeatureResponse(BaseModel):
    name: str
    label: str
    value: float
    weight: int
    contribution: int
    reason: str

class ServiceResponse(BaseModel):
    id: int
    name: str
    status: Literal["active", "suspended", "prolong_wait", "deleted", "blocked"]
    price: int
    paymentTerm: Literal["hour", "week", "month", "quater_year", "half_year", "year"]
    autoprolong: bool
    expiresAt: datetime

class CustomerResponse(BaseModel):
    id: int
    email: str
    balance: int
    totalReplenished: int
    score: int | None
    level: Level
    reasons: list[str]
    potentialLoss: int

class CustomerDetail(CustomerResponse):
    services: list[ServiceResponse]
    features: list[FeatureResponse]

class CustomerPage(BaseModel):
    items: list[CustomerResponse]
    total: int
    page: int
    pageSize: int

class SnapshotResponse(BaseModel):
    ok: bool
    customers: int
    services: int

class ChartPoint(BaseModel):
    date: str
    atRisk: int | None = None
    deleted: int | None = None
    atRiskForecast: int | None = None
    expectedChurn: int | None = None

class SummaryResponse(BaseModel):
    totalCustomers: int
    counts: dict[str, int]
    potentialLoss: int
    servicesAtRisk: int
    lossExplanation: str
    chart: list[ChartPoint]
