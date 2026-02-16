"""
Main entry point for TwitterAI pipeline.
Runs the full workflow: scrape -> summarize -> export.
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

from config import Config
from utils import setup_logger
from scraper import TwitterScraper
from ai_summary import GeminiSummarizer
from excel_export import ExcelExporter
from sync_accounts import main as sync_accounts


logger = setup_logger(__name__, Config.LOG_LEVEL)


async def run_scraper() -> Path:
    """Run Twitter scraper. Returns path to generated JSON file."""
    logger.info("Step 1/3: Running Twitter scraper...")

    # Setup cookies from env var if running in CI
    Config.setup_cookies_from_env()

    if not Config.COOKIE_FILE.exists():
        raise RuntimeError(
            f"Cookie file not found: {Config.COOKIE_FILE}\n"
            "Export your Twitter cookies and save there."
        )

    accounts = Config.load_accounts()
    logger.info(f"Loaded {len(accounts)} accounts to monitor")

    scraper = TwitterScraper()

    if not await scraper.authenticate():
        raise RuntimeError("Twitter authentication failed")

    results = await scraper.scrape_accounts(accounts)
    logger.info(f"Successfully scraped {len(results)} accounts")

    output_path = Config.DATA_DIR / f"{datetime.now().strftime('%Y-%m-%d')}.json"
    scraper.save_data(results, output_path)

    return output_path


def run_ai_summary(json_path: Path) -> None:
    """Run AI summarization on scraped data."""
    logger.info("Step 2/3: Generating AI summaries...")

    if not Config.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set")

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    summarizer = GeminiSummarizer(
        api_key=Config.GEMINI_API_KEY,
        model_name=Config.GEMINI_MODEL
    )

    updated_data = summarizer.batch_summarize(data)
    logger.info(f"Generated summaries for {len(updated_data['accounts'])} accounts")

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(updated_data, f, ensure_ascii=False, indent=2)
    logger.info(f"Updated data saved to {json_path}")


def run_excel_export(json_path: Path) -> Path:
    """Export data to Excel. Returns path to generated file."""
    logger.info("Step 3/3: Exporting to Excel...")

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    date_str = json_path.stem
    output_path = Config.OUTPUT_DIR / f"{date_str}.xlsx"

    exporter = ExcelExporter()
    exporter.export(data, output_path)

    return output_path


async def main():
    """Main pipeline execution"""
    parser = argparse.ArgumentParser(description="TwitterAI pipeline")
    parser.add_argument("--date", help="Date (YYYY-MM-DD), defaults to today", default=None)
    parser.add_argument("--sync", action="store_true", help="Sync accounts.json with Twitter following list before scraping")
    args = parser.parse_args()

    if args.date:
        try:
            datetime.strptime(args.date, '%Y-%m-%d')
        except ValueError:
            logger.error(f"Invalid date format: {args.date}. Use YYYY-MM-DD")
            return 1

    date_str = args.date or datetime.now().strftime('%Y-%m-%d')
    logger.info(f"Starting TwitterAI pipeline for {date_str}")

    Config.ensure_directories()

    if args.sync:
        logger.info("Syncing accounts.json with Twitter following list...")
        sync_result = await sync_accounts()
        if sync_result != 0:
            logger.warning("Account sync failed, continuing with existing accounts.json")

    try:
        json_path = await run_scraper()
        run_ai_summary(json_path)
        excel_path = run_excel_export(json_path)

        logger.info("Pipeline completed successfully!")
        logger.info(f"JSON data: {json_path}")
        logger.info(f"Excel file: {excel_path}")
        return 0

    except Exception as e:
        logger.error(f"Pipeline failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
