from sqlmodel import Session, case, col, func, or_, select

from custom_data_toolkit.models.customs_dict import CustomsDictMapping


class CustomsDictRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def _filtered_statements(
        self,
        *,
        dict_type: str | None,
        q: str | None,
        raw_value: str | None,
        standard_value: str | None,
        enabled: bool | None,
    ):
        statement = select(CustomsDictMapping)
        count_statement = select(func.count()).select_from(CustomsDictMapping)
        if dict_type:
            statement = statement.where(CustomsDictMapping.dict_type == dict_type)
            count_statement = count_statement.where(CustomsDictMapping.dict_type == dict_type)
        if q:
            pattern = f"%{q}%"
            clause = or_(
                col(CustomsDictMapping.raw_value).like(pattern),
                col(CustomsDictMapping.standard_value).like(pattern),
            )
            statement = statement.where(clause)
            count_statement = count_statement.where(clause)
        if raw_value:
            pattern = f"%{raw_value}%"
            statement = statement.where(col(CustomsDictMapping.raw_value).like(pattern))
            count_statement = count_statement.where(col(CustomsDictMapping.raw_value).like(pattern))
        if standard_value:
            pattern = f"%{standard_value}%"
            statement = statement.where(col(CustomsDictMapping.standard_value).like(pattern))
            count_statement = count_statement.where(
                col(CustomsDictMapping.standard_value).like(pattern)
            )
        if enabled is not None:
            statement = statement.where(CustomsDictMapping.enabled == enabled)
            count_statement = count_statement.where(CustomsDictMapping.enabled == enabled)
        return statement, count_statement

    def list_page(
        self,
        *,
        dict_type: str | None,
        q: str | None,
        raw_value: str | None,
        standard_value: str | None,
        enabled: bool | None,
        page: int,
        page_size: int,
    ) -> tuple[list[CustomsDictMapping], int]:
        statement, count_statement = self._filtered_statements(
            dict_type=dict_type,
            q=q,
            raw_value=raw_value,
            standard_value=standard_value,
            enabled=enabled,
        )
        total = int(self.session.exec(count_statement).one())
        statement = (
            statement.order_by(col(CustomsDictMapping.id).desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(self.session.exec(statement).all()), total

    def list_all_filtered(
        self,
        *,
        dict_type: str | None,
        q: str | None,
        raw_value: str | None,
        standard_value: str | None,
        enabled: bool | None,
    ) -> list[CustomsDictMapping]:
        statement, _ = self._filtered_statements(
            dict_type=dict_type,
            q=q,
            raw_value=raw_value,
            standard_value=standard_value,
            enabled=enabled,
        )
        statement = statement.order_by(col(CustomsDictMapping.id).desc())
        return list(self.session.exec(statement).all())

    def list_suggestions(
        self,
        *,
        prefix: str,
        dict_type: str | None,
        limit: int,
    ) -> list[CustomsDictMapping]:
        normalized_raw = func.lower(func.trim(CustomsDictMapping.raw_value))
        normalized_standard = func.lower(func.trim(CustomsDictMapping.standard_value))
        escaped_prefix = (
            prefix.lower()
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        pattern = f"{escaped_prefix}%"
        raw_prefix_match = normalized_raw.like(pattern, escape="\\")
        standard_prefix_match = normalized_standard.like(pattern, escape="\\")
        rank = case(
            (normalized_raw == prefix.lower(), 0),
            (normalized_standard == prefix.lower(), 0),
            (raw_prefix_match, 1),
            else_=2,
        )
        sort_value = case(
            (normalized_raw == prefix.lower(), normalized_raw),
            (normalized_standard == prefix.lower(), normalized_standard),
            (raw_prefix_match, normalized_raw),
            else_=normalized_standard,
        )
        statement = select(CustomsDictMapping).where(
            CustomsDictMapping.enabled == True,  # noqa: E712
            or_(raw_prefix_match, standard_prefix_match),
        )
        if dict_type:
            statement = statement.where(CustomsDictMapping.dict_type == dict_type)
        statement = statement.order_by(
            rank,
            sort_value.asc(),
            normalized_raw.asc(),
            col(CustomsDictMapping.id).asc(),
        ).limit(limit)
        return list(self.session.exec(statement).all())

    def list_by_dict_type(self, dict_type: str) -> list[CustomsDictMapping]:
        statement = select(CustomsDictMapping).where(CustomsDictMapping.dict_type == dict_type)
        return list(self.session.exec(statement).all())

    def get_by_id(self, mapping_id: int) -> CustomsDictMapping | None:
        return self.session.get(CustomsDictMapping, mapping_id)

    def get_by_ids_for_update(self, mapping_ids: list[int]) -> list[CustomsDictMapping]:
        statement = (
            select(CustomsDictMapping)
            .where(col(CustomsDictMapping.id).in_(mapping_ids))
            .with_for_update()
        )
        return list(self.session.exec(statement).all())

    def get_by_type_raw(self, dict_type: str, raw_value: str) -> CustomsDictMapping | None:
        statement = select(CustomsDictMapping).where(
            CustomsDictMapping.dict_type == dict_type,
            CustomsDictMapping.raw_value == raw_value,
        )
        return self.session.exec(statement).first()

    def add(self, mapping: CustomsDictMapping) -> CustomsDictMapping:
        self.session.add(mapping)
        self.session.flush()
        return mapping

    def commit(self) -> None:
        self.session.commit()

    def refresh(self, obj: object) -> None:
        self.session.refresh(obj)
