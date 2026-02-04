# TwitterAI - Detailed Architecture Document

**Date**: 2026-02-04
**Version**: 1.0.0 (MVP)
**Status**: Design Complete

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Component Design](#component-design)
4. [Data Flow](#data-flow)
5. [Error Handling Strategy](#error-handling-strategy)
6. [Rate Limiting Plan](#rate-limiting-plan)
7. [GitHub Actions Workflow](#github-actions-workflow)
8. [Frontend Architecture](#frontend-architecture)
9. [Security Considerations](#security-considerations)
10. [Performance Optimization](#performance-optimization)
11. [Scalability and Maintenance](#scalability-and-maintenance)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                         │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              GitHub Actions (Cron Trigger)               │   │
│  │                                                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │  scraper.py  │→ │ai_summary.py │→ │excel_export.py│  │   │
│  │  │   (Twikit)   │  │   (Gemini)   │  │  (openpyxl)  │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │         │                  │                  │           │   │
│  │         ↓                  ↓                  ↓           │   │
│  │    [JSON File]        [JSON Update]      [Excel File]    │   │
│  │         │                  │                  │           │   │
│  │         └──────────────────┴──────────────────┘           │   │
│  │                          │                                │   │
│  │                          ↓                                │   │
│  │                   [Git Commit & Push]                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      Data Storage                         │   │
│  │                                                           │   │
│  │  data/2026-02-04.json          output/2026-02-04.xlsx    │   │
│  │  data/2026-02-05.json          output/2026-02-05.xlsx    │   │
│  │  ...                            ...                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   GitHub Pages (web/)                     │   │
│  │                                                           │   │
│  │  index.html  ←───  Loads  ←───  data/*.json              │   │
│  │  style.css                      output/*.xlsx             │   │
│  │  app.js                                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓                                       │
└──────────────────────────│────────────────────────────────────┘
                           │
                           ↓
                    ┌─────────────┐
                    │  End User   │
                    │  (Browser)  │
                    └─────────────┘
```

### Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Scraping | Twikit + Python 3.11 | Twitter data extraction |
| AI | Google Gemini API (gemini-2.0-flash) | Chinese summarization |
| Data Export | openpyxl | Excel file generation |
| Storage | JSON + Git | Persistent data storage |
| Automation | GitHub Actions | Scheduled execution |
| Frontend | Vanilla HTML/CSS/JS | User interface |
| Hosting | GitHub Pages | Static site hosting |

---

## Architecture Decisions

### Decision 1: Twikit vs Other Scrapers

**Options Evaluated:**
- **Twikit**: Cookie-based authentication, actively maintained (2025+), Python native
- **twscrape**: Multi-account support, but more complex setup
- **Selenium-based**: Heavy, slow, high resource usage

**Decision**: Use Twikit
**Rationale**:
- Lightweight and fast
- Active maintenance (critical for Twitter's frequent changes)
- Simple cookie-based auth (no browser automation needed)
- Good documentation and examples

### Decision 2: GitHub Actions vs Other Schedulers

**Options Evaluated:**
- **GitHub Actions**: Free 2,000 min/month, integrated with repo
- **Heroku Scheduler**: Requires credit card, not truly free anymore
- **AWS Lambda**: More complex setup, potential costs
- **Self-hosted cron**: Requires server maintenance

**Decision**: Use GitHub Actions
**Rationale**:
- Zero cost (project uses ~300 min/month)
- No server to maintain
- Integrated with GitHub Pages
- Easy secret management
- Built-in logging and monitoring

### Decision 3: Gemini API vs Other LLMs

**Options Evaluated:**
- **Gemini API**: User already has key, $0.0005/call (flash model)
- **OpenAI GPT**: $0.002/call, 4x more expensive
- **Claude API**: Similar pricing, no existing access

**Decision**: Use Gemini API
**Rationale**:
- User already has access
- Cost-effective for high-volume calls
- Good Chinese language support
- Fast response times with flash model

### Decision 4: Static Site vs Dynamic Backend

**Options Evaluated:**
- **Static HTML/CSS/JS**: No server, GitHub Pages free hosting
- **Flask/Django**: Requires server, deployment complexity
- **React/Vue**: Build step complexity, overkill for MVP

**Decision**: Use vanilla static site
**Rationale**:
- Maximum simplicity (MVP principle)
- Free hosting with GitHub Pages
- No build step required
- Fast load times
- Easy to maintain

### Decision 5: Git-based Storage vs Database

**Options Evaluated:**
- **JSON files in Git**: Simple, versioned, no external service
- **SQLite**: Requires file management, less transparent
- **Cloud database**: Additional cost and complexity

**Decision**: Use JSON files committed to Git
**Rationale**:
- Perfect for read-heavy, append-only data
- Built-in version history
- No external dependencies
- Easy to inspect and debug
- Automatically deployed with GitHub Pages

---

## Component Design

### 1. Scraper Component (`scripts/scraper.py`)

#### Responsibilities
- Authenticate with Twitter using Twikit
- Load monitored accounts from `accounts.json`
- Fetch latest 10-20 tweets per account
- Extract tweet metadata (likes, retweets, replies, timestamp)
- Save raw data to `data/YYYY-MM-DD.json`

#### Key Classes

```python
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

@dataclass
class Tweet:
    """Represents a single tweet"""
    id: str
    text: str
    created_at: datetime
    likes: int
    retweets: int
    replies: int
    url: str
    is_retweet: bool
    is_reply: bool

@dataclass
class Account:
    """Represents a monitored Twitter account"""
    username: str
    display_name: str
    category: str
    tweets: List[Tweet]
    ai_summary: Optional[str] = None

class TwitterScraper:
    """Main scraper class using Twikit"""

    def __init__(self, username: str, email: str, password: str):
        self.client = None
        self.credentials = (username, email, password)
        self.logger = self._setup_logger()

    def authenticate(self) -> bool:
        """Login to Twitter using cookies"""
        pass

    def get_user_tweets(self, username: str, max_tweets: int = 20) -> List[Tweet]:
        """Fetch recent tweets for a user"""
        pass

    def scrape_accounts(self, accounts: List[dict]) -> List[Account]:
        """Scrape all monitored accounts with rate limiting"""
        pass

    def save_data(self, accounts: List[Account], output_path: str):
        """Save scraped data to JSON file"""
        pass
```

#### Implementation Details

**Authentication Flow:**
1. Check if cookie file exists (`.twitter_cookies.json`)
2. If exists and valid (< 7 days old), load cookies
3. If not, perform login with credentials
4. Save cookies to file for reuse
5. Validate session by fetching user profile

**Rate Limiting:**
- 2 second delay between account scrapes
- 1 second delay between pagination requests
- Exponential backoff on rate limit errors (2s, 4s, 8s)
- Maximum 3 retry attempts per account

**Error Handling:**
- Login failure: Exit with error code 1 (fail entire workflow)
- Account not found: Log warning, skip account, continue
- Network timeout: Retry with backoff, max 3 attempts
- Rate limit hit: Exponential backoff, then skip account if still failing

**Data Validation:**
- Verify tweet ID is not empty
- Ensure timestamps are valid ISO 8601 format
- Sanitize tweet text (remove null bytes, control characters)
- Validate URLs are well-formed

#### Configuration

```python
# config.py
import os
from pathlib import Path

class Config:
    # Twitter credentials
    TWITTER_USERNAME = os.getenv("TWITTER_USERNAME")
    TWITTER_EMAIL = os.getenv("TWITTER_EMAIL")
    TWITTER_PASSWORD = os.getenv("TWITTER_PASSWORD")

    # Scraping settings
    MAX_TWEETS_PER_ACCOUNT = int(os.getenv("MAX_TWEETS_PER_ACCOUNT", "20"))
    RATE_LIMIT_DELAY = int(os.getenv("RATE_LIMIT_DELAY", "2"))
    MAX_RETRIES = 3

    # Paths
    PROJECT_ROOT = Path(__file__).parent.parent
    DATA_DIR = PROJECT_ROOT / "data"
    OUTPUT_DIR = PROJECT_ROOT / "output"
    ACCOUNTS_FILE = PROJECT_ROOT / "accounts.json"
    COOKIE_FILE = PROJECT_ROOT / ".twitter_cookies.json"

    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
```

---

### 2. AI Summary Component (`scripts/ai_summary.py`)

#### Responsibilities
- Load scraped data from JSON file
- Batch tweets per account for Gemini API
- Generate one-sentence Chinese summary per account
- Update JSON with AI summaries
- Handle API quota and timeout errors gracefully

#### Key Classes

```python
import google.generativeai as genai
from typing import List

class GeminiSummarizer:
    """AI summarization using Gemini API"""

    def __init__(self, api_key: str, model_name: str = "gemini-2.0-flash"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
        self.logger = self._setup_logger()

    def generate_summary(self, tweets: List[Tweet], username: str) -> str:
        """Generate Chinese summary for account's tweets"""
        pass

    def batch_summarize(self, accounts: List[Account]) -> List[Account]:
        """Process all accounts with rate limiting"""
        pass

    def _build_prompt(self, tweets: List[Tweet], username: str) -> str:
        """Construct optimized prompt for AI/tech/Web3 content"""
        pass
```

#### Gemini Prompt Design

```python
def _build_prompt(self, tweets: List[Tweet], username: str) -> str:
    """
    Optimized prompt for AI/tech/Web3 content summarization.
    Output must be in Chinese, one sentence, focus on key insights.
    """

    # Format tweets into readable list
    tweets_text = "\n\n".join([
        f"推文 {i+1} (发布于 {tweet.created_at.strftime('%Y-%m-%d %H:%M')}):\n{tweet.text}\n"
        f"互动数据: {tweet.likes} 赞, {tweet.retweets} 转发, {tweet.replies} 回复"
        for i, tweet in enumerate(tweets)
    ])

    prompt = f"""你是一位专业的科技媒体编辑，专注于人工智能、Web3和前沿科技领域。

任务：
请阅读Twitter用户 @{username} 今日发布的所有推文，生成一句话中文摘要（不超过50字）。

要求：
1. 用一句话概括该用户今日推文的核心主题或最重要的信息
2. 必须使用中文
3. 聚焦于实质性内容（技术进展、产品发布、观点洞察等）
4. 忽略纯粹的互动性内容（点赞、转发无内容的推文）
5. 如果推文内容零散无主题，概括最值得关注的1-2条
6. 语言风格：简洁、专业、信息密度高

推文内容：
{tweets_text}

请直接输出一句话摘要，不要包含"摘要："等前缀。"""

    return prompt
```

#### Rate Limiting and Error Handling

**API Call Strategy:**
- One API call per account (batch all tweets together)
- 1 second delay between API calls
- Total: ~20-50 calls per scrape (depending on accounts.json)

**Error Handling:**
- Quota exceeded: Use fallback text "AI摘要暂时不可用（API配额已用完）"
- Timeout: Retry once with 3s timeout, then fallback
- Invalid response: Log error, use fallback "AI摘要生成失败"
- Network error: Retry once, then fallback

**Fallback Strategy:**
```python
FALLBACK_SUMMARY = "AI摘要暂时不可用"

def generate_summary_with_fallback(self, tweets: List[Tweet], username: str) -> str:
    """Generate summary with graceful fallback"""
    try:
        summary = self.generate_summary(tweets, username)
        if not summary or len(summary) < 5:
            return FALLBACK_SUMMARY
        return summary
    except Exception as e:
        self.logger.warning(f"Summary failed for @{username}: {e}")
        return FALLBACK_SUMMARY
```

---

### 3. Excel Export Component (`scripts/excel_export.py`)

#### Responsibilities
- Load summarized data from JSON
- Create formatted Excel file with proper styling
- Group tweets by account
- Place AI summary in first row of each account group
- Save to `output/YYYY-MM-DD.xlsx`

#### Excel Structure

| Column | Header | Content | Style |
|--------|--------|---------|-------|
| A | 日期 | Scrape date | Bold header |
| B | 用户名 | @username | Monospace |
| C | 显示名称 | Display name | Regular |
| D | AI摘要 | Summary (first row per account only) | Bold, merged cells |
| E | 推文内容 | Tweet text | Wrap text |
| F | 原始链接 | Tweet URL | Hyperlink, blue |
| G | 点赞数 | Like count | Right-aligned, number format |
| H | 转发数 | Retweet count | Right-aligned, number format |
| I | 发布时间 | Post timestamp | DateTime format |

#### Key Classes

```python
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

class ExcelExporter:
    """Excel file generator with formatting"""

    def __init__(self):
        self.wb = Workbook()
        self.ws = self.wb.active
        self.logger = self._setup_logger()

    def export(self, data: dict, output_path: str):
        """Main export function"""
        self._write_headers()
        self._write_data(data)
        self._apply_formatting()
        self._save(output_path)

    def _write_headers(self):
        """Write column headers with styling"""
        pass

    def _write_data(self, data: dict):
        """Write account data grouped by user"""
        pass

    def _apply_formatting(self):
        """Apply cell formatting and column widths"""
        pass
```

#### Styling Configuration

```python
# Color scheme (matching web design)
HEADER_FILL = PatternFill(start_color="C2185B", end_color="C2185B", fill_type="solid")
SUMMARY_FILL = PatternFill(start_color="F8BBD0", end_color="F8BBD0", fill_type="solid")
HEADER_FONT = Font(name="Arial", size=11, bold=True, color="FFFFFF")
SUMMARY_FONT = Font(name="Arial", size=10, bold=True, color="1D1D1F")
REGULAR_FONT = Font(name="Arial", size=10, color="1D1D1F")
LINK_FONT = Font(name="Arial", size=10, color="0563C1", underline="single")

# Column widths
COLUMN_WIDTHS = {
    'A': 12,  # Date
    'B': 15,  # Username
    'C': 18,  # Display Name
    'D': 50,  # AI Summary
    'E': 60,  # Tweet Content
    'F': 40,  # URL
    'G': 10,  # Likes
    'H': 10,  # Retweets
    'I': 18,  # Timestamp
}
```

---

### 4. Configuration Component (`scripts/config.py`)

```python
import json
import os
from pathlib import Path
from typing import List, Dict

class Config:
    """Centralized configuration management"""

    # Environment variables
    TWITTER_USERNAME = os.getenv("TWITTER_USERNAME")
    TWITTER_EMAIL = os.getenv("TWITTER_EMAIL")
    TWITTER_PASSWORD = os.getenv("TWITTER_PASSWORD")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

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
        with open(cls.ACCOUNTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)

    @classmethod
    def validate(cls) -> bool:
        """Validate all required environment variables are set"""
        required = [
            cls.TWITTER_USERNAME,
            cls.TWITTER_EMAIL,
            cls.TWITTER_PASSWORD,
            cls.GEMINI_API_KEY
        ]
        return all(required)
```

---

### 5. Utilities Component (`scripts/utils.py`)

```python
import logging
import time
from functools import wraps
from typing import Callable, Any

def setup_logger(name: str, level: str = "INFO") -> logging.Logger:
    """Setup logger with consistent formatting"""
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level))

    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    return logger

def retry_with_backoff(max_retries: int = 3, base_delay: float = 2.0):
    """Decorator for exponential backoff retry logic"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    delay = base_delay * (2 ** attempt)
                    logger = logging.getLogger(func.__module__)
                    logger.warning(f"{func.__name__} failed (attempt {attempt+1}/{max_retries}): {e}. Retrying in {delay}s...")
                    time.sleep(delay)
        return wrapper
    return decorator

def rate_limit(delay: float):
    """Decorator to add delay between function calls"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            result = func(*args, **kwargs)
            time.sleep(delay)
            return result
        return wrapper
    return decorator
```

---

## Data Flow

### Complete Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     1. GitHub Actions Trigger                    │
│                    (Cron: 0 0,12 * * * UTC)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                     2. Environment Setup                         │
│  - Checkout repo                                                 │
│  - Setup Python 3.11                                             │
│  - Install requirements.txt                                      │
│  - Load secrets (Twitter credentials, Gemini API key)            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                     3. Scraper Execution                         │
│  scraper.py:                                                     │
│  - Load accounts.json (20-50 accounts)                           │
│  - Authenticate with Twitter (load cookies or login)             │
│  - For each account:                                             │
│    * Fetch user timeline (max 20 tweets)                         │
│    * Extract metadata (likes, RTs, replies, timestamp)           │
│    * Rate limit: wait 2s between accounts                        │
│  - Save to data/YYYY-MM-DD.json (raw data, no AI summary)        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  4. AI Summary Generation                        │
│  ai_summary.py:                                                  │
│  - Load data/YYYY-MM-DD.json                                     │
│  - For each account:                                             │
│    * Batch all tweets into single prompt                         │
│    * Call Gemini API (gemini-2.0-flash)                          │
│    * Parse Chinese summary response                              │
│    * Handle errors with fallback text                            │
│    * Rate limit: wait 1s between API calls                       │
│  - Update data/YYYY-MM-DD.json with ai_summary fields            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                     5. Excel Export                              │
│  excel_export.py:                                                │
│  - Load data/YYYY-MM-DD.json (with AI summaries)                 │
│  - Create Excel workbook                                         │
│  - Write headers with styling                                    │
│  - For each account:                                             │
│    * Write AI summary in first row (merged cell)                 │
│    * Write each tweet in subsequent rows                         │
│    * Apply formatting (colors, fonts, borders)                   │
│  - Save to output/YYYY-MM-DD.xlsx                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                     6. Git Commit & Push                         │
│  - git add data/YYYY-MM-DD.json                                  │
│  - git add output/YYYY-MM-DD.xlsx                                │
│  - git commit -m "Daily scrape: YYYY-MM-DD HH:MM"                │
│  - git push origin main                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  7. GitHub Pages Deploy                          │
│  - Automatic deployment triggered by push to main                │
│  - web/ directory published to GitHub Pages                      │
│  - User can access updated dashboard immediately                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Transformation Flow

```
accounts.json                                   data/YYYY-MM-DD.json
    │                                                    │
    │  [Load accounts list]                              │
    ↓                                                    │
scraper.py                                              │
    │                                                    │
    ├─→ [Fetch tweets from Twitter] ──────────────────→ │
    │                                                    ↓
    │                                           ai_summary.py
    │                                                    │
    │  [Read raw data] ←─────────────────────────────────┤
    │                                                    │
    │  [Generate AI summaries] ──────────────────────→   │
    │                                                    ↓
    │                                      [Update JSON with summaries]
    │                                                    │
    ↓                                                    ↓
excel_export.py                                output/YYYY-MM-DD.xlsx
    │                                                    │
    └─→ [Format into Excel] ──────────────────────────→ │
                                                         ↓
                                                   [Git commit]
                                                         │
                                                         ↓
                                                  [GitHub Pages]
                                                         │
                                                         ↓
                                                   web/app.js
                                                         │
                                                         ↓
                                                   [User browser]
```

---

## Error Handling Strategy

### Error Categories and Responses

| Error Type | Severity | Action | User Impact |
|-----------|----------|--------|-------------|
| Twitter login failed | Critical | Exit workflow, send notification | No data update |
| Account not found | Warning | Skip account, continue | Missing one account's data |
| Rate limit hit | Warning | Backoff + retry, skip if persistent | Missing one account's data |
| Network timeout | Warning | Retry 3x, skip if persistent | Missing one account's data |
| Gemini API quota exceeded | Warning | Use fallback summary | No AI summary, raw tweets still available |
| Gemini API timeout | Warning | Retry 1x, fallback if persistent | No AI summary for some accounts |
| Excel write failure | Critical | Exit workflow, send notification | No Excel file generated |
| Git push failure | Critical | Exit workflow, preserve data | Data not published, will retry next run |

### Error Logging Format

```python
# ERROR - Critical failures that stop workflow
logger.error("Twitter login failed: Invalid credentials")
logger.error("Excel export failed: Permission denied writing to output/")

# WARNING - Non-critical issues, workflow continues
logger.warning("Account @username not found, skipping")
logger.warning("Gemini API timeout for @username, using fallback summary")

# INFO - Normal operation progress
logger.info("Scraping started for 20 accounts")
logger.info("Processed @username: 15 tweets, AI summary generated")

# DEBUG - Detailed technical info
logger.debug("API request: GET /user/tweets?user_id=123")
logger.debug("Gemini API response: 250 tokens, 1.2s latency")
```

### Retry Logic Implementation

```python
@retry_with_backoff(max_retries=3, base_delay=2.0)
def fetch_user_tweets(username: str) -> List[Tweet]:
    """Fetch tweets with automatic retry on failure"""
    # Raises exception on failure, decorator handles retry
    return client.get_user_tweets(username)

# Exponential backoff: 2s, 4s, 8s
# Total max delay: 14 seconds before giving up
```

### Graceful Degradation

If any component partially fails:
- **Scraper fails on some accounts**: JSON will contain successful accounts only
- **AI summary fails on some accounts**: JSON will have `ai_summary: null` for those accounts
- **Excel export fails**: Workflow fails, but data/JSON is still committed
- **Git push fails**: Data preserved locally, next run will overwrite

---

## Rate Limiting Plan

### Twitter API (Twikit)

**Constraints:**
- Twitter internal rate limits are undocumented and subject to change
- Aggressive scraping can lead to account suspension
- Need to appear as "human-like" usage pattern

**Strategy:**
```python
class RateLimiter:
    """Twitter scraping rate limiter"""

    DELAY_BETWEEN_ACCOUNTS = 2.0  # seconds
    DELAY_BETWEEN_REQUESTS = 1.0  # seconds
    MAX_TWEETS_PER_ACCOUNT = 20

    def scrape_all_accounts(self, accounts: List[str]) -> List[Account]:
        results = []
        for account in accounts:
            # Scrape one account
            tweets = self.fetch_tweets(account)
            results.append(Account(username=account, tweets=tweets))

            # Human-like delay before next account
            time.sleep(self.DELAY_BETWEEN_ACCOUNTS)

        return results
```

**Timeline:**
- 20 accounts × 2 seconds = 40 seconds minimum
- 50 accounts × 2 seconds = 100 seconds minimum
- Total scraping time: 1-3 minutes (including API latency)

### Gemini API

**Constraints:**
- Free tier: 15 requests/minute, 1,500 requests/day
- Flash model: 1,000 requests/minute (paid tier)
- Our usage: ~20-50 requests per run, 2 runs per day = 40-100 requests/day

**Strategy:**
```python
class GeminiRateLimiter:
    """Gemini API rate limiter"""

    DELAY_BETWEEN_CALLS = 1.0  # seconds (safe margin under 15 RPM limit)

    def batch_summarize(self, accounts: List[Account]) -> List[Account]:
        for account in accounts:
            try:
                # One API call per account (batching all tweets)
                summary = self.generate_summary(account.tweets)
                account.ai_summary = summary
            except QuotaExceeded:
                logger.warning(f"Quota exceeded for @{account.username}")
                account.ai_summary = "AI摘要暂时不可用（API配额已用完）"

            # Rate limit delay
            time.sleep(self.DELAY_BETWEEN_CALLS)

        return accounts
```

**Timeline:**
- 20 accounts × 1 second = 20 seconds
- 50 accounts × 1 second = 50 seconds
- Total AI summary time: 20-60 seconds

### Total Workflow Time Budget

```
Component           | Time (20 accts) | Time (50 accts)
--------------------|-----------------|----------------
Environment setup   | 30s             | 30s
Twitter scraping    | 60s             | 120s
AI summarization    | 25s             | 60s
Excel export        | 5s              | 10s
Git commit/push     | 10s             | 10s
--------------------|-----------------|----------------
TOTAL               | ~2.5 minutes    | ~4 minutes
```

**GitHub Actions budget:**
- Free tier: 2,000 minutes/month
- Our usage: 4 min/run × 2 runs/day × 30 days = 240 min/month
- Safety margin: 88% available (1,760 minutes unused)

---

## GitHub Actions Workflow

### Workflow File: `.github/workflows/scrape.yml`

```yaml
name: Twitter Scraper

on:
  schedule:
    # Run at 00:00 UTC and 12:00 UTC daily
    # (08:00 Beijing time and 20:00 Beijing time)
    - cron: '0 0,12 * * *'

  workflow_dispatch:  # Allow manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for proper git operations

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'  # Cache pip dependencies

      - name: Install dependencies
        run: |
          pip install --upgrade pip
          pip install -r requirements.txt

      - name: Run scraper
        env:
          TWITTER_USERNAME: ${{ secrets.TWITTER_USERNAME }}
          TWITTER_EMAIL: ${{ secrets.TWITTER_EMAIL }}
          TWITTER_PASSWORD: ${{ secrets.TWITTER_PASSWORD }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          LOG_LEVEL: INFO
        run: |
          python scripts/scraper.py

      - name: Generate AI summaries
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          LOG_LEVEL: INFO
        run: |
          python scripts/ai_summary.py --input data/$(date +%Y-%m-%d).json

      - name: Export to Excel
        run: |
          python scripts/excel_export.py --input data/$(date +%Y-%m-%d).json

      - name: Commit and push changes
        run: |
          git config user.name "GitHub Actions Bot"
          git config user.email "actions@github.com"
          git add data/*.json output/*.xlsx
          git diff --quiet && git diff --staged --quiet || (
            git commit -m "Daily scrape: $(date +'%Y-%m-%d %H:%M') UTC" &&
            git push
          )

      - name: Notify on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '⚠️ Scraper workflow failed',
              body: `Workflow run failed at ${new Date().toISOString()}\n\nCheck logs: ${context.payload.repository.html_url}/actions/runs/${context.runId}`
            })
```

### Cron Schedule Explanation

```
0 0,12 * * *
│ │   │ │ │
│ │   │ │ └─── Day of week (0-7, both 0 and 7 = Sunday)
│ │   │ └───── Month (1-12)
│ │   └─────── Day of month (1-31)
│ └─────────── Hour (0-23) - 0 and 12 = midnight and noon UTC
└───────────── Minute (0-59) - 0 = on the hour
```

**Local time conversion:**
- 00:00 UTC = 08:00 Beijing (UTC+8)
- 12:00 UTC = 20:00 Beijing (UTC+8)

### Manual Trigger

Users can manually trigger the workflow via GitHub UI:
1. Go to repository > Actions tab
2. Select "Twitter Scraper" workflow
3. Click "Run workflow" button
4. Select branch (main)
5. Click "Run workflow"

### Secrets Configuration

Required repository secrets (Settings > Secrets and variables > Actions):
```
TWITTER_USERNAME=burner_account_username
TWITTER_EMAIL=burner_account_email@example.com
TWITTER_PASSWORD=burner_account_password
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## Frontend Architecture

### Component Structure

```
web/
├── index.html          # Main page structure
├── style.css           # Design system implementation
├── app.js              # Data loading and rendering logic
└── assets/
    └── logo.svg        # Optional project logo
```

### HTML Structure (`index.html`)

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TwitterAI - 每日摘要</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- Header -->
  <header class="header">
    <div class="container">
      <h1 class="title">TwitterAI 每日摘要</h1>
      <p class="subtitle">AI/科技/Web3 领域 Twitter 动态自动化监测</p>
    </div>
  </header>

  <!-- Controls -->
  <section class="controls">
    <div class="container">
      <div class="date-picker-wrapper">
        <label for="date-picker">选择日期：</label>
        <input type="date" id="date-picker" class="date-input">
      </div>
      <button id="download-excel" class="btn-primary">
        下载 Excel 报表
      </button>
    </div>
  </section>

  <!-- Loading State -->
  <div id="loading" class="loading">
    <div class="spinner"></div>
    <p>正在加载数据...</p>
  </div>

  <!-- Error State -->
  <div id="error" class="error" style="display: none;">
    <p id="error-message"></p>
  </div>

  <!-- Account Cards Grid -->
  <main class="main">
    <div class="container">
      <div id="accounts-grid" class="accounts-grid">
        <!-- Dynamically rendered account cards -->
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="footer">
    <div class="container">
      <p>Powered by Twikit + Gemini API | Hosted on GitHub Pages</p>
    </div>
  </footer>

  <script src="app.js"></script>
</body>
</html>
```

### CSS Architecture (`style.css`)

```css
/* Design System Variables */
:root {
  /* Colors */
  --color-primary: #C2185B;
  --color-primary-light: #E91E63;
  --color-accent: #F8BBD0;
  --color-bg: #FAF8F5;
  --color-text: #1D1D1F;
  --color-text-secondary: #6E6E73;
  --color-border: #E0E0E0;
  --color-success: #34C759;
  --color-error: #FF3B30;
  --color-card-bg: #FFFFFF;

  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display",
                 "Segoe UI", Roboto, sans-serif;
  --font-size-xl: 32px;
  --font-size-lg: 24px;
  --font-size-md: 18px;
  --font-size-base: 16px;
  --font-size-sm: 14px;
  --font-weight-bold: 600;
  --font-weight-regular: 400;

  /* Spacing */
  --space-xs: 8px;
  --space-sm: 16px;
  --space-md: 24px;
  --space-lg: 32px;
  --space-xl: 48px;

  /* Layout */
  --max-width: 1200px;
  --border-radius: 12px;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-hover: 0 4px 16px rgba(0, 0, 0, 0.12);
}

/* Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  color: var(--color-text);
  background-color: var(--color-bg);
  line-height: 1.6;
}

/* Account Card Component */
.account-card {
  background: var(--color-card-bg);
  border-radius: var(--border-radius);
  padding: var(--space-md);
  box-shadow: var(--shadow);
  transition: box-shadow 0.3s ease;
}

.account-card:hover {
  box-shadow: var(--shadow-hover);
}

.account-header {
  display: flex;
  align-items: center;
  margin-bottom: var(--space-md);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
}

.account-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}

.account-username {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-left: var(--space-xs);
}

.ai-summary {
  background: var(--color-accent);
  padding: var(--space-sm);
  border-radius: 8px;
  margin-bottom: var(--space-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}

.tweet-list {
  list-style: none;
}

.tweet-item {
  padding: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
}

.tweet-item:last-child {
  border-bottom: none;
}

/* Responsive Grid */
.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

@media (max-width: 768px) {
  .accounts-grid {
    grid-template-columns: 1fr;
  }
}
```

### JavaScript Logic (`app.js`)

```javascript
// State management
const state = {
  currentDate: null,
  data: null,
  loading: false,
  error: null
};

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeDatePicker();
  loadLatestData();
  setupEventListeners();
});

// Date picker initialization
function initializeDatePicker() {
  const datePicker = document.getElementById('date-picker');
  const today = new Date().toISOString().split('T')[0];
  datePicker.value = today;
  datePicker.max = today;
  state.currentDate = today;
}

// Load data for selected date
async function loadData(date) {
  state.loading = true;
  showLoading();

  try {
    const response = await fetch(`../data/${date}.json`);
    if (!response.ok) {
      throw new Error('数据文件不存在');
    }

    const data = await response.json();
    state.data = data;
    state.error = null;
    renderAccounts(data);
  } catch (error) {
    state.error = error.message;
    showError(error.message);
  } finally {
    state.loading = false;
    hideLoading();
  }
}

// Render account cards
function renderAccounts(data) {
  const grid = document.getElementById('accounts-grid');
  grid.innerHTML = '';

  if (!data.accounts || data.accounts.length === 0) {
    grid.innerHTML = '<p class="empty-state">暂无数据</p>';
    return;
  }

  data.accounts.forEach(account => {
    const card = createAccountCard(account);
    grid.appendChild(card);
  });
}

// Create account card element
function createAccountCard(account) {
  const card = document.createElement('div');
  card.className = 'account-card';

  card.innerHTML = `
    <div class="account-header">
      <div>
        <span class="account-name">${account.display_name}</span>
        <span class="account-username">@${account.username}</span>
      </div>
      <span class="account-category">${account.category}</span>
    </div>

    <div class="ai-summary">
      ${account.ai_summary || 'AI摘要暂时不可用'}
    </div>

    <ul class="tweet-list">
      ${account.tweets.map(tweet => `
        <li class="tweet-item">
          <p class="tweet-text">${tweet.text}</p>
          <div class="tweet-meta">
            <span class="tweet-time">${formatDate(tweet.created_at)}</span>
            <span class="tweet-stats">
              ❤️ ${formatNumber(tweet.likes)}
              🔄 ${formatNumber(tweet.retweets)}
            </span>
            <a href="${tweet.url}" target="_blank" class="tweet-link">查看原文</a>
          </div>
        </li>
      `).join('')}
    </ul>
  `;

  return card;
}

// Excel download
function downloadExcel() {
  if (!state.currentDate) return;
  const url = `../output/${state.currentDate}.xlsx`;
  window.open(url, '_blank');
}

// Event listeners
function setupEventListeners() {
  document.getElementById('date-picker').addEventListener('change', (e) => {
    state.currentDate = e.target.value;
    loadData(state.currentDate);
  });

  document.getElementById('download-excel').addEventListener('click', downloadExcel);
}

// Utility functions
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w';
  }
  return num.toLocaleString('zh-CN');
}

function showLoading() {
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('accounts-grid').style.display = 'none';
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('accounts-grid').style.display = 'grid';
}

function showError(message) {
  const errorDiv = document.getElementById('error');
  document.getElementById('error-message').textContent = message;
  errorDiv.style.display = 'block';
  document.getElementById('accounts-grid').style.display = 'none';
}
```

---

## Security Considerations

### Secrets Management

1. **Never commit credentials to Git**
   - Add `.twitter_cookies.json` to `.gitignore`
   - Add `.env` to `.gitignore`
   - Use GitHub Actions secrets for all sensitive data

2. **Twitter burner account isolation**
   - Use dedicated burner account (not personal account)
   - Limit account permissions (no payment methods, no personal info)
   - Rotate credentials if compromised

3. **Gemini API key protection**
   - Store in GitHub secrets only
   - Never log API key in console output
   - Monitor usage in Google Cloud Console

### Data Privacy

1. **Public data only**
   - Only scrape public tweets (no DMs, no protected accounts)
   - Respect Twitter's robots.txt and terms of service
   - Data is already public, no privacy violation

2. **Repository visibility**
   - Repository should be private if accounts.json contains sensitive target lists
   - Or make accounts.json generic (common public figures only)

### Rate Limiting Compliance

1. **Twitter scraping**
   - Implement human-like delays
   - Respect rate limit headers
   - Use exponential backoff on errors
   - Don't attempt to bypass rate limits

2. **Gemini API**
   - Stay within free tier limits (15 RPM)
   - Handle quota errors gracefully
   - Monitor monthly usage

---

## Performance Optimization

### Backend Optimization

1. **Cookie reuse**
   - Save Twitter session cookies to file
   - Reuse cookies for 7 days before re-authentication
   - Reduces login overhead (saves ~5-10 seconds per run)

2. **Batch API calls**
   - One Gemini API call per account (not per tweet)
   - Reduces total API calls by 10-20x
   - Saves cost and time

3. **Parallel processing** (future enhancement)
   - Currently sequential (simpler, safer)
   - Could parallelize account scraping (requires careful rate limiting)
   - Potential 2-3x speedup

### Frontend Optimization

1. **Minimal JavaScript**
   - No framework overhead (React, Vue, etc.)
   - Vanilla JS is faster for simple rendering
   - ~10KB total JS size

2. **Lazy loading** (future enhancement)
   - Currently loads entire day's data at once
   - Could lazy-load tweets as user scrolls
   - Improves initial page load

3. **CSS optimization**
   - Single CSS file, no preprocessor
   - Use CSS custom properties (no SASS build step)
   - Critical CSS inlined in future

### Data Size Management

Current estimates:
- JSON file: ~100-200KB per day (20-50 accounts × 20 tweets)
- Excel file: ~200-300KB per day
- Total per day: ~400-500KB
- Monthly: ~12-15MB
- Yearly: ~150-180MB

**Long-term strategy:**
- Archive data older than 90 days (move to separate branch)
- Keep last 90 days in main branch for fast access
- Yearly cleanup task (manual or automated)

---

## Scalability and Maintenance

### Scaling Up (50+ accounts)

If monitoring 100+ accounts:
1. **Workflow time**: May exceed 10 minutes, risk timeout
2. **Solution**: Split into multiple workflows (by category)
3. **Alternative**: Optimize parallelization with careful rate limiting

### Scaling Down (Reducing Costs)

To further minimize costs:
1. Reduce scrape frequency (once daily instead of twice)
2. Reduce tweets per account (10 instead of 20)
3. Use gemini-1.5-flash instead of 2.0-flash (slightly cheaper)
4. Skip AI summary for low-activity accounts

### Maintenance Tasks

**Weekly:**
- Check GitHub Actions run history
- Verify no repeated failures

**Monthly:**
- Review Gemini API usage and costs
- Check Twitter burner account status
- Verify data/ directory size

**Quarterly:**
- Update Python dependencies (`pip install --upgrade`)
- Test frontend on new browsers
- Archive old data (3+ months)

**Yearly:**
- Rotate Twitter burner account (proactive)
- Review and update accounts.json
- Clean up archived data

### Monitoring Dashboard (Future Enhancement)

Create a simple status page:
- Last successful run timestamp
- Total accounts monitored
- Success rate (accounts scraped / total accounts)
- Gemini API usage this month
- GitHub Actions minutes used
- Data storage size

---

## Conclusion

This architecture provides a robust, cost-effective solution for automated Twitter monitoring with AI summarization. Key strengths:

✅ **Zero infrastructure costs** (GitHub-hosted)
✅ **Fully automated** (no manual intervention needed)
✅ **Resilient error handling** (graceful degradation)
✅ **Beautiful, responsive UI** (Apple-inspired design)
✅ **Scalable within constraints** (supports 20-50 accounts comfortably)
✅ **Simple maintenance** (no server to manage)

The design prioritizes simplicity and reliability over advanced features, making it perfect for an MVP. Future enhancements can be added incrementally without major architectural changes.

---

**References and Prior Art:**

Based on research of existing GitHub projects:
- [Twikit](https://github.com/d60/twikit) - Core scraping library
- [vladkens/twscrape](https://github.com/vladkens/twscrape) - Alternative scraper
- [swyxio/gh-action-data-scraping](https://github.com/swyxio/gh-action-data-scraping) - GitHub Actions pattern
- [patrickloeber/python-github-action-template](https://github.com/patrickloeber/python-github-action-template) - Python Action template
- [How to schedule Python scripts with GitHub Actions](https://www.python-engineer.com/posts/run-python-github-actions/) - Tutorial

---

**Next Steps:**

1. Backend Agent: Implement Python scripts (scraper, AI summary, Excel export)
2. Frontend Agent: Implement static web UI (HTML/CSS/JS)
3. Integration Agent: Setup GitHub Actions workflow and deployment
4. Testing: End-to-end validation with test accounts
5. Documentation: Complete README.md with setup instructions
6. Launch: Enable workflow and monitor first few runs

---

**Document Version**: 1.0.0
**Last Updated**: 2026-02-04
**Architect**: Claude (Sonnet 4.5)
**Status**: Ready for Implementation
