"""
AI summarization using Google Gemini API.
Generates Chinese summaries of Twitter content.
"""

import argparse
import json
import time
from pathlib import Path
from typing import List, Dict
import google.generativeai as genai

from config import Config
from utils import setup_logger


logger = setup_logger(__name__, Config.LOG_LEVEL)


class GeminiSummarizer:
    """AI summarization using Gemini API"""

    FALLBACK_SUMMARY = "AI摘要暂时不可用"

    def __init__(self, api_key: str, model_name: str = "gemini-2.0-flash"):
        """
        Initialize Gemini summarizer.

        Args:
            api_key: Google Gemini API key
            model_name: Gemini model to use
        """
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
        self.logger = logger

    def _build_prompt(self, tweets: List[Dict], username: str) -> str:
        """
        Construct optimized prompt for AI/tech/Web3 content.

        Args:
            tweets: List of tweet dictionaries
            username: Twitter username

        Returns:
            Formatted prompt string
        """
        # Format tweets into readable list
        tweets_text = "\n\n".join([
            f"推文 {i+1} (发布于 {tweet['created_at']}):\n{tweet['text']}\n"
            f"互动数据: {tweet['likes']} 赞, {tweet['retweets']} 转发, {tweet['replies']} 回复"
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

    def generate_summary(self, tweets: List[Dict], username: str) -> str:
        """
        Generate Chinese summary for account's tweets.

        Args:
            tweets: List of tweet dictionaries
            username: Twitter username

        Returns:
            Chinese summary text or fallback message
        """
        if not tweets:
            return "该账号今日暂无推文"

        try:
            # Build prompt
            prompt = self._build_prompt(tweets, username)

            # Call Gemini API
            response = self.model.generate_content(prompt)

            # Extract summary
            summary = response.text.strip()

            # Validate response
            if not summary or len(summary) < 5:
                self.logger.warning(f"Invalid summary for @{username}, using fallback")
                return self.FALLBACK_SUMMARY

            self.logger.info(f"Generated summary for @{username}: {summary[:50]}...")
            return summary

        except Exception as e:
            self.logger.warning(f"Summary generation failed for @{username}: {e}")
            return self.FALLBACK_SUMMARY

    def batch_summarize(self, data: Dict) -> Dict:
        """
        Process all accounts with rate limiting.

        Args:
            data: Data dictionary loaded from JSON

        Returns:
            Updated data dictionary with AI summaries
        """
        accounts = data.get("accounts", [])

        for i, account in enumerate(accounts):
            username = account['username']
            tweets = account['tweets']

            self.logger.info(f"Processing {i+1}/{len(accounts)}: @{username}")

            # Generate summary
            summary = self.generate_summary(tweets, username)
            account['ai_summary'] = summary

            # Rate limiting: wait between API calls
            if i < len(accounts) - 1:  # Don't wait after last account
                time.sleep(Config.GEMINI_RATE_LIMIT_DELAY)

        return data


def main():
    """Main entry point for standalone execution"""
    parser = argparse.ArgumentParser(description="Generate AI summaries for Twitter data")
    parser.add_argument(
        "--input",
        required=True,
        help="Path to input JSON file (e.g., data/2026-02-04.json)"
    )
    args = parser.parse_args()

    input_path = Path(args.input)

    # Validate input file
    if not input_path.exists():
        logger.error(f"Input file not found: {input_path}")
        return 1

    # Validate API key
    if not Config.GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY environment variable not set")
        return 1

    # Load data
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        logger.info(f"Loaded data from {input_path}")
    except Exception as e:
        logger.error(f"Failed to load input file: {e}")
        return 1

    # Initialize summarizer
    summarizer = GeminiSummarizer(
        api_key=Config.GEMINI_API_KEY,
        model_name=Config.GEMINI_MODEL
    )

    # Generate summaries
    try:
        updated_data = summarizer.batch_summarize(data)
        logger.info(f"Generated summaries for {len(updated_data['accounts'])} accounts")
    except Exception as e:
        logger.error(f"Summarization failed: {e}")
        return 1

    # Save updated data
    try:
        with open(input_path, 'w', encoding='utf-8') as f:
            json.dump(updated_data, f, ensure_ascii=False, indent=2)
        logger.info(f"Updated data saved to {input_path}")
        return 0
    except Exception as e:
        logger.error(f"Failed to save updated data: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
