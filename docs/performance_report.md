# UniVerse API Performance Report

## 1. Test Environment

| Parameter | Value |
|---|---|
| **Server** | FastAPI + Uvicorn (single worker) |
| **Python** | 3.14 |
| **Database** | PostgreSQL 16 (Supabase cloud, remote) |
| **ORM** | SQLAlchemy 2.x (async, asyncpg driver) |
| **Host Machine** | Windows 11 Pro, local development |
| **Network** | Local API server -> Remote cloud DB (Supabase) |
| **Connection Pool** | size=5, max_overflow=10 |
| **Benchmark Tool** | Custom Python async script (httpx + asyncio) |
| **Requests per Endpoint** | 30 per concurrency level |
| **Concurrency Levels** | 1, 10, 25 simultaneous users |
| **Date** | 2026-06-19 |

> **Important Note:** Response times are dominated by network round-trip to the remote Supabase PostgreSQL database (~1,500-2,000ms baseline RTT). In a production deployment with co-located API + DB (same region/VPC), these times would be significantly lower (estimated 50-200ms for simple queries).

## 2. Endpoints Tested

### Read Endpoints
| # | Endpoint | Description | Auth |
|---|---|---|---|
| 1 | `GET /api/v1/communities` | List communities (paginated) | Optional |
| 2 | `GET /api/v1/communities/:id` | Single community detail | Optional |
| 3 | `GET /api/v1/communities/:id/posts` | Community posts (paginated) | Optional |
| 4 | `GET /api/v1/posts/:id` | Single post detail | Optional |
| 5 | `GET /api/v1/feed` | Home feed (paginated, ranked) | Required |
| 6 | `GET /api/v1/users/me` | Current user profile | Required |
| 7 | `GET /api/v1/notifications` | User notifications (paginated) | Required |
| 8 | `GET /api/v1/ai/evaluation` | AI system evaluation metrics | Optional |

### Write Endpoints
| # | Endpoint | Description | Auth |
|---|---|---|---|
| 9 | `POST /api/v1/auth/login` | User authentication (JWT) | None |

## 3. Results Summary (Single User, Concurrency = 1)

| Endpoint | Avg (ms) | Median (ms) | P95 (ms) | Min (ms) | Max (ms) | Error % | RPS |
|---|---|---|---|---|---|---|---|
| GET /communities | 3,608 | 3,572 | 3,872 | 3,361 | 4,355 | 0.0% | 0.3 |
| GET /communities/:id | 2,515 | 2,360 | 3,433 | 2,094 | 3,664 | 0.0% | 0.4 |
| GET /communities/:id/posts | 5,355 | 4,822 | 7,368 | 4,364 | 7,627 | 0.0% | 0.2 |
| GET /posts/:id | 4,159 | 3,819 | 6,039 | 3,443 | 6,151 | 0.0% | 0.2 |
| GET /feed | 2,205 | 2,157 | 2,873 | 1,743 | 3,047 | 0.0% | 0.5 |
| GET /users/me | 3,091 | 2,787 | 4,298 | 2,465 | 5,106 | 0.0% | 0.3 |
| GET /notifications | 2,484 | 2,318 | 3,428 | 1,994 | 3,895 | 0.0% | 0.4 |
| GET /ai/evaluation | 1,659 | 1,657 | 2,097 | 1,396 | 2,505 | 0.0% | 0.6 |
| POST /auth/login | 772 | 12 | 2,523 | 10 | 3,192 | 66.7%* | 1.3 |

*Login error rate due to rate limiter (10 requests per 5 min per IP). Successful logins complete in ~2,500ms (DB query + bcrypt hash verification).

## 4. Concurrency Scaling Results

### At 10 Concurrent Users

| Endpoint | Avg (ms) | Median (ms) | P95 (ms) | Error % | RPS |
|---|---|---|---|---|---|
| GET /communities | 7,951 | 4,226 | 17,052 | 0.0% | 1.3 |
| GET /communities/:id | 6,358 | 2,647 | 16,528 | 0.0% | 1.6 |
| GET /communities/:id/posts | 8,182 | 4,922 | 19,708 | 0.0% | 1.2 |
| GET /posts/:id | 7,664 | 4,051 | 18,491 | 0.0% | 1.3 |
| GET /feed | 2,445 | 2,099 | 3,604 | 0.0% | 4.1 |
| GET /users/me | 3,844 | 3,173 | 6,025 | 0.0% | 2.6 |
| GET /notifications | 5,641 | 2,426 | 15,520 | 0.0% | 1.8 |
| GET /ai/evaluation | 5,271 | 1,830 | 14,634 | 0.0% | 1.9 |
| POST /auth/login | 137 | 13 | 474 | 100%* | 72.8 |

