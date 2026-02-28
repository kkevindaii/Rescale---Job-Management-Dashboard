import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreateJobForm from './components/CreateJobForm'
import JobList from './components/JobList'

/*
  QueryClient is TanStack Query's central cache and configuration object.
  One instance is created at the app level and shared to all components
  via QueryClientProvider — similar to React context.

  Configuration:
  - retry: 1       — retry a failed request once before surfacing an error
  - staleTime: 30s — cached data stays "fresh" for 30 seconds, preventing
                     unnecessary refetches when switching tabs or remounting
*/
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

export default function App() {
  return (
    // QueryClientProvider makes the queryClient available to every component
    // in the tree without prop drilling
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">

        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Rescale Job Dashboard
          </h1>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
          {/* Form to create a new job */}
          <CreateJobForm />

          {/* List of all jobs with status controls */}
          <JobList />
        </main>

      </div>
    </QueryClientProvider>
  )
}
