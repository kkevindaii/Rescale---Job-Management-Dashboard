import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createJob } from '../api/jobs'

export default function CreateJobForm() {
  const [name, setName] = useState('')
  // Separate state for client-side validation errors vs API errors
  const [validationError, setValidationError] = useState('')

  // useQueryClient gives us access to the shared cache so we can
  // invalidate the jobs list after a successful creation
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      // Tell TanStack Query that the cached job list is stale.
      // It will automatically refetch so the new job appears in the list.
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      // Reset the form
      setName('')
      setValidationError('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validation — spec requires name cannot be empty
    if (!name.trim()) {
      setValidationError('Job name cannot be empty')
      return
    }

    setValidationError('')
    mutation.mutate({ name: name.trim() })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Job</h2>

      <form onSubmit={handleSubmit} className="flex gap-3 items-start">
        <div className="flex-1">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              // Clear validation error as soon as the user starts typing
              if (validationError) setValidationError('')
            }}
            placeholder="e.g. Fluid Dynamics Simulation"
            disabled={mutation.isPending}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />

          {/* Client-side validation error */}
          {validationError && (
            <p className="mt-1 text-sm text-red-600">{validationError}</p>
          )}

          {/* API error (e.g. network failure, server error) */}
          {mutation.isError && (
            <p className="mt-1 text-sm text-red-600">
              Failed to create job: {mutation.error.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? 'Creating...' : 'Create Job'}
        </button>
      </form>
    </div>
  )
}
