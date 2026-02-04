# TwitterAI - Project Handbook

## Project Overview

TwitterAI is a self-hosted Twitter monitoring tool that automatically scrapes 20-50 AI/tech/Web3 Twitter accounts twice daily, generates AI-powered Chinese summaries using Gemini API, and presents the data in a beautiful static web dashboard with Excel export. This is a personal tool designed for zero-cost operation using GitHub Actions and GitHub Pages.

**Key Principles:**
- Minimal complexity (no frameworks, no database)
- Zero server costs (GitHub-hosted only)
- Fully automated (minimal manual intervention)
- Cost control (strict Gemini API call limits)

## Tech Stack

### Backend (Python 3.11+)
- **Twikit** - Twitter scraping with cookie-based authentication
- **google-generativeai** - Gemini API integration for AI summaries
- **openpyxl** - Excel file generation
- **Standard library** - JSON, datetime, logging

### Frontend (Vanilla Web)
- **HTML5** - Semantic markup
- **CSS3** - Custom styling (no frameworks)
- **JavaScript ES6+** - Dynamic rendering (no frameworks)

### Infrastructure
- **GitHub Actions** - Cron-based automation (twice daily)
- **GitHub Pages** - Static site hosting
- **Git** - Data storage (JSON and Excel files committed to repo)

### External Services
- **Twitter/X** - Data source (via burner account)
- **Google Gemini API** - AI summarization service

## File Structure

```
TwitterAI/
├── .github/
│   └── workflows/
│       └── scrape.yml              # GitHub Actions workflow (cron: 0 0,12 * * *)
├── scripts/
│   ├── scraper.py                  # Twikit-based Twitter scraper
│   ├── ai_summary.py               # Gemini API integration
│   ├── excel_export.py             # Excel file generator
│   ├── config.py                   # Configuration loader
│   └── utils.py                    # Helper functions (logging, error handling)
├── data/
│   ├── 2026-02-04.json             # Daily scraped data (committed to git)
│   └── ...
├── output/
│   ├── 2026-02-04.xlsx             # Daily Excel reports (committed to git)
│   └── ...
├── web/
│   ├── index.html                  # Main dashboard page
│   ├── style.css                   # Apple-style design system
│   ├── app.js                      # Data loading and rendering
│   └── assets/
│       └── logo.svg                # Project logo (optional)
├── accounts.json                   # Monitored accounts configuration
├── requirements.txt                # Python dependencies
├── .gitignore                      # Ignore cookies, env files
├── README.md                       # User documentation
└── CLAUDE.md                       # This file (developer handbook)
```

## Data Schemas

### accounts.json
```json
[
  {
    "username": "elonmusk",
    "display_name": "Elon Musk",
    "category": "tech"
  },
  {
    "username": "OpenAI",
    "display_name": "OpenAI",
    "category": "ai"
  },
  {
    "username": "VitalikButerin",
    "display_name": "Vitalik Buterin",
    "category": "web3"
  }
]
```

### data/YYYY-MM-DD.json
```json
{
  "date": "2026-02-04",
  "scrape_time": "2026-02-04T08:00:00Z",
  "accounts": [
    {
      "username": "elonmusk",
      "display_name": "Elon Musk",
      "category": "tech",
      "ai_summary": "今日马斯克主要讨论了特斯拉新款电池技术和SpaceX的火星计划。",
      "tweets": [
        {
          "id": "123456789",
          "text": "Tweet content...",
          "created_at": "2026-02-04T06:30:00Z",
          "likes": 50000,
          "retweets": 12000,
          "replies": 8000,
          "url": "https://x.com/elonmusk/status/123456789",
          "is_retweet": false,
          "is_reply": false
        }
      ]
    }
  ]
}
```

## Development Workflow

### Agent Responsibilities

#### Backend Agent
- Implement `scraper.py` (Twikit integration, cookie management, rate limiting)
- Implement `ai_summary.py` (Gemini API calls, batch processing, error handling)
- Implement `excel_export.py` (openpyxl formatting, group by account)
- Implement `config.py` (load accounts.json, environment variables)
- Implement `utils.py` (logging, retry logic, error notifications)
- Write `requirements.txt`

#### Frontend Agent
- Implement `web/index.html` (semantic structure, date picker, account cards)
- Implement `web/style.css` (Apple-style design system, responsive layout)
- Implement `web/app.js` (fetch JSON, render cards, download Excel)
- Ensure mobile responsiveness
- Implement loading states and error handling

#### Integration Agent
- Implement `.github/workflows/scrape.yml` (cron schedule, Python setup, git commit)
- Configure GitHub Pages (deploy from /web directory)
- Write setup documentation in README.md
- Test end-to-end workflow
- Verify data flow: scrape → summarize → export → commit → deploy

