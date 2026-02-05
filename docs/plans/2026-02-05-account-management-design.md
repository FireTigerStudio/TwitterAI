# Account Management UI Design

## Summary

Add a slide-out panel to the web dashboard for managing monitored Twitter accounts (add/edit/delete). Changes auto-commit to `accounts.json` via GitHub API.

## Architecture

- **UI**: Slide-out panel (400px, right side) triggered by header button
- **Storage**: GitHub API `PUT /repos/:owner/:repo/contents/accounts.json` for persistence
- **Auth**: GitHub PAT stored in `localStorage`, one-time setup
- **Repo detection**: Auto-detect owner/repo from GitHub Pages URL, manual config for local dev

## UI Components

1. **Header button**: "Manage Accounts" with gear icon, next to existing controls
2. **Panel header**: Title + close button
3. **GitHub token input**: Small collapsible section at top, status indicator
4. **Add account**: Paste Twitter/X URL input, auto-extract username, mini form (display name, category dropdown)
5. **Account list**: Rows with display name, @username, category badge, edit/delete icons
6. **Edit mode**: Inline editing of display name and category
7. **Delete**: Trash icon with confirmation prompt
8. **Overlay backdrop**: Closes panel on click

## Data Flow

1. Panel opens → fetch `accounts.json` via GitHub API (gets content + SHA)
2. User makes changes (add/edit/delete)
3. Save → base64-encode updated JSON → `PUT` to GitHub API with SHA
4. Success/error feedback shown in panel
5. Next scraper run picks up changes automatically

## URL Parsing

Regex: `https?://(twitter\.com|x\.com)/([A-Za-z0-9_]+)` → extract username
Validate: non-empty, not duplicate, strip trailing slashes

## Error Handling

- Invalid URL → inline error message
- Duplicate account → "Already being monitored"
- Bad/missing GitHub token → prompt to enter/fix token
- API failure → error message with details
- SHA conflict → re-fetch and retry once

## Files Modified

- `web/index.html` — add panel markup and manage button
- `web/style.css` — panel styles, animations, account list styles
- `web/app.js` — GitHub API integration, panel logic, URL parsing
