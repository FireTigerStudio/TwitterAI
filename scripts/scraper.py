"""
Twitter scraper using Twikit library.
Cookie-based authentication - no password needed.
"""

import asyncio
import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from twikit import Client

from config import Config
from utils import setup_logger, retry_with_backoff


logger = setup_logger(__name__, Config.LOG_LEVEL)


@dataclass
class Tweet:
    """Represents a single tweet"""
    id: str
    text: str
    created_at: str
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
    """Main scraper class using Twikit with cookie-based auth"""

    def __init__(self):
        proxy = os.environ.get('https_proxy') or os.environ.get('HTTPS_PROXY')
        self.client = Client('en-US', proxy=proxy)
        self.logger = logger

    async def authenticate(self) -> bool:
        """
        Authenticate using browser cookies.
        Cookies are loaded from a JSON file exported from browser.

        Returns:
            True if authentication successful, False otherwise
        """
        try:
            if not Config.COOKIE_FILE.exists():
                self.logger.error(
                    f"Cookie file not found: {Config.COOKIE_FILE}\n"
                    "Please export your Twitter cookies from browser.\n"
                    "See README.md for instructions."
                )
                return False

            self.logger.info("Loading cookies from file...")
            self.client.load_cookies(str(Config.COOKIE_FILE))

            # Validate cookies by making a test request
            try:
                me = await self.client.get_user_by_screen_name('elonmusk')
                self.logger.info(f"Authenticated successfully (test fetch: @{me.screen_name})")
                return True
            except Exception as e:
                self.logger.error(
                    f"Cookie validation failed: {e}\n"
                    "Cookies may be expired. Please re-export from browser."
                )
                return False

        except Exception as e:
            self.logger.error(f"Authentication failed: {e}")
            return False

    @retry_with_backoff(max_retries=3, base_delay=2.0)
    async def get_user_tweets(self, username: str, max_tweets: int = 20) -> List[Tweet]:
        """
        Fetch recent tweets for a user.

        Args:
            username: Twitter username (without @)
            max_tweets: Maximum number of tweets to fetch

        Returns:
            List of Tweet objects
        """
        tweets = []

        try:
            user = await self.client.get_user_by_screen_name(username)
            self.logger.debug(f"Fetched user: @{username} (ID: {user.id})")

            user_tweets = await self.client.get_user_tweets(user.id, 'Tweets', count=max_tweets)

            for tweet in user_tweets:
                if not tweet.id or not tweet.text:
                    continue

                tweet_obj = Tweet(
                    id=str(tweet.id),
                    text=tweet.text,
                    created_at=tweet.created_at,
                    likes=tweet.favorite_count or 0,
                    retweets=tweet.retweet_count or 0,
                    replies=tweet.reply_count or 0,
                    url=f"https://x.com/{username}/status/{tweet.id}",
                    is_retweet=hasattr(tweet, 'retweeted_tweet') and tweet.retweeted_tweet is not None,
                    is_reply=tweet.in_reply_to is not None
                )
                tweets.append(tweet_obj)

                if len(tweets) >= max_tweets:
                    break

            self.logger.info(f"Fetched {len(tweets)} tweets for @{username}")
            return tweets

        except Exception as e:
            self.logger.warning(f"Failed to fetch tweets for @{username}: {e}")
            raise

    async def scrape_accounts(self, accounts: List[dict]) -> List[Account]:
        """
        Scrape all monitored accounts with rate limiting.

        Args:
            accounts: List of account dictionaries from accounts.json

        Returns:
            List of Account objects with tweets
        """
        results = []

        for account_info in accounts:
            username = account_info['username']

            try:
                tweets = await self.get_user_tweets(username, Config.MAX_TWEETS_PER_ACCOUNT)

                account = Account(
                    username=username,
                    display_name=account_info['display_name'],
                    category=account_info['category'],
                    tweets=tweets,
                    ai_summary=None
                )
                results.append(account)

                self.logger.info(f"Processed @{username}: {len(tweets)} tweets")

            except Exception as e:
                self.logger.warning(f"Skipping @{username} due to error: {e}")

            # Rate limiting: wait between accounts
            await asyncio.sleep(Config.RATE_LIMIT_DELAY)

        return results

    def save_data(self, accounts: List[Account], output_path: Path) -> None:
        """Save scraped data to JSON file."""
        data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "scrape_time": datetime.now().isoformat(),
            "accounts": [
                {
                    "username": acc.username,
                    "display_name": acc.display_name,
                    "category": acc.category,
                    "ai_summary": acc.ai_summary,
                    "tweets": [asdict(tweet) for tweet in acc.tweets]
                }
                for acc in accounts
            ]
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        self.logger.info(f"Data saved to {output_path}")


async def main():
    """Main entry point for standalone execution"""
    logger.info("Starting Twitter scraper...")

    Config.ensure_directories()

    # Cookie file is the only requirement for scraper
    if not Config.COOKIE_FILE.exists():
        logger.error(
            "Cookie file not found!\n"
            "Please export your Twitter cookies and save to:\n"
            f"  {Config.COOKIE_FILE}\n"
            "See README.md for instructions."
        )
        return 1

    try:
        accounts = Config.load_accounts()
        logger.info(f"Loaded {len(accounts)} accounts to monitor")
    except Exception as e:
        logger.error(f"Failed to load accounts.json: {e}")
        return 1

    scraper = TwitterScraper()

    if not await scraper.authenticate():
        logger.error("Authentication failed, exiting")
        return 1

    try:
        results = await scraper.scrape_accounts(accounts)
        logger.info(f"Successfully scraped {len(results)} accounts")
    except Exception as e:
        logger.error(f"Scraping failed: {e}")
        return 1

    output_path = Config.DATA_DIR / f"{datetime.now().strftime('%Y-%m-%d')}.json"
    try:
        scraper.save_data(results, output_path)
        logger.info("Scraping completed successfully")
        return 0
    except Exception as e:
        logger.error(f"Failed to save data: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
