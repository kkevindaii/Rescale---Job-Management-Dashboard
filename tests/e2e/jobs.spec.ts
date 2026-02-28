import { test, expect } from '@playwright/test'

test.describe('Job Management Dashboard', () => {

  test('creates a new job and displays it with PENDING status', async ({ page }) => {
    await page.goto('/')

    // Use a unique name so this test doesn't collide with other runs
    const jobName = `Test Job ${Date.now()}`

    await page.getByPlaceholder('e.g. Fluid Dynamics Simulation').fill(jobName)
    await page.getByRole('button', { name: 'Create Job' }).click()

    // Find the card that contains the new job name
    const jobCard = page.locator('.rounded-lg.border').filter({ hasText: jobName })
    await expect(jobCard).toBeVisible({ timeout: 10_000 })

    // New jobs must start with PENDING status per the spec
    await expect(jobCard.locator('.rounded-full')).toHaveText('Pending')
  })

  test('updates a job status and reflects the change', async ({ page }) => {
    await page.goto('/')

    const jobName = `Status Test ${Date.now()}`

    // Create a job first
    await page.getByPlaceholder('e.g. Fluid Dynamics Simulation').fill(jobName)
    await page.getByRole('button', { name: 'Create Job' }).click()

    const jobCard = page.locator('.rounded-lg.border').filter({ hasText: jobName })
    await expect(jobCard).toBeVisible({ timeout: 10_000 })

    // Change status to Running via the dropdown
    await jobCard.locator('select').selectOption('RUNNING')

    // Badge should update to reflect the new status
    await expect(jobCard.locator('.rounded-full')).toHaveText('Running', { timeout: 10_000 })
  })

})
