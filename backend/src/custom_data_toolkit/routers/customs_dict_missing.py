from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from custom_data_toolkit.deps import CurrentAuthDep, require_session_csrf
from custom_data_toolkit.routers.customs_dict import CustomsDictServiceDep, _to_public
from custom_data_toolkit.routers.customs_dict_schemas import (
    CustomsDictMappingPublic,
    CustomsDictMissingHandleRequest,
    CustomsDictMissingListResponse,
    CustomsDictMissingPublic,
)
from custom_data_toolkit.services.customs_dict_service import CustomsDictService

missing_router = APIRouter(prefix="/customs-dict/missing", tags=["customs-dict"])


@missing_router.get("", response_model=CustomsDictMissingListResponse)
def list_missing(
    _auth: CurrentAuthDep,
    service: CustomsDictService = CustomsDictServiceDep,
    dict_type: str = Query(..., alias="dictType"),
    raw_value: str | None = Query(default=None, alias="rawValue"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
) -> CustomsDictMissingListResponse:
    items, total = service.list_missing(
        dict_type=dict_type,
        raw_value=raw_value,
        page=page,
        page_size=page_size,
    )
    return CustomsDictMissingListResponse(
        items=[
            CustomsDictMissingPublic(
                dict_type=str(item["dict_type"]),
                dict_type_label=str(item["dict_type_label"]),
                raw_value=str(item["raw_value"]),
                occurrence_count=int(item["occurrence_count"]),  # type: ignore[arg-type]
            )
            for item in items
        ],
        page=page,
        page_size=page_size,
        total=total,
    )


@missing_router.post("/handle", response_model=CustomsDictMappingPublic)
def handle_missing(
    body: CustomsDictMissingHandleRequest,
    auth: CurrentAuthDep,
    _csrf: None = Depends(require_session_csrf),
    service: CustomsDictService = CustomsDictServiceDep,
) -> CustomsDictMappingPublic:
    mapping = service.handle_missing(
        dict_type=body.dict_type,
        raw_value=body.raw_value,
        standard_value=body.standard_value,
        actor_id=auth.user.id,
    )
    return _to_public(mapping)


@missing_router.get("/export")
def export_missing(
    _auth: CurrentAuthDep,
    service: CustomsDictService = CustomsDictServiceDep,
    dict_type: str = Query(..., alias="dictType"),
    raw_value: str | None = Query(default=None, alias="rawValue"),
) -> Response:
    content = service.export_missing_xlsx(dict_type=dict_type, raw_value=raw_value)
    filename = f"customs-dict-missing-{dict_type}.xlsx"
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
