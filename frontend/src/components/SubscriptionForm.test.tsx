import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { subscriptionApi } from '../api/endpoints'
import { subscription } from '../test/fixtures'
import SubscriptionForm from './SubscriptionForm'

vi.mock('../api/endpoints')

const onSaved = vi.fn()
const onClose = vi.fn()

function renderForm(existing?: ReturnType<typeof subscription>) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SubscriptionForm subscription={existing} currencies={['USD', 'JOD']} defaultCurrency="USD" onClose={onClose} onSaved={onSaved} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  onSaved.mockReset()
  onClose.mockReset()
  vi.mocked(subscriptionApi.list).mockResolvedValue([])
})

describe('SubscriptionForm', () => {
  it('fills in the name and category from a popular service', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: 'Spotify' }))

    expect(screen.getByLabelText('Name')).toHaveValue('Spotify')
    expect(screen.getByLabelText('Category')).toHaveValue('MUSIC')
  })

  it('creates a subscription with the price as a number and the reminder in days', async () => {
    vi.mocked(subscriptionApi.create).mockResolvedValue(subscription({ name: 'Spotify' }))
    renderForm()

    await userEvent.type(screen.getByLabelText('Name'), 'Spotify')
    await userEvent.type(screen.getByLabelText('Price'), '5.99')
    await userEvent.selectOptions(screen.getByLabelText('Currency'), 'JOD')
    await userEvent.selectOptions(screen.getByLabelText('Email reminder'), 'No reminder')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(subscriptionApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Spotify', amount: 5.99, currency: 'JOD', billingCycle: 'MONTHLY', status: 'ACTIVE', reminderDaysBefore: null }),
    )
    expect(onSaved).toHaveBeenCalledWith('Spotify')
  })

  it('starts from the existing values and updates instead of creating', async () => {
    const existing = subscription({ id: 'sub-9', name: 'JetBrains', amount: 149, billingCycle: 'YEARLY' })
    vi.mocked(subscriptionApi.update).mockResolvedValue(existing)
    renderForm(existing)

    expect(screen.getByLabelText('Name')).toHaveValue('JetBrains')
    expect(screen.getByLabelText('Billed')).toHaveValue('YEARLY')
    expect(screen.queryByRole('group', { name: 'Popular services' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(subscriptionApi.update).toHaveBeenCalledWith('sub-9', expect.objectContaining({ name: 'JetBrains', amount: 149 }))
    expect(subscriptionApi.create).not.toHaveBeenCalled()
  })

  it("shows the server's message under the field it is about and stays open", async () => {
    vi.mocked(subscriptionApi.create).mockRejectedValue(
      new ApiError(400, 'VALIDATION_FAILED', 'Some fields are invalid', { websiteUrl: 'must start with http:// or https://' }),
    )
    renderForm()

    await userEvent.type(screen.getByLabelText('Name'), 'Netflix')
    await userEvent.type(screen.getByLabelText('Price'), '15.99')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('must start with http:// or https://')).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('closes with the Escape key', async () => {
    renderForm()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
