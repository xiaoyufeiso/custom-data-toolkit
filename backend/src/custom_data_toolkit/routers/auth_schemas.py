from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class LoginRequest(CamelModel):
    username: str
    password: str


class ChangePasswordRequest(CamelModel):
    current_password: str = Field(alias="currentPassword")
    new_password: str = Field(alias="newPassword")


class AdminPublic(CamelModel):
    id: int
    username: str
    role: str
    enabled: bool


class CsrfResponse(CamelModel):
    csrf_token: str = Field(alias="csrfToken")
