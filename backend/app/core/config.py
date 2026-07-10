from typing import Optional
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Notpad"
    debug: bool = Field(default=False, description="Enable debug mode")
    
    session_secret: str = Field(
        ..., 
        description="Secret key for session middleware",
        min_length=32,
    )
    
    cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://localhost:5174"],
        description="Allowed CORS origins",
    )
    
    rate_limit_requests: int = Field(
        default=100,
        description="Rate limit requests per window",
        ge=1,
    )
    rate_limit_window: int = Field(
        default=60,
        description="Rate limit window in seconds",
        ge=1,
    )
    
    upload_dir: str = Field(
        default="uploads",
        description="Directory for uploaded files",
    )
    max_upload_size: int = Field(
        default=10 * 1024 * 1024,
        description="Maximum upload size in bytes",
        ge=1,
    )
    
    database_url: Optional[str] = Field(
        default=None,
        description="Database connection URL",
    )
    
    postgres_user: Optional[str] = Field(
        default=None,
        description="Database username",
    )
    postgres_password: Optional[str] = Field(
        default=None,
        description="Database password",
    )
    postgres_host: Optional[str] = Field(
        default="localhost",
        description="Database host",
    )
    postgres_port: Optional[str] = Field(
        default="5432",
        description="Database port",
    )
    postgres_db: Optional[str] = Field(
        default="mydb",
        description="Database name",
    )
    
    api_base_url: Optional[str] = Field(
        default=None,
        description="Public base URL for the API (used for absolute URLs in responses)",
    )
    
    api_key: Optional[str] = Field(

        default=None,
        description="API key for protected endpoints",
    )
    groq_api_key: Optional[str] = Field(
        default=None,
        validation_alias="GROQ_API_KEY"
    )


settings = Settings()