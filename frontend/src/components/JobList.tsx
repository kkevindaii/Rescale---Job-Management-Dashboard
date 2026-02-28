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
    // filter and sort are part of the key — changing either resets to page 1
    // and triggers a fresh fetch with the new params
    queryKey: ['jobs', filter, sort],
    queryFn: ({ pageParam }) => fetchJobs({ pageParam, filter, sort }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined
      return Number(new URL(lastPage.next).searchParams.get('page'))
    },
  })

  // Flatten pages — results are already filtered and sorted by the backend
  const jobs = data?.pages.flatMap((page) => page.results) ?? []
  // count reflects the total matching the current filter (not total jobs in DB)
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

  return (
    <div className="space-y-3">

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {filter !== 'ALL'
            ? `Jobs (${jobs.length.toLocaleString()} ${STATUS_LABELS[filter as StatusType]} of ${totalCount.toLocaleString()})`
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

      {/* Job list or empty states */}
      {jobs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {filter === 'ALL'
            ? 'No jobs yet. Create one above.'
            : `No jobs with status "${STATUS_LABELS[filter as StatusType]}".`
          }
        </div>
      ) : (
        jobs.map((job) => <JobCard key={job.id} job={job} />)
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
