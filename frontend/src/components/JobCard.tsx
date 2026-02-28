import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { updateJobStatus, deleteJob, fetchJobHistory } from '../api/jobs'
import { type Job, type StatusType, ALL_STATUSES, STATUS_LABELS } from '../types'

/*
  Tailwind classes for each status badge.
  Defined as a full mapping (not string interpolation) so Tailwind's build-time
  scanner can detect all class names and include them in the CSS bundle.
  Using dynamic strings like `bg-${color}-100` would cause classes to be purged.
*/
const STATUS_COLORS: Record<StatusType, string> = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  RUNNING:   'bg-blue-100   text-blue-800',
  COMPLETED: 'bg-green-100  text-green-800',
  FAILED:    'bg-red-100    text-red-800',
}

interface JobCardProps {
  job: Job
}

export default function JobCard({ job }: JobCardProps) {
  const queryClient = useQueryClient()
  const [showHistory, setShowHistory] = useState(false)

  // Only fetches when the user opens the history panel (enabled: showHistory).
  // The result is cached under ['jobs', job.id, 'history'] so subsequent
  // toggles don't re-fetch unless the cache is invalidated.
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['jobs', job.id, 'history'],
    queryFn: () => fetchJobHistory(job.id),
    enabled: showHistory,
  })

  // Mutation for changing the job's status
  const updateMutation = useMutation({
    mutationFn: (status_type: StatusType) => updateJobStatus(job.id, { status_type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })

  // Mutation for deleting the job
  const deleteMutation = useMutation({
    mutationFn: () => deleteJob(job.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateMutation.mutate(e.target.value as StatusType)
  }

  // Disable controls while any mutation is in flight
  const isLoading = updateMutation.isPending || deleteMutation.isPending

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">

      <div className="flex items-center justify-between gap-4">

        {/* Left: job name + status badge */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-medium text-gray-900 truncate">{job.name}</span>

          {job.current_status && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[job.current_status]}`}>
              {STATUS_LABELS[job.current_status]}
            </span>
          )}
        </div>

        {/* Right: status dropdown + delete button */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Status selector — fires PATCH on change.
              value is always "" so the dropdown resets to the placeholder
              after each selection. The badge shows the current status. */}
          <select
            value=""
            onChange={handleStatusChange}
            disabled={isLoading}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="" disabled>Change status...</option>
            {/* Only show statuses the job isn't already in */}
            {ALL_STATUSES.filter((s) => s !== job.current_status).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          {/* History toggle */}
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
          >
            {showHistory ? 'Hide History' : 'History'}
          </button>

          {/* Delete button — fires DELETE */}
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>

        </div>
      </div>

      {/* Inline error messages for failed mutations */}
      {updateMutation.isError && (
        <p className="mt-2 text-sm text-red-600">
          Failed to update status: {updateMutation.error.message}
        </p>
      )}
      {deleteMutation.isError && (
        <p className="mt-2 text-sm text-red-600">
          Failed to delete job: {deleteMutation.error.message}
        </p>
      )}

      {/* Status history panel — only rendered when toggled open */}
      {showHistory && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {historyLoading ? (
            <p className="text-sm text-gray-400">Loading history...</p>
          ) : history && history.slice(1).length > 0 ? (
            <ol className="space-y-1">
              {[...history].slice(1).reverse().map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 text-sm">
                  <span className="text-gray-400 tabular-nums">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[entry.status_type]}`}>
                    {STATUS_LABELS[entry.status_type]}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-400">No status changes yet.</p>
          )}
        </div>
      )}

    </div>
  )
}
