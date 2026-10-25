from typing import Annotated, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.dependencies import get_current_user
from backend.analysis_service import analyze
from backend.analytics_schemas import CustomerPage, CustomerDetail

router = APIRouter(prefix="/api/v1/customers", tags=["Customers"], dependencies=[Depends(get_current_user)])

@router.get("", response_model=CustomerPage)
def list_customers(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    search: str = Query(default="", max_length=320),
    level: Literal["all", "high", "medium", "low", "none"] = "all",
    sort: Literal["id", "email", "balance", "totalReplenished", "score"] = "score",
    order: Literal["asc", "desc"] = "desc",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
):
    rows = analyze(db)
    query = search.casefold()
    rows = [r for r in rows if query in r["email"].casefold() and (level == "all" or r["level"] == level)]
    if sort == "score":
        key = lambda r: (r["score"] is not None, r["score"] or 0, r["id"])
    elif sort == "email":
        key = lambda r: (r["email"].casefold(), r["id"])
    else:
        key = lambda r: (r[sort], r["id"])
    rows.sort(key=key, reverse=order == "desc")
    start = (page - 1) * page_size
    response.headers["Cache-Control"] = "no-store"
    return {"items": rows[start:start + page_size], "total": len(rows), "page": page, "pageSize": page_size}

@router.get("/{customer_id}", response_model=CustomerDetail)
def customer_detail(customer_id: int, response: Response, db: Annotated[Session, Depends(get_db)]):
    for row in analyze(db):
        if row["id"] == customer_id:
            response.headers["Cache-Control"] = "no-store"
            return row
    raise HTTPException(status_code=404, detail="Customer not found")
