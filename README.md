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

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/jobs/` | List jobs — paginated, filterable, sortable |
| `POST` | `/api/jobs/` | Create a job (auto-assigns PENDING status) |
| `PATCH` | `/api/jobs/<id>/` | Update job status (inserts new JobStatus row) |
| `DELETE` | `/api/jobs/<id>/` | Delete job and cascade-delete its status history |
| `GET` | `/api/jobs/<id>/history/` | Full status history for a job (oldest → newest) |
| `GET` | `/health/` | Health check — returns `{"status": "ok"}` |

**Query params for `GET /api/jobs/`:**
- `status` — filter by current status: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`
- `sort` — ordering: `newest` (default), `oldest`, `name_asc`, `name_desc`
- `page` — page number (default: 1, page size: 20)

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
- The response includes `count` (total matching jobs), `next`, `previous`, and `results`
- Filtering and sorting happen on the backend via query params:
  ```
  GET /api/jobs/?status=RUNNING&sort=name_asc&page=1
  ```
  This ensures results are always complete regardless of how many pages have been loaded
- The frontend uses TanStack Query's `useInfiniteQuery` with `filter` and `sort` in the
  query key — changing either resets to page 1 and re-fetches from the backend
- Subsequent pages load only when the user clicks "Load More"

**On cursor-based pagination:**
Page-number pagination still degrades at very large offsets because the database
scans all preceding rows to find the starting point. The correct solution at
true scale is cursor-based (keyset) pagination — using the last seen `id` or
`created_at` as a cursor makes each page fetch O(1) regardless of position.

### Database Indexes

PostgreSQL automatically creates an index on primary keys and foreign keys.
We additionally define explicit indexes in the model `Meta` classes:

- `Job`: index on `created_at` (covers newest/oldest sort), index on `name` (covers name sort)
- `JobStatus`: composite index on `(job_id, timestamp DESC)` — makes the correlated subquery
  used for status filtering fast even with a large status history per job

### At True Scale

Beyond what's implemented here, a production system at Rescale's scale would add:

- **Cursor-based pagination** — page-number pagination degrades at large offsets; keyset pagination using the last seen `id` or `created_at` as a cursor keeps every page fetch O(1)
- **Read replicas** — dashboard list queries run against a replica, freeing the primary for writes
- **Connection pooling** — PgBouncer in front of PostgreSQL to handle burst traffic without exhausting connection limits
- **Redis caching** — cache frequently-read job lists with short TTLs; invalidate on status change
- **CDN for static assets** — serve the compiled React bundle from edge nodes
- **JobStatus partitioning** — partition the status history table by time range so old data doesn't slow down queries on recent jobs

---

## Prompt Engineering Writeup

### My Role vs. the AI's Role

I used Claude Code (claude-sonnet-4-6) as an implementation accelerator, not a decision-maker. The architecture, data model, technology choices, and tradeoffs were mine to own and defend. The AI's job was to implement what I approved and explain options clearly enough for me to evaluate them.

The rule I enforced throughout: **explain the design and what alternatives exist before writing a single line of code. Wait for my approval before moving to the next section.** This kept the build incremental and meant every decision passed through my judgment first.

---

### How the Process Actually Worked

Each section followed this loop:

1. I defined the requirement or constraint ("the job list needs to handle scale — think about pagination")
2. AI explained the design options and tradeoffs for that specific problem
3. I evaluated the options and decided
4. AI implemented exactly that — nothing more
5. I reviewed the output, asked follow-up questions if anything was unclear, then moved on

This meant I could explain every decision independently before we built the next piece. The AI never got ahead of me.

---

### Key Decisions I Made (and Why)

**Separate `Job` and `JobStatus` tables (not a status field on Job)**
The AI presented both options. A single status field is simpler — but it destroys history. Rescale's real platform tracks the full lifecycle of a computation. I chose the two-table append-only design because history preservation was a core requirement, not an afterthought. This decision cascaded into everything else: the `prefetch_related` optimization, the correlated subquery for filtering, the composite index on `(job_id, timestamp DESC)`.

**Server-side filtering and sorting (not client-side)**
The naive approach filters the already-loaded page in JavaScript. That's fine for 20 jobs but wrong at scale — if you've only loaded page 1 and filter for RUNNING, you'd miss RUNNING jobs on pages 2–10. I directed the AI to move filter and sort to the backend as query params, so results are always complete regardless of pagination state.

**`useInfiniteQuery` over `useQuery`**
The AI explained both. `useQuery` would require manually tracking page state and merging results. `useInfiniteQuery` maps directly to DRF's paginated response shape and handles page merging automatically. Clear win — I approved it immediately.

**`/health/` as a separate endpoint (not reusing `/api/jobs/`)**
Healthchecks fire every 5–10 seconds. `/api/jobs/` hits the database, runs pagination, serializes data. That's wasteful for a liveness probe. I specified a dedicated endpoint that returns `{"status": "ok"}` with no DB access — the only question Docker needs answered.

**Explicit database indexes beyond Django defaults**
Django auto-indexes primary keys and foreign keys. I asked the AI what query patterns our API would run and which columns those touched. That conversation identified three gaps: `created_at` for sort, `name` for sort, and `(job_id, timestamp DESC)` for the status subquery. I approved adding those as a separate migration so they're version-controlled.

---

### Debugging — Active Reasoning, Not Guessing

Each bug was caught by running `make test`, reading the actual error output, identifying the root cause, and making one targeted fix.

- **`wget --spider` failing silently** — error pointed to the nginx container healthcheck. I looked up what wget variant Alpine Linux ships (BusyBox, not GNU wget) and confirmed `--spider` isn't supported. Fixed to `wget -O /dev/null`.
- **`wget` not found at all** — same container, next layer of the problem. Alpine's nginx image doesn't include wget. Added `RUN apk add --no-cache wget` to the frontend Dockerfile.
- **Playwright binary mismatch** — the error message explicitly said the installed package version didn't match the browser binaries. I traced it to the `^` caret in `package.json` allowing npm to resolve a newer version than the Docker image provided. Removed the caret, pinned both to `1.58.2`.
- **Django `ALLOWED_HOSTS` rejecting requests** — Playwright runs inside Docker and hits the app via the compose service name `frontend`, not `localhost`. Added `frontend` to `ALLOWED_HOSTS`. This required understanding how Docker's internal DNS works.

---

### What I'd Do Differently

The section-by-section approval loop worked well but added overhead on mechanical tasks like boilerplate wiring. In future projects I'd apply the strict approval gate only to architectural decisions and give the AI more autonomy on pure implementation work once the architecture is locked.
