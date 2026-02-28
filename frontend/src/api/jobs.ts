/*
  API layer for the Rescale Job Dashboard.

  All fetch calls live here. Components import these functions and pass them
  to TanStack Query — they never call fetch directly. This keeps the network
  logic decoupled from the UI and easy to test or swap out.

  All URLs are relative (/api/...) so they work with:
    - Vite's dev proxy  (vite.config.ts  → localhost:8000)
    - nginx proxy       (nginx.conf      → backend:8000)
*/
import type { Job, JobStatusEntry, PaginatedResponse, CreateJobPayload, UpdateJobStatusPayload } from '../types'

const BASE = '/api'

/**
 * Shared response handler for endpoints that return a JSON body.
 *
 * Throws an Error with a descriptive message on any non-2xx response so
 * TanStack Query can surface it via the `error` state in components.
 */
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    // Try to extract the error message from the response body.
    // Fall back to a generic message if the body isn't valid JSON.
    const body = await res.json().catch(() => null)
    const message = body?.error ?? body?.detail ?? `Request failed with status ${res.status}`
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

/**
 * GET /api/jobs/?page=N&sort=newest&status=RUNNING
 * Called by useInfiniteQuery. filter/sort are passed from JobList component state
 * so the backend handles filtering and ordering rather than the frontend.
 */
export async function fetchJobs(
  { pageParam, filter, sort }: { pageParam: number; filter: string; sort: string }
): Promise<PaginatedResponse<Job>> {
  const params = new URLSearchParams({ page: String(pageParam), sort })
  if (filter !== 'ALL') params.set('status', filter)
  const res = await fetch(`${BASE}/jobs/?${params}`)
  return handleResponse<PaginatedResponse<Job>>(res)
}

/** POST /api/jobs/ — create a new job, backend auto-assigns PENDING status */
export async function createJob(payload: CreateJobPayload): Promise<Job> {
  const res = await fetch(`${BASE}/jobs/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<Job>(res)
}

/**
 * PATCH /api/jobs/<id>/ — update a job's status.
 * The backend creates a new JobStatus row rather than updating in place.
 */
export async function updateJobStatus(id: number, payload: UpdateJobStatusPayload): Promise<Job> {
  const res = await fetch(`${BASE}/jobs/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<Job>(res)
}

/** GET /api/jobs/<id>/history/ — fetch the full status history for a job, oldest first */
export async function fetchJobHistory(id: number): Promise<JobStatusEntry[]> {
  const res = await fetch(`${BASE}/jobs/${id}/history/`)
  return handleResponse<JobStatusEntry[]>(res)
}

/**
 * DELETE /api/jobs/<id>/ — delete a job and all its status history.
 * Returns void because the backend responds with 204 No Content (no body).
 */
export async function deleteJob(id: number): Promise<void> {
  const res = await fetch(`${BASE}/jobs/${id}/`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = body?.error ?? body?.detail ?? `Delete failed with status ${res.status}`
    throw new Error(message)
  }
}
