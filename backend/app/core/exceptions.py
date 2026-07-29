from typing import NoReturn

from fastapi import HTTPException
from pydantic import BaseModel


class ErrorDetail(BaseModel):
    field: str
    message: str


class ErrorResponse(BaseModel):
    status: str = "error"
    errors: list[ErrorDetail]


def raise_field_error(field: str, message: str, status_code: int = 409) -> NoReturn:
    raise HTTPException(
        status_code=status_code,
        detail=ErrorResponse(errors=[ErrorDetail(field=field, message=message)]).model_dump(),
    )
