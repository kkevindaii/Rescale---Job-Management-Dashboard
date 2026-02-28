import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreateJobForm from '../CreateJobForm'
import * as api from '../../api/jobs'

vi.mock('../../api/jobs')

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

describe('CreateJobForm', () => {

  it('renders the name input and submit button', () => {
    renderWithClient(<CreateJobForm />)

    expect(screen.getByPlaceholderText(/fluid dynamics simulation/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create job/i })).toBeInTheDocument()
  })

  it('shows a validation error and does not call the API when name is empty', async () => {
    renderWithClient(<CreateJobForm />)

    await userEvent.click(screen.getByRole('button', { name: /create job/i }))

    expect(screen.getByText(/job name cannot be empty/i)).toBeInTheDocument()
    expect(api.createJob).not.toHaveBeenCalled()
  })

  it('shows a validation error for a whitespace-only name', async () => {
    renderWithClient(<CreateJobForm />)

    await userEvent.type(screen.getByPlaceholderText(/fluid dynamics simulation/i), '   ')
    await userEvent.click(screen.getByRole('button', { name: /create job/i }))

    expect(screen.getByText(/job name cannot be empty/i)).toBeInTheDocument()
    expect(api.createJob).not.toHaveBeenCalled()
  })

  it('clears the validation error when the user starts typing', async () => {
    renderWithClient(<CreateJobForm />)

    await userEvent.click(screen.getByRole('button', { name: /create job/i }))
    expect(screen.getByText(/job name cannot be empty/i)).toBeInTheDocument()

    await userEvent.type(screen.getByPlaceholderText(/fluid dynamics simulation/i), 'a')

    expect(screen.queryByText(/job name cannot be empty/i)).not.toBeInTheDocument()
  })

  it('disables the submit button while the mutation is pending', async () => {
    // Never resolves — holds the mutation in the pending state
    vi.mocked(api.createJob).mockReturnValue(new Promise(() => {}))

    renderWithClient(<CreateJobForm />)

    await userEvent.type(screen.getByPlaceholderText(/fluid dynamics simulation/i), 'Test Job')
    await userEvent.click(screen.getByRole('button', { name: /create job/i }))

    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
  })

  it('clears the input after a successful submission', async () => {
    vi.mocked(api.createJob).mockResolvedValue({
      id: 1,
      name: 'Test Job',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      current_status: 'PENDING',
    })

    renderWithClient(<CreateJobForm />)

    const input = screen.getByPlaceholderText(/fluid dynamics simulation/i)
    await userEvent.type(input, 'Test Job')
    await userEvent.click(screen.getByRole('button', { name: /create job/i }))

    await waitFor(() => expect(input).toHaveValue(''))
  })

  it('shows an error message when the API call fails', async () => {
    vi.mocked(api.createJob).mockRejectedValue(new Error('Network error'))

    renderWithClient(<CreateJobForm />)

    await userEvent.type(
      screen.getByPlaceholderText(/fluid dynamics simulation/i),
      'Test Job'
    )
    await userEvent.click(screen.getByRole('button', { name: /create job/i }))

    await waitFor(() =>
      expect(screen.getByText(/failed to create job/i)).toBeInTheDocument()
    )
  })

})