### At 25 Concurrent Users

| Endpoint | Avg (ms) | Median (ms) | P95 (ms) | Error % | RPS |
|---|---|---|---|---|---|
| GET /communities | 6,235 | 6,145 | 9,809 | 0.0% | 4.0 |
| GET /communities/:id | 5,366 | 5,423 | 8,012 | 0.0% | 4.7 |
| GET /communities/:id/posts | 8,355 | 9,147 | 19,312 | 0.0% | 3.0 |
| GET /posts/:id | 8,148 | 8,073 | 12,339 | 0.0% | 3.1 |
| GET /feed | 3,762 | 4,181 | 4,793 | 0.0% | 6.6 |
| GET /users/me | 5,479 | 6,058 | 8,837 | 0.0% | 4.6 |
| GET /notifications | 4,476 | 4,470 | 6,986 | 0.0% | 5.6 |
| GET /ai/evaluation | 4,181 | 3,841 | 6,224 | 0.0% | 6.0 |
| POST /auth/login | 361 | 306 | 618 | 100%* | 69.3 |

*Rate limiter actively blocking concurrent login attempts (by design).

## 5. Interpretation

### Response Time Analysis

The measured response times reflect **end-to-end latency including network round-trip** to the remote Supabase PostgreSQL database. The breakdown:

- **Network RTT to cloud DB:** ~1,400-1,700ms baseline (observed from simplest queries)
- **API processing overhead:** <10ms (observed from rate-limited responses that skip DB)
- **DB query execution:** varies by endpoint complexity

**Fastest endpoints** (single user):
1. `GET /ai/evaluation` — 1,659ms avg (simple aggregate query)
2. `GET /feed` — 2,205ms avg (optimized feed algorithm)
3. `GET /notifications` — 2,484ms avg (single-table with index)

**Slowest endpoints** (single user):
1. `GET /communities/:id/posts` — 5,355ms avg (multiple batch queries: posts + authors + likes + comments + reposts)
2. `GET /posts/:id` — 4,159ms avg (similar multi-query pattern)
3. `GET /communities` — 3,608ms avg (list + member counts)

### Concurrency Behavior

- **0% error rate** on all read endpoints at all concurrency levels — the system handles concurrent load without failures
- **P95 latency increases** at higher concurrency due to connection pool contention (pool size=5, max overflow=10, serving 25 concurrent)
- **RPS scales** roughly linearly with concurrency for simpler endpoints (feed: 0.5 -> 4.1 -> 6.6 RPS)
- Heavy endpoints show P95 spikes at concurrency 10 (17-20s) due to connection pool queuing

### Rate Limiting Validation

The `POST /auth/login` results confirm the rate limiter works correctly:
- 10 requests per 5 minutes per IP
- At concurrency 1: first 10 succeed, remaining 20 blocked (66.7% error rate)
- At concurrency 10+: all blocked (previous tests exhausted the quota)
- Blocked responses return instantly (~10-13ms), proving the rate limiter short-circuits before DB access

## 6. Database Performance Analysis

### Index Coverage

All major query columns are properly indexed:

| Table | Indexed Columns |
|---|---|
| `users` | `email`, `username`, `university_id` |
| `posts` | `author_id`, `community_id`, `post_type`, `category` |
| `comments` | `post_id`, `author_id`, `parent_comment_id` |
| `communities` | `university_id`, `is_deleted` |
| `notifications` | `user_id`, `is_read` |
| `job_posts` | `posted_by`, `status` |
| `messages` | `conversation_id`, `sender_id` |
| `reports` | `reporter_id`, `target_type`, `target_id`, `status` |
| `ai_usage_logs` | `user_id`, `feature`, `created_at` |

**Missing indexes:** None identified. All foreign key columns and commonly filtered columns have appropriate indexes.

### N+1 Query Patterns

Several services load related entities in sequential loops rather than batch queries:

