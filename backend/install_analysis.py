from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from backend.routers import source, customers, analytics

def install_analysis(app):
    app.include_router(source.router)
    app.include_router(customers.router)
    app.include_router(analytics.router)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        messages = []
        for error in exc.errors():
            location = ".".join(str(part) for part in error["loc"])
            messages.append(f"{location}: {error['msg']}")
        return JSONResponse(status_code=422, content={"detail": "; ".join(messages)})
