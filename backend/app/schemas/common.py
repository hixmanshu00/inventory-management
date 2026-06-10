from pydantic import BaseModel, ConfigDict


class StrictModel(BaseModel):
    """Base for all request schemas.

    extra="forbid" rejects unknown/extra fields with a 422, so typos or
    client-sent fields we don't trust (e.g. a fabricated total_amount) never
    silently slip through.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ErrorResponse(BaseModel):
    """Structured error body returned for every handled error.

    `detail` is human-readable; `code` is a stable machine-readable string the
    frontend can branch on without parsing prose.
    """

    detail: str
    code: str
