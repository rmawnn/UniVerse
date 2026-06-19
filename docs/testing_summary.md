# UniVerse V2 — Testing Summary

## Test Counts

| Category          | Count |
|-------------------|-------|
| **Total tests**   | 739   |
| **Unit tests**    | 699   |
| **Integration tests** | 40 |

## Coverage

| Metric            | Value  |
|-------------------|--------|
| **Total lines**   | 6,868  |
| **Covered lines** | 4,092  |
| **Uncovered lines** | 2,776 |
| **Coverage %**    | **60%** |

### Coverage by Module (Services)

| Module                     | Coverage |
|----------------------------|----------|
| categorization_service     | 100%     |
| domain_validation_service  | 100%     |
| follow_service             | 100%     |
| notification_service       | 100%     |
| post_like_service          | 100%     |
| repost_service             | 100%     |
| story_service              | 100%     |
| university_service         | 100%     |
| password_reset_service     | 98%      |
| auth_service               | 83%      |
| report_service             | 79%      |
| saved_collection_service   | 76%      |
| search_service             | 75%      |
| conversation_service       | 71%      |
| community_service          | 68%      |
| comment_service            | 67%      |
| saved_post_service         | 67%      |
| user_service               | 64%      |
| message_service            | 62%      |
| explore_service            | 59%      |
| comment_service            | 67%      |
| job_service                | 53%      |
| feed_service               | 42%      |
| post_service               | 41%      |
| job_matching_service       | 37%      |
| verification_service       | 35%      |

## How to Run

```bash
# Run all tests
cd backend
pytest

# Run unit tests only
pytest tests/unit/

# Run with coverage report (terminal)
pytest --cov=app --cov-report=term-missing

# Run with coverage report (HTML)
pytest --cov=app --cov-report=term-missing --cov-report=html

# Open HTML report
# Open backend/htmlcov/index.html in a browser
```

## Test Structure

```
backend/tests/
  unit/
    conftest.py                  # Shared fixtures (mock_db, sample_user)
    test_recommendation.py       # Scoring engine pure functions (24 tests)
    test_ws_manager.py           # WebSocket manager tests
    repositories/                # Repository-layer unit tests
      test_base_repo.py
      test_comment_repo.py
      test_community_repo.py
      test_follow_repo.py
      test_job_repo.py
      test_message_repo.py
      test_notification_repo.py
      test_password_reset_repo.py
      test_post_like_repo.py
      test_post_repo.py
      test_report_repo.py
      test_repost_repo.py
      test_saved_post_repo.py
      test_story_repo.py
      test_university_repo.py
      test_user_repo.py
      test_verification_repo.py
    services/                    # Service-layer unit tests
      test_admin_service.py
      test_auth_service.py
      test_comment_service.py
      test_community_service.py
      test_conversation_service.py
      test_explore_service.py
      test_feed_service.py
      test_follow_service.py
      test_job_matching_helpers.py
      test_job_service.py
      test_message_service.py
      test_notification_service.py
      test_notification_notify.py
      test_post_service.py
      test_report_service.py
      test_saved_collection_service.py
      test_saved_post_service.py
      test_search_service.py
      test_story_service.py
      test_user_service.py
      ... (and extended test files)
  integration/                   # Integration tests (require database)
```

## Screenshots

### Coverage HTML Report
<!-- Screenshot: backend/htmlcov/index.html overview -->

### Terminal Coverage Output
<!-- Screenshot: pytest --cov=app --cov-report=term-missing output -->