### Development Order
1. Backend Agent: Core scraping and data processing logic
2. Frontend Agent: Static web dashboard (can develop in parallel)
3. Integration Agent: GitHub Actions automation and deployment

## Key Commands

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export TWITTER_USERNAME="your_burner_account"
export TWITTER_EMAIL="burner@example.com"
export TWITTER_PASSWORD="secure_password"
export GEMINI_API_KEY="your_gemini_key"

# Run scraper manually
python scripts/scraper.py

# Generate AI summaries
python scripts/ai_summary.py --input data/2026-02-04.json

# Export to Excel
python scripts/excel_export.py --input data/2026-02-04.json

# Run full pipeline
python scripts/scraper.py && \
python scripts/ai_summary.py --input data/$(date +%Y-%m-%d).json && \
python scripts/excel_export.py --input data/$(date +%Y-%m-%d).json
```

### GitHub Actions (Automated)

The workflow runs automatically twice daily at:
- 08:00 Beijing time (00:00 UTC)
- 20:00 Beijing time (12:00 UTC)

Cron expression: `0 0,12 * * *`

### Testing Frontend Locally

```bash
# Serve web directory (Python 3)
cd web && python -m http.server 8000

# Open browser
open http://localhost:8000
```

## Coding Conventions

### Python Style
- Follow PEP 8
- Use type hints for all function signatures
- Use `pathlib.Path` for file operations
- Use `logging` module (not print statements)
- Handle exceptions explicitly (no bare `except:`)
- Use `dataclasses` for structured data
- Add docstrings for all public functions

### JavaScript Style
- Use ES6+ features (const/let, arrow functions, async/await)
- Use modern DOM APIs (querySelector, fetch)
- No jQuery or external libraries
- Modular functions with single responsibility
- Handle errors with try/catch
- Use template literals for string interpolation

### CSS Style
- Mobile-first responsive design
- Use CSS custom properties for theming
- BEM naming convention for classes
- Avoid !important
- Progressive enhancement (graceful degradation)

### Git Commit Style
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Keep commits atomic and focused
- Write descriptive commit messages

## Environment Variables

### Required for Local Development
```bash
TWITTER_USERNAME="burner_account_username"
TWITTER_EMAIL="burner_account_email@example.com"
TWITTER_PASSWORD="burner_account_password"
GEMINI_API_KEY="your_gemini_api_key"
```

### Required for GitHub Actions
Set these as repository secrets:
- `TWITTER_USERNAME`
- `TWITTER_EMAIL`
- `TWITTER_PASSWORD`
- `GEMINI_API_KEY`

### Optional
```bash
LOG_LEVEL="INFO"  # DEBUG, INFO, WARNING, ERROR
GEMINI_MODEL="gemini-2.0-flash"  # or gemini-1.5-flash
MAX_TWEETS_PER_ACCOUNT=20
RATE_LIMIT_DELAY=2  # seconds between requests
```

## Design System

### Color Palette
```css
/* Primary */
--color-primary: #C2185B;      /* Deep rose */
--color-primary-light: #E91E63; /* Mid rose */
--color-accent: #F8BBD0;        /* Light rose */

/* Neutrals */
--color-bg: #FAF8F5;            /* Warm white */
--color-text: #1D1D1F;          /* Black */
--color-text-secondary: #6E6E73; /* Gray */
--color-border: #E0E0E0;        /* Light gray */

/* Semantic */
--color-success: #34C759;
--color-error: #FF3B30;
--color-warning: #FF9500;
```

### Typography
```css
--font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display",
               "Segoe UI", Roboto, sans-serif;

--font-size-xl: 32px;   /* Page title */
--font-size-lg: 24px;   /* Section headers */
--font-size-md: 18px;   /* Card titles */
--font-size-base: 16px; /* Body text */
--font-size-sm: 14px;   /* Metadata */

