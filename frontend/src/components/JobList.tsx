import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchJobs } from '../api/jobs'
import { type StatusType, ALL_STATUSES, STATUS_LABELS } from '../types'
import JobCard from './JobCard'

type FilterValue = 'ALL' | StatusType
type SortValue = 'newest' | 'oldest' | 'name_asc' | 'name_desc'

const SORT_LABELS: Record<SortValue, string> = {
  newest:    'Newest first',
  oldest:    'Oldest first',
  name_asc:  'Name A–Z',
  name_desc: 'Name Z–A',
}

export default function JobList() {
  const [filter, setFilter] = useState<FilterValue>('ALL')
  const [sort, setSort]     = useState<SortValue>('newest')

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
    // Start at page 1 — TanStack Query passes this as pageParam on first fetch
    initialPageParam: 1,
    // Called after each page loads to determine the next pageParam.
    // Extracts the page number from DRF's 'next' URL so we never hardcode
    // host/port in the frontend (the full URL points to the backend container).
    // Returns undefined when 'next' is null, which sets hasNextPage to false.
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined
      return Number(new URL(lastPage.next).searchParams.get('page'))
    },
  })

  // Flatten all loaded pages into a single array for filtering and rendering
  const jobs = data?.pages.flatMap((page) => page.results) ?? []
  // Total count comes from the first page — DRF always returns the full count
  const totalCount = data?.pages[0]?.count ?? 0

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Loading jobs...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        Failed to load jobs: {error.message}
      </div>
    )
  }

  if (!jobs?.length) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        No jobs yet. Create one above.
      </div>
    )
  }

  // Apply filter then sort entirely in memory — the full list is already cached
  const filtered = filter === 'ALL'
    ? jobs
    : jobs.filter((j) => j.current_status === filter)

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'oldest':    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'name_asc':  return a.name.localeCompare(b.name)
      case 'name_desc': return b.name.localeCompare(a.name)
      default:          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  return (
    <div className="space-y-3">

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {filter !== 'ALL'
            ? `Jobs (${filtered.length} ${STATUS_LABELS[filter as StatusType]} of ${jobs.length.toLocaleString()} loaded)`
            : `Jobs (${jobs.length.toLocaleString()} of ${totalCount.toLocaleString()})`
          }
        </h2>

        <div className="flex items-center gap-2">
          {/* Status filter tabs */}
          <div className="flex rounded-md border border-gray-200 overflow-hidden text-sm">
            {(['ALL', ...ALL_STATUSES] as FilterValue[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f === 'ALL' ? 'All' : STATUS_LABELS[f]}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortValue)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(Object.keys(SORT_LABELS) as SortValue[]).map((s) => (
              <option key={s} value={s}>{SORT_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty state for active filter */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No jobs with status "{STATUS_LABELS[filter as StatusType]}".
        </div>
      ) : (
        sorted.map((job) => <JobCard key={job.id} job={job} />)
      )}

      {/* Load More — only shown when more pages exist on the server */}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isFetchingNextPage ? 'Loading...' : `Load more (${(totalCount - jobs.length).toLocaleString()} remaining)`}
        </button>
      )}

    </div>
  )
}
