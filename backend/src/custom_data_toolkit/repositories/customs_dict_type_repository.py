from sqlmodel import Session, case, col, func, or_, select

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

    def list_suggestions(
        self,
        *,
        prefix: str,
        limit: int,
    ) -> list[CustomsDictType]:
        normalized_code = func.lower(func.trim(CustomsDictType.code))
        normalized_name = func.lower(func.trim(CustomsDictType.name))
        escaped_prefix = (
            prefix.lower()
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        pattern = f"{escaped_prefix}%"
        code_prefix_match = normalized_code.like(pattern, escape="\\")
        name_prefix_match = normalized_name.like(pattern, escape="\\")
        rank = case(
            (normalized_code == prefix.lower(), 0),
            (normalized_name == prefix.lower(), 0),
            (code_prefix_match, 1),
            else_=2,
        )
        sort_value = case(
            (normalized_code == prefix.lower(), normalized_code),
            (normalized_name == prefix.lower(), normalized_name),
            (code_prefix_match, normalized_code),
            else_=normalized_name,
        )
        statement = (
            select(CustomsDictType)
            .where(
                CustomsDictType.enabled == True,  # noqa: E712
                or_(code_prefix_match, name_prefix_match),
            )
            .order_by(
                rank,
                sort_value.asc(),
                normalized_name.asc(),
                col(CustomsDictType.id).asc(),
            )
            .limit(limit)
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