--font-weight-bold: 600;
--font-weight-regular: 400;
```

### Spacing Scale
```css
--space-xs: 8px;
--space-sm: 16px;
--space-md: 24px;
--space-lg: 32px;
--space-xl: 48px;
```

### Layout
- Max content width: 1200px
- Card border radius: 12px
- Shadow: subtle, layered (Apple-style)
- Grid: CSS Grid for account cards (responsive columns)

## Error Handling Strategy

### Scraper Errors
- **Twitter login failure**: Log error, send notification, exit with code 1
- **Rate limit hit**: Implement exponential backoff, max 3 retries
- **Account not found**: Log warning, skip account, continue
- **Network timeout**: Retry with backoff, max 3 attempts

### AI Summary Errors
- **Gemini API quota exceeded**: Log error, use fallback text "AI摘要暂时不可用"
- **API timeout**: Retry once, then fallback
- **Invalid response**: Log error, use fallback text

### Excel Export Errors
- **File write permission**: Log error, exit with code 1
- **Data format issue**: Log warning, write partial data

### GitHub Actions Errors
- **Workflow failure**: Send email notification (GitHub default)
- **Commit failure**: Log error, preserve data for next run

## Rate Limiting Strategy

### Twitter (Twikit)
- Delay between accounts: 2 seconds
- Delay between tweet fetches: 1 second
- Max retries on 429: 3 with exponential backoff (2s, 4s, 8s)
- Session management: Reuse cookies, refresh every 7 days

### Gemini API
- Batch all tweets per account into single API call
- Delay between API calls: 1 second
- Total calls per run: ~20-50 (one per account)
- Handle quota gracefully (use fallback text, don't fail entire run)
- Cost estimate: ~$0.01 per run (gemini-2.0-flash)

## Monitoring and Logging

### Log Levels
- **DEBUG**: Detailed technical info (API requests, response parsing)
- **INFO**: High-level progress (scraping started, account processed, file written)
- **WARNING**: Non-critical issues (account skipped, fallback used)
- **ERROR**: Critical failures (login failed, API quota exceeded)

### Log Format
```
[2026-02-04 08:00:00] [INFO] [scraper] Starting scrape for 20 accounts
[2026-02-04 08:00:05] [INFO] [scraper] Processed @elonmusk: 15 tweets
[2026-02-04 08:01:30] [WARNING] [ai_summary] Gemini API timeout for @OpenAI, retrying...
[2026-02-04 08:05:00] [INFO] [excel_export] Excel file written: output/2026-02-04.xlsx
```

### GitHub Actions Logs
- All Python logs visible in Actions console
- Failed runs send email notification
- Check "Actions" tab for run history

## Testing Strategy

### Manual Testing (MVP Phase)
- Run scripts locally with test account
- Verify JSON output format
- Verify Excel formatting
- Test frontend with sample data
- Test mobile responsiveness

### Future Improvements (Post-MVP)
- Unit tests for core functions
- Integration tests for full pipeline
- Mock Twitter API for testing
- Automated UI tests with Playwright

## Deployment Checklist

### Initial Setup
1. Create GitHub repository
2. Set repository secrets (Twitter credentials, Gemini API key)
3. Enable GitHub Pages (source: /web directory)
4. Add 3-5 test accounts to accounts.json
5. Push code to main branch
6. Manually trigger workflow to test
7. Verify GitHub Pages site live

### Maintenance
- Monitor GitHub Actions runs (twice daily)
- Check data/ directory size (clean old files if needed)
- Rotate Twitter burner account if suspended
- Monitor Gemini API usage/costs
- Update accounts.json as needed

## Known Limitations

1. **Twitter account safety**: Burner account may get suspended if scraping too aggressively
2. **Data volume**: Git repo size will grow over time (consider archiving old data)
3. **GitHub Actions limits**: 2,000 free minutes/month (this project uses ~10 min/day = 300 min/month)
4. **Gemini API costs**: ~$0.60/month at current rates (40 calls/day * 30 days * $0.0005/call)
5. **No real-time updates**: Data only refreshes twice daily
6. **Single user**: No authentication or multi-user support

## Support and Troubleshooting

### Common Issues

**Scraper fails with "Login failed"**
- Check Twitter credentials in GitHub secrets
- Verify burner account not suspended
- Clear cookies and re-authenticate

**Gemini API quota exceeded**
- Check API usage in Google Cloud Console
- Reduce number of monitored accounts
- Switch to lower-cost model (gemini-1.5-flash)

**GitHub Pages not updating**
- Verify Actions workflow completed successfully
- Check Pages settings (source: /web directory)
- Hard refresh browser (Cmd+Shift+R)

**Excel file not downloading**
- Check output/ directory exists
- Verify file committed to git
- Check browser console for errors

### Contact
This is a personal project. For issues, check GitHub Actions logs and Python error messages.

## Future Enhancements (Post-MVP)

- Search and filter functionality
- Trend charts and analytics
- Sentiment analysis
- Multi-language support (auto-translate summaries)
- Email digest notifications
- RSS feed generation
- Custom AI prompt templates
- Account categorization/tagging
- Tweet thread detection
- Media attachment preview
- Dark mode

---

**Last Updated**: 2026-02-04
**Version**: 1.0.0 (MVP)
