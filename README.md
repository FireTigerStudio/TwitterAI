# TwitterAI

Automated Twitter monitoring tool that scrapes AI/tech/Web3 accounts daily, generates AI-powered Chinese summaries using Gemini, and presents a beautiful dashboard with Excel export.

## Features

- Scrape 20-50 Twitter accounts twice daily via GitHub Actions
- One-sentence Chinese AI summary per account (Gemini API)
- Downloadable daily Excel reports
- Apple-style static web dashboard on GitHub Pages
- Zero server cost
- Cookie-based auth (no Twitter password needed, supports Google login accounts)

## Quick Start

### 1. Fork this repository

### 2. Export Twitter cookies

This is the key step. You need to export your browser's Twitter cookies:

**Method: Use browser DevTools**

1. Open Chrome/Edge, log into [x.com](https://x.com)
2. Press `F12` to open DevTools
3. Go to **Console** tab
4. Paste this script and press Enter:

```javascript
// Export cookies as Twikit-compatible JSON
(function() {
  const cookies = document.cookie.split(';').map(c => {
    const [name, ...rest] = c.trim().split('=');
    return { name: name, value: rest.join('='), domain: '.x.com', path: '/' };
  });
  const blob = new Blob([JSON.stringify(cookies, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'twitter_cookies.json';
  a.click();
})();
```

5. A file `twitter_cookies.json` will download

**For local development:** Save this file as `.twitter_cookies.json` in the project root.

**For GitHub Actions:** Copy the file content as the `TWITTER_COOKIES` secret (see step 3).

### 3. Set up GitHub Secrets

Go to **Settings > Secrets and variables > Actions** and add:

| Secret | Description |
|--------|-------------|
| `TWITTER_COOKIES` | Content of the exported `twitter_cookies.json` file |
| `GEMINI_API_KEY` | Your Google Gemini API key |

Only 2 secrets needed!

### 4. Configure accounts

Edit `accounts.json` to add the Twitter accounts you want to monitor:

```json
[
  {
    "username": "OpenAI",
    "display_name": "OpenAI",
    "category": "ai"
  }
]
```

### 5. Enable GitHub Pages

Go to **Settings > Pages** and set:
- Source: Deploy from a branch
- Branch: `main`
- Folder: `/ (root)`

Then visit `https://<username>.github.io/<repo>/web/` to see the dashboard.

### 6. Run manually (optional)

Go to **Actions > Twitter Scraper > Run workflow** to trigger a manual run.

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Place your cookies file
cp ~/Downloads/twitter_cookies.json .twitter_cookies.json

# Set Gemini API key
export GEMINI_API_KEY="your_key"

# Run full pipeline
cd scripts && python main.py

# Or run steps individually
python scraper.py
python ai_summary.py --input ../data/2026-02-04.json
python excel_export.py --input ../data/2026-02-04.json

# Preview frontend
cd ../web && python -m http.server 8000
# Visit http://localhost:8000 (serve from project root for data access)
```

## Cookie Refresh

Twitter cookies typically last 1-2 months. When they expire:
1. The GitHub Actions workflow will fail
2. Re-export cookies from browser (repeat step 2)
3. Update the `TWITTER_COOKIES` GitHub secret

## Tech Stack

- **Scraping:** Python + Twikit (cookie-based auth)
- **AI:** Google Gemini API
- **Excel:** openpyxl
- **Frontend:** Vanilla HTML/CSS/JS
- **CI/CD:** GitHub Actions
- **Hosting:** GitHub Pages

## Cost

- GitHub Actions: Free (uses ~300 min/month of 2,000 free)
- Gemini API: ~$0.60/month
- Total: Under $1/month
