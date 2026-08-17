import { expect, test } from '@playwright/test'

test('runs Python in a Worker', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /run python/i })).toBeEnabled({ timeout: 30_000 })
  await page.getByLabel(/python code/i).fill('print("hello")\n1 + 2')
  await page.getByRole('button', { name: /run python/i }).click()
  await expect(page.getByText('hello', { exact: true })).toBeVisible()
  await expect(page.getByText('3', { exact: true })).toBeVisible()
})

test('shows a Python exception', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /run python/i })).toBeEnabled({ timeout: 30_000 })
  await page.getByLabel(/python code/i).fill('raise ValueError("boom")')
  await page.getByRole('button', { name: /run python/i }).click()
  await expect(page.getByRole('alert')).toContainText('ValueError')
})
