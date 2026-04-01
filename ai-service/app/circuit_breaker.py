"""Simple per-key circuit breaker (closed / open with cooldown)."""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Callable


class CircuitBreaker:
    """Trips after `failure_threshold` consecutive failures; blocks until `open_seconds` elapse."""

    def __init__(
        self,
        failure_threshold: int,
        open_seconds: float,
        monotonic_fn: Callable[[], float] | None = None,
    ) -> None:
        self._failure_threshold = failure_threshold
        self._open_seconds = open_seconds
        self._mono = monotonic_fn or time.monotonic
        self._failures: dict[str, int] = defaultdict(int)
        self._open_until: dict[str, float] = {}

    def allow(self, key: str) -> bool:
        now = self._mono()
        until = self._open_until.get(key)
        if until is not None and now < until:
            return False
        if until is not None and now >= until:
            self._open_until.pop(key, None)
            self._failures[key] = 0
        return True

    def record_success(self, key: str) -> None:
        self._failures[key] = 0
        self._open_until.pop(key, None)

    def record_failure(self, key: str) -> None:
        self._failures[key] += 1
        if self._failures[key] >= self._failure_threshold:
            self._open_until[key] = self._mono() + self._open_seconds
            self._failures[key] = 0