1. **Author loading in post/feed/comment services:**
   - `feed_service.py:116-119` — Loads each author one by one: `for aid in candidate_author_ids: await user_repo.get_by_id(aid)`
   - `post_service.py:151-154` — Same pattern in `list_posts`
   - `comment_service.py:131-134` — Same pattern in comment listing
   - **Impact:** Each unique author adds one DB round-trip (~1,700ms with remote DB)

2. **Actor loading in notification service:**
   - `notification_service.py:110-113` — Loads notification actors one by one
   - **Impact:** Each notification from a different user adds one round-trip

**Recommendation:** Replace individual `get_by_id` calls with a single `SELECT ... WHERE id IN (...)` batch query. This would reduce N sequential round-trips to 1.

### Pagination

All list endpoints implement proper OFFSET/LIMIT pagination:
- Repositories consistently use `.offset(skip).limit(limit)` pattern
- Default page sizes: 20 items (configurable, max 100)
- Total count queries run separately for pagination metadata
- All paginated responses use the `PaginatedResponse` schema with `page`, `page_size`, `total`, `total_pages`

**Note:** OFFSET-based pagination can become slow for deep pages on large tables. Consider cursor-based pagination for production scale.

## 7. Limitations

1. **Remote database:** All times include ~1,500ms network RTT to Supabase cloud. A co-located deployment would reduce response times by 60-80%.
2. **Single Uvicorn worker:** Production should use multiple workers (gunicorn with uvicorn workers).
3. **Connection pool size:** Default pool (5+10) limits concurrent DB connections. Production should tune this based on expected load.
4. **Small dataset:** Tests run against development data (~10 posts, ~3 communities, ~3 users). Response times may increase with larger datasets.
5. **No write-heavy benchmarks:** POST /posts and POST /comments were not benchmarked to avoid creating test data pollution.
6. **Rate limiter interference:** Login endpoint benchmarks were affected by the rate limiter (by design), so its true performance under load is not fully measured.
7. **Local client:** Benchmark client runs on the same machine as the API server, so network latency between client and API is negligible.

## 8. Improvement Opportunities

### High Priority
1. **Batch author loading:** Replace N+1 individual `get_by_id` queries with a single `WHERE id IN (...)` query in feed, post listing, comment, and notification services. Estimated improvement: 30-50% for list endpoints.
2. **Co-located deployment:** Move API and DB to same region/VPC. Estimated improvement: 60-80% reduction in response times.

### Medium Priority
3. **Connection pool tuning:** Increase pool size for higher concurrency (e.g., pool_size=20, max_overflow=30).
4. **Response caching:** Add Redis cache for frequently-read, rarely-changing data (community details, user profiles). Expected: <50ms for cached responses.
5. **Multiple workers:** Run with `gunicorn -w 4 -k uvicorn.workers.UvicornWorker` for CPU parallelism.

### Lower Priority
6. **Cursor-based pagination:** Replace OFFSET/LIMIT with cursor pagination for large tables to maintain consistent performance at deep pages.
7. **Eager loading:** Use SQLAlchemy `selectinload` or `joinedload` for commonly-accessed relationships instead of manual batch loading.
8. **Query optimization:** Combine the separate "count + list" queries into window functions where possible.

## 9. Estimated Production Performance

With a co-located deployment (same-region DB), the estimated response times would be:

| Endpoint | Current Avg (ms) | Estimated Co-located (ms) |
|---|---|---|
| GET /ai/evaluation | 1,659 | 50-100 |
| GET /feed | 2,205 | 80-150 |
| GET /notifications | 2,484 | 100-180 |
| GET /communities/:id | 2,515 | 100-200 |
| GET /users/me | 3,091 | 80-120 |
| GET /communities | 3,608 | 120-250 |
| GET /posts/:id | 4,159 | 150-300 |
| GET /communities/:id/posts | 5,355 | 200-400 |
| POST /auth/login | 2,500* | 200-400** |

*Successful login only. **Includes bcrypt hash verification (~100-200ms).

## 10. Screenshots to Capture

For the final report, capture screenshots of:
1. Terminal running `python scripts/benchmark.py` showing the summary table
2. The `docs/benchmark_results.json` file in an editor
3. Server logs showing request processing with response times
4. Database index definitions in any model file (e.g., `backend/app/models/post.py`)

---

**Benchmark Script:** `backend/scripts/benchmark.py`
**Raw Results:** `backend/docs/benchmark_results.json`
**Generated:** 2026-06-19
