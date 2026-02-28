/*
  Central type definitions for the Rescale Job Dashboard.

  These interfaces mirror the shape of the Django API responses exactly.
  Keeping them here means there's one place to update if the API changes.
*/

/** The four valid job status values — matches JobStatus.StatusType on the backend */
export type StatusType = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

/**
 * A job as returned by GET /api/jobs/ and POST /api/jobs/
 * current_status is derived from the latest JobStatus entry on the backend.
 */
export interface Job {
  id: number
  name: string
  created_at: string   // ISO 8601 datetime string from Django
  updated_at: string
  current_status: StatusType | null  // null only if a job somehow has no status rows
}

/**
 * Wrapper returned by paginated list endpoints.
 * count   — total records in the database (all pages combined)
 * next    — URL of the next page, or null if this is the last page
 * previous — URL of the previous page, or null if this is the first page
 * results — the items for this page
 */
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** Request body for POST /api/jobs/ */
export interface CreateJobPayload {
  name: string
}

/** Request body for PATCH /api/jobs/<id>/ */
export interface UpdateJobStatusPayload {
  status_type: StatusType
}

/** A single entry from GET /api/jobs/<id>/history/ */
export interface JobStatusEntry {
  id: number
  status_type: StatusType
  timestamp: string  // ISO 8601 datetime string
}

/**
 * All valid statuses as an ordered array.
 * Used by the status dropdown so values aren't hardcoded in components.
 */
export const ALL_STATUSES: StatusType[] = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']

/**
 * Human-readable labels for each status value.
 * The backend stores 'PENDING' etc. — these are for display only.
 */
export const STATUS_LABELS: Record<StatusType, string> = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
}
