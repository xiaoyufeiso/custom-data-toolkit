from pydantic import BaseModel, Field, StrictInt, field_validator


class BatchIdsRequest(BaseModel):
    ids: list[StrictInt] = Field(min_length=1, max_length=100)

    @field_validator("ids")
    @classmethod
    def validate_ids(cls, ids: list[int]) -> list[int]:
        if any(item <= 0 for item in ids) or len(set(ids)) != len(ids):
            raise ValueError("ids must contain unique positive integers")
        return ids
