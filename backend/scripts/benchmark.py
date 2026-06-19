"""
Performance benchmark script for UniVerse API.

Measures response times (avg, median, p95, min, max), error rate, and RPS
across representative read and write endpoints at 1, 10, and 25 concurrent users.

Usage:
    python scripts/benchmark.py [--base-url http://localhost:8000] [--runs 30]
"""

import argparse
import asyncio
import json
import statistics
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

import httpx


@dataclass
class BenchmarkResult:
    endpoint: str
    method: str
    concurrency: int
    total_requests: int
    successful: int
    failed: int
    times_ms: list[float] = field(default_factory=list)

    @property
    def error_rate(self) -> float:
        return (self.failed / self.total_requests * 100) if self.total_requests else 0

    @property
    def avg_ms(self) -> float:
        return statistics.mean(self.times_ms) if self.times_ms else 0

    @property
    def median_ms(self) -> float:
        return statistics.median(self.times_ms) if self.times_ms else 0

    @property
    def p95_ms(self) -> float:
        if not self.times_ms:
            return 0
        sorted_t = sorted(self.times_ms)
        idx = int(len(sorted_t) * 0.95)
        return sorted_t[min(idx, len(sorted_t) - 1)]

    @property
    def min_ms(self) -> float:
        return min(self.times_ms) if self.times_ms else 0

    @property
    def max_ms(self) -> float:
        return max(self.times_ms) if self.times_ms else 0

    @property
    def rps(self) -> float:
        if not self.times_ms:
            return 0
        total_s = sum(self.times_ms) / 1000
        return self.total_requests / (total_s / self.concurrency) if total_s else 0


API = "/api/v1"

UNIVERSITY_ID = "49bb18b9-531f-4c57-be4d-c8be652ef4f8"
COMMUNITY_ID = "e75f0791-1ff8-4e86-8532-0300eeecc216"
POST_ID = "d16b2fc0-7acd-4bbc-b391-e5547359fd0d"

TEST_USER = {"identifier": "benchtester", "password": "BenchPass1"}


