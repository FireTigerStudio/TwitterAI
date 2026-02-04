# TwitterAI - Product Brief

## Problem

Every day, 20-50 AI/tech/Web3 thought leaders and official accounts post important updates on Twitter/X. Manually checking each account is time-consuming and easy to miss key information. Need an automated tool that scrapes, summarizes with AI, and presents a daily digest.

## Users

Single user (personal tool). Self-hosted on GitHub.

## Core Decision Log

| Decision | Choice | Reason |
|----------|--------|--------|
| Data source | Twikit (Python) + dedicated burner account | All free scraping methods require auth in 2026; Twikit is actively maintained |
| Deployment | GitHub Actions + GitHub Pages | Zero cost, no server maintenance |
| AI Summary | Gemini API | User already has API key |
| Frontend | Static HTML/CSS/JS (no framework) | Simplest possible, MVP approach |
| Data storage | JSON files in git repo | No database needed for this scale |

---

## MVP Features (Must Have)

### 1. Automated Tweet Scraping
- Scrape 20-50 Twitter accounts twice daily (8:00 AM, 8:00 PM Beijing time)
- Fetch latest 10-20 tweets per account per scrape
- Capture: tweet text, post time, likes, retweets, reply count, original URL, author
- Use Twikit library with a dedicated burner Twitter account
- Store Twitter cookie as GitHub Actions secret

### 2. AI Summary Generation
- Use Gemini API to generate a one-sentence Chinese summary per account
- Batch all tweets from one account into a single Gemini API call
- ~20-50 Gemini API calls per scrape session (strict cost control)
- Prompt optimized for AI/tech/Web3 domain content

### 3. Excel Export
- Generate daily Excel file (.xlsx) with all scraped data
- Columns: Date, @username, Display Name, AI Summary, Tweet Content, Original Link, Likes, Retweets, Post Time
- Group tweets by account, AI summary shown in first row of each group
- File stored in repo, downloadable from web page

### 4. Web Dashboard
- Static single-page web app on GitHub Pages
- Date picker to browse historical data
- Account cards showing AI summary + tweet list
- Download Excel button
- Design: Apple-style, business-fashion aesthetic
  - Background: warm white `#FAF8F5`
  - Primary: deep rose `#C2185B`
  - Accent: light rose `#F8BBD0`, mid rose `#E91E63`
  - Text: black `#1D1D1F`, secondary gray `#6E6E73`
  - Font: -apple-system / SF Pro Display
- Mobile responsive

---

## Won't Have (Cut from MVP)

- User authentication / multi-user support
- Real-time monitoring / push notifications
- Trend charts / analytics dashboard
- Tweet sentiment analysis
- Search / filter functionality
- Custom AI prompt editing via UI
- Automatic translation

---

## Technical Architecture Overview

### Stack
- **Scraping:** Python 3.11+ / Twikit
- **AI:** Google Gemini API (gemini-2.0-flash or gemini-1.5-flash for cost)
- **Excel:** openpyxl
- **Frontend:** Vanilla HTML/CSS/JS
- **CI/CD:** GitHub Actions (cron schedule)
- **Hosting:** GitHub Pages (static)

### Data Flow
```
GitHub Actions (cron)
    → scraper.py (Twikit → fetch tweets)
    → ai_summary.py (Gemini API → generate summaries)
    → excel_export.py (openpyxl → generate .xlsx)
    → git commit & push (data/*.json, output/*.xlsx)
    → GitHub Pages auto-deploy (web/)
```

### File Structure
```
TwitterAI/
├── .github/workflows/scrape.yml
├── scripts/
│   ├── scraper.py
│   ├── ai_summary.py
│   ├── excel_export.py
│   └── config.py
├── data/                    # Daily JSON files
│   └── YYYY-MM-DD.json
├── output/                  # Daily Excel files
│   └── YYYY-MM-DD.xlsx
├── web/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── accounts.json            # Monitored accounts list
├── requirements.txt
└── README.md
```

### Data Schema

**accounts.json:**
```json
[
  {"username": "elonmusk", "category": "tech"},
  {"username": "OpenAI", "category": "ai"},
  {"username": "VitalikButerin", "category": "web3"}
]
```

**data/YYYY-MM-DD.json:**
```json
{
  "date": "2026-02-04",
  "scrape_time": "2026-02-04T08:00:00Z",
  "accounts": [
    {
      "username": "elonmusk",
      "display_name": "Elon Musk",
      "ai_summary": "One sentence Chinese summary of today's tweets",
      "tweets": [
        {
          "id": "123456789",
          "text": "Tweet content...",
          "created_at": "2026-02-04T06:30:00Z",
          "likes": 50000,
          "retweets": 12000,
          "replies": 8000,
          "url": "https://x.com/elonmusk/status/123456789",
          "is_retweet": false
        }
      ]
    }
  ]
}
```

**Excel Columns:**

| Col | Content |
|-----|---------|
| A | Date |
| B | @username |
| C | Display Name |
| D | AI Summary (first row per account group) |
| E | Tweet Content |
| F | Original Link |
| G | Likes |
| H | Retweets |
| I | Post Time |

---

## Key Constraints

1. **Cost control:** Gemini API calls must be minimized (batch tweets per account, ~20-50 calls/day)
2. **Data volume:** ~300-500 tweets/day, Excel files must stay reasonable size
3. **Account safety:** Use dedicated burner Twitter account, not personal account
4. **Minimal manual operation:** Fully automated, user only views web page and downloads Excel
5. **Simple deployment:** GitHub-only, one-click setup
6. **No server:** Static hosting + GitHub Actions only

---

## Competitors & References

| Project | Pros | Cons |
|---------|------|------|
| [Twikit](https://github.com/d60/twikit) | Free, actively maintained, rich API | Requires account cookie |
| [twscrape](https://github.com/vladkens/twscrape) | Multi-account support, CLI | More complex setup |
| [twitter-automation-ai](https://github.com/ihuzaifashoukat/twitter-automation-ai) | AI integration built-in | Selenium-based, heavy |
| [Agent.AI Twitter Digest](https://agent.ai/agent/twitter-feed-daily-digest) | Ready-to-use | Not self-hosted, paid |

**Our edge:** Fully self-hosted, zero cost (except Gemini API which user already pays for), simple static deployment, Chinese AI summaries, beautiful Apple-style UI.

---

## Hand to Architect

This product brief is complete. The Architect should:
1. Design the detailed system architecture
2. Create the implementation plan
3. Coordinate SubAgents for development (backend, frontend, integration)
