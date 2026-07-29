from sqlmodel import create_engine

from custom_data_toolkit.config.settings import settings

engine = create_engine(settings.database_url, echo=settings.debug)
