"""
Sync accounts.json with the authenticated user's Twitter following list.
Fetches all accounts the user follows and updates accounts.json accordingly.
"""

import asyncio
import json
import os
from pathlib import Path
from urllib.parse import unquote
from twikit import Client

from config import Config
from utils import setup_logger

logger = setup_logger(__name__, Config.LOG_LEVEL)

# Default category for newly discovered accounts
DEFAULT_CATEGORY = "uncategorized"


async def fetch_following(client: Client) -> list[dict]:
    """
    Fetch all accounts the authenticated user follows.
    Uses get_friends_ids (more reliable, up to 5000 per call) then
    resolves each user's screen_name via get_user_by_id.

    Returns:
        List of dicts with username, display_name fields
    """
    # Extract user ID from cookies (twid field contains "u%3D<user_id>")
    with open(Config.COOKIE_FILE, 'r') as f:
        cookies = json.load(f)
    twid = unquote(cookies.get('twid', ''))
    user_id = twid.replace('u=', '')
    logger.info(f"User ID from cookies: {user_id}")
    logger.info(f"Fetching following list...")

    # Use get_friends_ids (supports up to 5000 per call, more reliable)
    following = []
    try:
        friend_ids = await client.get_friends_ids(user_id=user_id, count=5000)
        id_list = list(friend_ids)
        logger.info(f"Found {len(id_list)} following IDs, resolving usernames...")

        for uid in id_list:
            try:
                user = await client.get_user_by_id(str(uid))
                following.append({
                    "username": user.screen_name,
                    "display_name": user.name or user.screen_name,
                })
            except Exception as e:
                logger.warning(f"Could not resolve user ID {uid}: {e}")
            await asyncio.sleep(0.5)

    except Exception as e:
        logger.warning(f"get_friends_ids failed ({e}), trying get_user_following...")
        # Fallback to get_user_following
        result = await client.get_user_following(user_id, count=100)
        while True:
            for user in result:
                following.append({
                    "username": user.screen_name,
                    "display_name": user.name or user.screen_name,
                })
            logger.info(f"Fetched {len(following)} accounts so far...")
            try:
                result = await result.next()
                if not result:
                    break
            except Exception:
                break
            await asyncio.sleep(Config.RATE_LIMIT_DELAY)

    logger.info(f"Total following: {len(following)} accounts")
    return following


def merge_accounts(existing: list[dict], fetched: list[dict]) -> list[dict]:
    """
    Merge fetched following list with existing accounts.json.
    Preserves category for accounts that already exist.
    Adds new accounts with DEFAULT_CATEGORY.
    Removes accounts no longer followed.

    Returns:
        Updated accounts list
    """
    existing_map = {acc["username"].lower(): acc for acc in existing}
    fetched_usernames = {acc["username"].lower() for acc in fetched}

    merged = []
    for acc in fetched:
        key = acc["username"].lower()
        if key in existing_map:
            # Preserve existing category, update display_name
            entry = existing_map[key].copy()
            entry["display_name"] = acc["display_name"]
            merged.append(entry)
        else:
            # New account
            merged.append({
                "username": acc["username"],
                "display_name": acc["display_name"],
                "category": DEFAULT_CATEGORY,
            })

    # Report changes
    new_usernames = fetched_usernames - set(existing_map.keys())
    removed_usernames = set(existing_map.keys()) - fetched_usernames

    if new_usernames:
        logger.info(f"Added {len(new_usernames)} new accounts: {', '.join(sorted(new_usernames))}")
    if removed_usernames:
        logger.info(f"Removed {len(removed_usernames)} unfollowed accounts: {', '.join(sorted(removed_usernames))}")
    if not new_usernames and not removed_usernames:
        logger.info("No changes detected")

    return merged


async def main():
    """Sync accounts.json with Twitter following list."""
    logger.info("Starting account sync...")

    Config.setup_cookies_from_env()

    if not Config.COOKIE_FILE.exists():
        logger.error(
            f"Cookie file not found: {Config.COOKIE_FILE}\n"
            "Export your Twitter cookies first."
        )
        return 1

    # Authenticate
    proxy = os.environ.get('https_proxy') or os.environ.get('HTTPS_PROXY')
    client = Client('en-US', proxy=proxy)
    client.load_cookies(str(Config.COOKIE_FILE))

    try:
        test = await client.get_user_by_screen_name('elonmusk')
        logger.info(f"Authenticated successfully (test fetch: @{test.screen_name})")
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        return 1

    # Fetch following list
    try:
        fetched = await fetch_following(client)
    except Exception as e:
        logger.error(f"Failed to fetch following list: {e}")
        return 1

    if not fetched:
        logger.error("No following accounts found, aborting")
        return 1

    # Load existing accounts
    existing = []
    if Config.ACCOUNTS_FILE.exists():
        with open(Config.ACCOUNTS_FILE, 'r', encoding='utf-8') as f:
            existing = json.load(f)

    # Merge and save
    merged = merge_accounts(existing, fetched)

    with open(Config.ACCOUNTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
        f.write('\n')

    logger.info(f"accounts.json updated: {len(merged)} accounts (was {len(existing)})")
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
