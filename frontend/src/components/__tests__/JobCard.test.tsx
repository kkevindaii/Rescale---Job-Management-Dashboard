import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import JobCard from '../JobCard'
import * as api from '../../api/jobs'
import type { Job } from '../../types'

vi.mock('../../api/jobs')

const mockJob: Job = {
  id: 1,
  name: 'Fluid Dynamics',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  current_status: 'PENDING',
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('JobCard', () => {

  it('renders the job name and current status badge', () => {
    renderWithClient(<JobCard job={mockJob} />)

    expect(screen.getByText('Fluid Dynamics')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders without a status badge when current_status is null', () => {
    renderWithClient(<JobCard job={{ ...mockJob, current_status: null }} />)

    expect(screen.getByText('Fluid Dynamics')).toBeInTheDocument()
    // 'Pending' still appears as a dropdown option — narrow to span to target the badge only
    expect(screen.queryByText('Pending', { selector: 'span' })).not.toBeInTheDocument()
  })

  it('does not show the current status as a dropdown option', () => {
    renderWithClient(<JobCard job={mockJob} />)

    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).not.toContain('Pending')
    expect(options).toContain('Running')
    expect(options).toContain('Completed')
    expect(options).toContain('Failed')
  })

  it('disables controls while a mutation is in flight', async () => {
    // Never resolves — holds the mutation in the pending state
    vi.mocked(api.deleteJob).mockReturnValue(new Promise(() => {}))

    renderWithClient(<JobCard job={mockJob} />)

    await userEvent.click(screen.getByRole('button', { name: /delete/i }))

    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled()
  })

  it('shows an error message when the status update fails', async () => {
    vi.mocked(api.updateJobStatus).mockRejectedValue(new Error('Server error'))

    renderWithClient(<JobCard job={mockJob} />)

    await userEvent.selectOptions(screen.getByRole('combobox'), 'RUNNING')

    await waitFor(() =>
      expect(screen.getByText(/failed to update status/i)).toBeInTheDocument()
    )
  })

  it('shows an error message when delete fails', async () => {
    vi.mocked(api.deleteJob).mockRejectedValue(new Error('Server error'))

    renderWithClient(<JobCard job={mockJob} />)

    await userEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() =>
      expect(screen.getByText(/failed to delete job/i)).toBeInTheDocument()
    )
  })

  it('toggles the history panel open and closed', async () => {
    vi.mocked(api.fetchJobHistory).mockResolvedValue([
      { id: 1, status_type: 'PENDING',  timestamp: '2024-01-01T00:00:00Z' },
      { id: 2, status_type: 'RUNNING',  timestamp: '2024-01-02T00:00:00Z' },
    ])

    renderWithClient(<JobCard job={mockJob} />)

    // Panel is not visible by default
    expect(screen.queryByText(/no status changes yet/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /history/i }))

    // History loaded — Running badge visible (initial PENDING is omitted).
    // Narrow to span to avoid matching the 'Running' dropdown option.
    await waitFor(() =>
      expect(screen.queryByText('Running', { selector: 'span' })).toBeInTheDocument()
    )

    await userEvent.click(screen.getByRole('button', { name: /hide history/i }))

    expect(screen.queryByText('Running', { selector: 'span' })).not.toBeInTheDocument()
  })

  it('shows "No status changes yet" when the job only has its initial PENDING status', async () => {
    vi.mocked(api.fetchJobHistory).mockResolvedValue([
      { id: 1, status_type: 'PENDING', timestamp: '2024-01-01T00:00:00Z' },
    ])

    renderWithClient(<JobCard job={mockJob} />)

    await userEvent.click(screen.getByRole('button', { name: /history/i }))

    await waitFor(() =>
      expect(screen.getByText(/no status changes yet/i)).toBeInTheDocument()
    )
  })

})
