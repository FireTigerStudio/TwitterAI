"""
Utility functions for TwitterAI.
Includes logging setup, retry logic, and rate limiting decorators.
"""

import asyncio
import logging
import time
from functools import wraps
from typing import Callable, Any, TypeVar

T = TypeVar('T')


def setup_logger(name: str, level: str = "INFO") -> logging.Logger:
    """
    Setup logger with consistent formatting.

    Args:
        name: Logger name (usually module name)
        level: Log level (DEBUG, INFO, WARNING, ERROR)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level))

    # Remove existing handlers to avoid duplicates
    logger.handlers.clear()

    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    return logger


def retry_with_backoff(max_retries: int = 3, base_delay: float = 2.0):
    """
    Decorator for exponential backoff retry logic.

    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Base delay in seconds (doubles each retry)

    Usage:
        @retry_with_backoff(max_retries=3, base_delay=2.0)
        def fetch_data():
            # Code that may fail temporarily
            pass
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        if asyncio.iscoroutinefunction(func):
            @wraps(func)
            async def async_wrapper(*args, **kwargs) -> T:
                for attempt in range(max_retries):
                    try:
                        return await func(*args, **kwargs)
                    except Exception as e:
                        if attempt == max_retries - 1:
                            raise
                        delay = base_delay * (2 ** attempt)
                        logger = logging.getLogger(func.__module__)
                        logger.warning(
                            f"{func.__name__} failed (attempt {attempt+1}/{max_retries}): {e}. "
                            f"Retrying in {delay}s..."
                        )
                        await asyncio.sleep(delay)
                raise RuntimeError("Retry logic failed unexpectedly")
            return async_wrapper
        else:
            @wraps(func)
            def wrapper(*args, **kwargs) -> T:
                for attempt in range(max_retries):
                    try:
                        return func(*args, **kwargs)
                    except Exception as e:
                        if attempt == max_retries - 1:
                            raise
                        delay = base_delay * (2 ** attempt)
                        logger = logging.getLogger(func.__module__)
                        logger.warning(
                            f"{func.__name__} failed (attempt {attempt+1}/{max_retries}): {e}. "
                            f"Retrying in {delay}s..."
                        )
                        time.sleep(delay)
                raise RuntimeError("Retry logic failed unexpectedly")
            return wrapper
    return decorator


def rate_limit(delay: float):
    """
    Decorator to add delay between function calls.

    Args:
        delay: Delay in seconds to wait after function execution

    Usage:
        @rate_limit(2.0)
        def scrape_account(username):
            # Scraping code
            pass
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            result = func(*args, **kwargs)
            time.sleep(delay)
            return result
        return wrapper
    return decorator
