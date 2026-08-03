from sqlmodel import Session, col, func, or_, select

from custom_data_toolkit.models.customs_dict import CustomsDictMapping, CustomsDictType


class CustomsDictTypeRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_page(
        self,
        *,
        enabled: bool | None,
        q: str | None,
        page: int,
        page_size: int,
    ) -> tuple[list[CustomsDictType], int]:
        statement = select(CustomsDictType)
        count_statement = select(func.count()).select_from(CustomsDictType)
        if enabled is not None:
            statement = statement.where(CustomsDictType.enabled == enabled)
            count_statement = count_statement.where(CustomsDictType.enabled == enabled)
        if q:
            pattern = f"%{q}%"
            clause = or_(
                col(CustomsDictType.code).like(pattern),
                col(CustomsDictType.name).like(pattern),
            )
            statement = statement.where(clause)
            count_statement = count_statement.where(clause)
        total = int(self.session.exec(count_statement).one())
        statement = (
            statement.order_by(col(CustomsDictType.id).asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(self.session.exec(statement).all()), total

    def list_enabled_options(self) -> list[CustomsDictType]:
        statement = (
            select(CustomsDictType)
            .where(CustomsDictType.enabled == True)  # noqa: E712
            .order_by(col(CustomsDictType.code).asc())
        )
        return list(self.session.exec(statement).all())

    def get_by_id(self, type_id: int) -> CustomsDictType | None:
        return self.session.get(CustomsDictType, type_id)

    def get_by_code(self, code: str) -> CustomsDictType | None:
        statement = select(CustomsDictType).where(CustomsDictType.code == code)
        return self.session.exec(statement).first()

    def count_mappings(self, code: str) -> int:
        statement = (
            select(func.count())
            .select_from(CustomsDictMapping)
            .where(CustomsDictMapping.dict_type == code)
        )
        return int(self.session.exec(statement).one())

    def mapping_counts(self, codes: list[str]) -> dict[str, int]:
        if not codes:
            return {}
        statement = (
            select(CustomsDictMapping.dict_type, func.count())
            .where(col(CustomsDictMapping.dict_type).in_(codes))
            .group_by(CustomsDictMapping.dict_type)
        )
        return {str(code): int(count) for code, count in self.session.exec(statement).all()}

    def add(self, row: CustomsDictType) -> CustomsDictType:
        self.session.add(row)
        self.session.flush()
        return row

    def commit(self) -> None:
        self.session.commit()

    def refresh(self, obj: object) -> None:
        self.session.refresh(obj)
