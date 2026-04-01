"""Per-model circuit breaker."""

import pytest

from app.circuit_breaker import CircuitBreaker


class FakeClock:
    def __init__(self) -> None:
        self.t = 0.0

    def __call__(self) -> float:
        return self.t

    def advance(self, dt: float) -> None:
        self.t += dt


def test_opens_after_threshold_failures() -> None:
    clock = FakeClock()
    cb = CircuitBreaker(
        failure_threshold=3,
        open_seconds=100.0,
        monotonic_fn=clock,
    )
    assert cb.allow("m1") is True
    cb.record_failure("m1")
    cb.record_failure("m1")
    assert cb.allow("m1") is True
    cb.record_failure("m1")
    assert cb.allow("m1") is False


def test_success_resets_failures() -> None:
    clock = FakeClock()
    cb = CircuitBreaker(
        failure_threshold=3,
        open_seconds=100.0,
        monotonic_fn=clock,
    )
    cb.record_failure("m1")
    cb.record_failure("m1")
    cb.record_success("m1")
    cb.record_failure("m1")
    cb.record_failure("m1")
    assert cb.allow("m1") is True


def test_recovers_after_open_period() -> None:
    clock = FakeClock()
    cb = CircuitBreaker(
        failure_threshold=2,
        open_seconds=10.0,
        monotonic_fn=clock,
    )
    cb.record_failure("m1")
    cb.record_failure("m1")
    assert cb.allow("m1") is False
    clock.advance(10.0)
    assert cb.allow("m1") is True


def test_after_cooldown_failure_reopens_circuit() -> None:
    clock = FakeClock()
    cb = CircuitBreaker(
        failure_threshold=1,
        open_seconds=10.0,
        monotonic_fn=clock,
    )
    cb.record_failure("m1")
    assert cb.allow("m1") is False
    clock.advance(10.0)
    assert cb.allow("m1") is True
    cb.record_failure("m1")
    assert cb.allow("m1") is False


def test_after_cooldown_success_closes_circuit() -> None:
    clock = FakeClock()
    cb = CircuitBreaker(
        failure_threshold=2,
        open_seconds=10.0,
        monotonic_fn=clock,
    )
    cb.record_failure("m1")
    cb.record_failure("m1")
    clock.advance(10.0)
    assert cb.allow("m1") is True
    cb.record_success("m1")
    assert cb.allow("m1") is True
