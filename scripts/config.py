"""
Configuration management for TwitterAI.
Loads environment variables, paths, and account configurations.
"""

import json
import os
from pathlib import Path
from typing import List, Dict


class Config:
    """Centralized configuration management"""

    # Environment variables
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    # Twitter cookie content (JSON string) - used in GitHub Actions
    TWITTER_COOKIES = os.getenv("TWITTER_COOKIES")

    # Paths
    PROJECT_ROOT = Path(__file__).parent.parent
    DATA_DIR = PROJECT_ROOT / "data"
    OUTPUT_DIR = PROJECT_ROOT / "output"
    ACCOUNTS_FILE = PROJECT_ROOT / "accounts.json"
    COOKIE_FILE = PROJECT_ROOT / ".twitter_cookies.json"

    # Scraping settings
    MAX_TWEETS_PER_ACCOUNT = int(os.getenv("MAX_TWEETS_PER_ACCOUNT", "20"))
    RATE_LIMIT_DELAY = int(os.getenv("RATE_LIMIT_DELAY", "2"))
    MAX_RETRIES = 3

    # AI settings
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    GEMINI_RATE_LIMIT_DELAY = 1  # seconds between API calls

    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    @classmethod
    def load_accounts(cls) -> List[Dict]:
        """Load monitored accounts from accounts.json"""
        if not cls.ACCOUNTS_FILE.exists():
            raise FileNotFoundError(f"accounts.json not found at {cls.ACCOUNTS_FILE}")

        with open(cls.ACCOUNTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)

    @classmethod
    def validate(cls) -> bool:
        """Validate required environment variables"""
        return bool(cls.GEMINI_API_KEY)

    @classmethod
    def ensure_directories(cls) -> None:
        """Create data and output directories if they don't exist"""
        cls.DATA_DIR.mkdir(exist_ok=True)
        cls.OUTPUT_DIR.mkdir(exist_ok=True)

    @classmethod
    def setup_cookies_from_env(cls) -> None:
        """Write cookie file from TWITTER_COOKIES env var (for GitHub Actions)"""
        if cls.TWITTER_COOKIES and not cls.COOKIE_FILE.exists():
            with open(cls.COOKIE_FILE, 'w', encoding='utf-8') as f:
                f.write(cls.TWITTER_COOKIES)

