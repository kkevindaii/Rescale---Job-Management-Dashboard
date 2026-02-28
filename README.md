# Rescale Job Management Dashboard

## Setup & Running

### Prerequisites
- `make`
- `docker`
- `docker compose` v2
- `bash`

### Commands

| Command | Description |
|---------|-------------|
| `make build` | Build all Docker images |
| `make up` | Start the full application stack |
| `make test` | Run Playwright E2E tests |
| `make stop` | Stop all running containers |
| `make clean` | Remove containers, volumes, and networks |

### Quick Start
```bash
make build
make up
# App available at http://localhost
```

---

## Time Spent
~4 hours total across planning, implementation, debugging, and optimization.

---

## Performance Considerations

### N+1 Query Problem — `prefetch_related`

The most common performance trap when listing jobs is the N+1 query problem.
The naive approach fires one extra database query per job just to get its current status:

```
SELECT * FROM jobs;                                        -- 1 query
SELECT * FROM jobstatus WHERE job_id = 1 ORDER BY ...;    -- 1 per job
SELECT * FROM jobstatus WHERE job_id = 2 ORDER BY ...;
... (N more queries for N jobs)
```

With 1,000 jobs this means 1,001 queries per page load.

We solve this with `prefetch_related('statuses')` in the list view:

```python
Job.objects.prefetch_related('statuses').all()
```

Django fetches all jobs in one query, then all their statuses in a single second
query, and maps them in Python — keeping the total at **2 queries regardless of
how many jobs exist**.

### Pagination

Returning the full job list in a single response is not viable at scale — with
millions of jobs a single `GET /api/jobs/` response could be hundreds of megabytes.

**What we implemented:**
- Server-side page-based pagination (`page_size = 20`) on `GET /api/jobs/`
- The response includes `count` (total jobs in DB), `next`, `previous`, and `results`
- The frontend uses TanStack Query's `useInfiniteQuery` to fetch pages on demand
  and merge them into a single list — subsequent pages load only when the user
  clicks "Load More"
- Filter and sort operate client-side on the loaded pages

**Known limitation of client-side filtering at scale:**
Filtering by status (e.g. "Running") only searches loaded pages, not the full
dataset. With millions of jobs and only the first page loaded, a filter for
"Running" would miss Running jobs on unloaded pages.

**Production solution:**
Move filtering and sorting to the backend as query parameters:
```
GET /api/jobs/?status=RUNNING&sort=name_asc&page=1
```
This keeps the database doing the filtering work and ensures results are always
complete regardless of how many pages have been loaded.

**On cursor-based pagination:**
Page-number pagination still degrades at very large offsets because the database
scans all preceding rows to find the starting point. The correct solution at
true scale is cursor-based (keyset) pagination — using the last seen `id` or
`created_at` as a cursor makes each page fetch O(1) regardless of position.

### Database Indexes

PostgreSQL automatically creates an index on primary keys and foreign keys.
For the `GET /api/jobs/` query pattern, the most relevant index is on
`jobstatus.job_id` (auto-created by the FK constraint) combined with
`jobstatus.timestamp DESC`, which makes the "latest status per job" lookup
fast even with a large status history.

---

## Prompt Engineering Writeup

### Approach
This project was built collaboratively with Claude Code (claude-sonnet-4-6) using a deliberate section-by-section methodology. The core rule was: **explain the design and alternatives before writing any code, then wait for approval before moving to the next section.** This ensured every decision was understood well enough to be explained independently — not just accepted and moved on from.

The workflow looked like:
1. AI explains the design choice and what alternatives exist
2. User approves or redirects
3. AI writes the code for that section only
4. Repeat

This kept the build incremental and reviewable rather than generating a large codebase in one shot.

---

### Key Prompts & Decisions

**"Set up the Django backend with DRF and PostgreSQL"**
Before writing anything, we discussed why Django over FastAPI (maturity, built-in admin, DRF's serializer + pagination ecosystem) and why PostgreSQL over SQLite (production parity inside Docker, FK constraints, proper indexing). Only after agreeing on the rationale was the code written.

**"Design the data model for jobs and statuses"**
We discussed separating `Job` and `JobStatus` into two tables (one-to-many) rather than storing status as a field on the job. The reasoning: Rescale's real platform tracks status history — a single field would lose that. This informed the `prefetch_related` optimization later.

**"Set up the React frontend with TanStack Query"**
We discussed `useInfiniteQuery` vs `useQuery` for the job list. `useInfiniteQuery` was chosen because it maps naturally to the paginated API response and gives a "Load More" UX without managing page state manually.

**"Add filtering and sorting"**
We made the explicit tradeoff of client-side filtering on loaded pages vs. backend filtering. The README documents this limitation honestly, and the production solution (backend query params) is also documented. The AI explained this tradeoff before implementing so the decision was conscious, not accidental.

**"Write the Playwright E2E tests"**
Prompted for tests that cover the two core user flows: the job list loads and displays jobs, and filtering by status works. Tests were written to be deterministic by seeding the database before each run.

**"Write the Makefile and Docker setup"**
We discussed the healthcheck chain — postgres must be healthy before django starts, django must be healthy before the test runner hits it. This prevented flaky tests caused by timing.

---

### Refinements Made

- Initial healthcheck used `wget --spider` — this fails silently in BusyBox (nginx:alpine). Changed to `wget -O /dev/null`.
- `wget` wasn't installed in the nginx:alpine image at all. Added `RUN apk add --no-cache wget` to the frontend Dockerfile.
- Playwright package version resolved to `1.58.2` but the Docker image was pinned to `1.49.0`, causing a binary mismatch. Fixed by removing the `^` caret and pinning both to `1.58.2`.
- Django's `ALLOWED_HOSTS` didn't include `frontend` — Playwright hits the app via the Docker service name `frontend` inside the compose network. Added it.

Each of these was caught by running `make test` and reading the actual error output, then making a targeted fix rather than guessing.

---

### What the AI Got Right
- The N+1 query explanation and `prefetch_related` fix were correct and well-reasoned on the first pass.
- The Docker compose healthcheck dependency chain (`depends_on: condition: service_healthy`) was set up correctly from the start.
- The infinite scroll / pagination architecture matched TanStack Query v5's API without needing iteration.

### What the AI Got Wrong & Fixes
- **BusyBox wget flags** — `wget --spider` is a GNU wget flag not available in Alpine's BusyBox wget. The AI used it without flagging the Alpine incompatibility. Fixed manually after the container failed.
- **Playwright version pinning** — the AI initially used a `^` caret on the Playwright npm package, allowing it to resolve to a newer version than the Docker image provided. This caused a runtime binary mismatch. Fixed by pinning both to the same exact version.
- **ALLOWED_HOSTS** — the AI set `ALLOWED_HOSTS` for external browser access but missed that Playwright inside Docker accesses the app via the compose service name `frontend`, which also needs to be whitelisted.