async def login_user(client: httpx.AsyncClient) -> str | None:
    try:
        resp = await client.post(f"{API}/auth/login", json=TEST_USER)
        if resp.status_code == 200:
            return resp.json()["access_token"]
        print(f"  Login returned {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"  Login error: {e}")
    return None


async def single_request(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    headers: dict | None = None,
    json_body: dict | None = None,
) -> tuple[float, bool]:
    start = time.perf_counter()
    try:
        if method == "GET":
            resp = await client.get(url, headers=headers)
        elif method == "POST":
            resp = await client.post(url, headers=headers, json=json_body)
        else:
            resp = await client.request(method, url, headers=headers, json=json_body)
        elapsed = (time.perf_counter() - start) * 1000
        return elapsed, 200 <= resp.status_code < 400
    except Exception:
        elapsed = (time.perf_counter() - start) * 1000
        return elapsed, False


async def run_benchmark(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    headers: dict | None,
    json_body: dict | None,
    concurrency: int,
    total_requests: int,
    label: str,
) -> BenchmarkResult:
    result = BenchmarkResult(
        endpoint=label,
        method=method,
        concurrency=concurrency,
        total_requests=total_requests,
        successful=0,
        failed=0,
    )

    sem = asyncio.Semaphore(concurrency)

    async def _task():
        async with sem:
            elapsed, ok = await single_request(client, method, url, headers, json_body)
            result.times_ms.append(elapsed)
            if ok:
                result.successful += 1
            else:
                result.failed += 1

    tasks = [asyncio.create_task(_task()) for _ in range(total_requests)]
    await asyncio.gather(*tasks)
    return result


def print_result(r: BenchmarkResult):
    print(f"  {'Metric':<12} {'Value':>10}")
    print(f"  {'-' * 24}")
    print(f"  {'Avg':<12} {r.avg_ms:>8.1f}ms")
    print(f"  {'Median':<12} {r.median_ms:>8.1f}ms")
    print(f"  {'P95':<12} {r.p95_ms:>8.1f}ms")
    print(f"  {'Min':<12} {r.min_ms:>8.1f}ms")
    print(f"  {'Max':<12} {r.max_ms:>8.1f}ms")
    print(f"  {'Error %':<12} {r.error_rate:>7.1f}%")
    print(f"  {'RPS':<12} {r.rps:>8.1f}")
    print()


async def main():
    parser = argparse.ArgumentParser(description="UniVerse API Benchmark")
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--runs", type=int, default=30, help="Requests per endpoint per concurrency level")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    concurrency_levels = [1, 10, 25]
    all_results: list[BenchmarkResult] = []

    async with httpx.AsyncClient(base_url=base_url, timeout=60) as client:
        # Health check
        print(f"Checking server at {base_url}...")
        try:
            resp = await client.get(
                f"{API}/communities?university_id={UNIVERSITY_ID}&page=1&page_size=1"
            )
            print(f"  Health check: {resp.status_code}")
        except httpx.ConnectError:
            print(f"Cannot connect to {base_url}. Start the server first.")
            sys.exit(1)

        # Login
        print("Logging in test user...")
        token = await login_user(client)
        if not token:
            print("Login failed. Proceeding with unauthenticated endpoints only.")
        else:
            print("  Logged in successfully.")

        headers = {"Authorization": f"Bearer {token}"} if token else {}

        # Warmup — prime the connection pool
        print("Warming up (3 requests)...")
        for _ in range(3):
            await client.get(
                f"{API}/communities?university_id={UNIVERSITY_ID}&page=1&page_size=1"
            )

        # Define endpoints
        endpoints = [
            ("GET", f"{API}/communities?university_id={UNIVERSITY_ID}&page=1&page_size=20",
             headers, None, "GET /communities"),
            ("GET", f"{API}/communities/{COMMUNITY_ID}",
             headers, None, "GET /communities/:id"),
            ("GET", f"{API}/communities/{COMMUNITY_ID}/posts?page=1&page_size=20",
             headers, None, "GET /communities/:id/posts"),
            ("GET", f"{API}/posts/{POST_ID}",
             headers, None, "GET /posts/:id"),
        ]

        if token:
            endpoints.extend([
                ("GET", f"{API}/feed?page=1&page_size=20",
                 headers, None, "GET /feed"),
                ("GET", f"{API}/users/me",
                 headers, None, "GET /users/me"),
                ("GET", f"{API}/notifications?page=1&page_size=20",
                 headers, None, "GET /notifications"),
            ])

        endpoints.append(
            ("GET", f"{API}/ai/evaluation",
             headers, None, "GET /ai/evaluation")
        )

        # Write endpoints
        endpoints.append(
            ("POST", f"{API}/auth/login",
             {}, TEST_USER, "POST /auth/login")
        )

        print(f"\nBenchmarking {len(endpoints)} endpoints × {len(concurrency_levels)} concurrency levels")
        print(f"Requests per combination: {args.runs}\n")
        print("=" * 60)

        for method, url, hdrs, body, label in endpoints:
            print(f"\n>> {label}")
            for conc in concurrency_levels:
                print(f"  Concurrency: {conc}")
                result = await run_benchmark(
                    client, method, url, hdrs, body, conc, args.runs, label,
                )
                all_results.append(result)
                print_result(result)

    # Save JSON results
    output = []
    for r in all_results:
        output.append({
            "endpoint": r.endpoint,
            "method": r.method,
            "concurrency": r.concurrency,
            "total_requests": r.total_requests,
            "successful": r.successful,
            "failed": r.failed,
            "avg_ms": round(r.avg_ms, 2),
            "median_ms": round(r.median_ms, 2),
            "p95_ms": round(r.p95_ms, 2),
            "min_ms": round(r.min_ms, 2),
            "max_ms": round(r.max_ms, 2),
            "error_rate_pct": round(r.error_rate, 2),
            "rps": round(r.rps, 2),
        })

    output_path = Path(__file__).resolve().parent.parent / "docs" / "benchmark_results.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, indent=2))
    print(f"\nResults saved to {output_path}")

    # Summary table
    print("\n" + "=" * 110)
    print(
        f"{'Endpoint':<35} {'Conc':>4} {'Avg':>8} {'Med':>8} "
        f"{'P95':>8} {'Min':>8} {'Max':>8} {'Err%':>6} {'RPS':>8}"
    )
    print("-" * 110)
    for r in all_results:
        print(
            f"{r.endpoint:<35} {r.concurrency:>4} "
            f"{r.avg_ms:>7.1f} {r.median_ms:>7.1f} {r.p95_ms:>7.1f} "
            f"{r.min_ms:>7.1f} {r.max_ms:>7.1f} {r.error_rate:>5.1f}% {r.rps:>7.1f}"
        )
    print("=" * 110)


if __name__ == "__main__":
    asyncio.run(main())
