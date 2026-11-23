"""Environment-driven configuration."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:4173,http://127.0.0.1:4173"
    )
    solver_time_limit: float = 20.0
    solver_node_limit: int = 4_000_000
    max_image_bytes: int = 8 * 1024 * 1024
    log_level: str = "info"

    @property
    def allowed_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        return origins or ["http://localhost:5173"]

    @property
    def allow_all_origins(self) -> bool:
        return "*" in self.allowed_origins


settings = Settings()
