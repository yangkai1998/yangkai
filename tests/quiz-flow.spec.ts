import { expect, test } from '@playwright/test'

test('completes the mobile quiz and exports a result card', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await expect(page.getByRole('heading', { name: /谁与你同频/ })).toBeVisible()
  await page.getByLabel('体验码').fill('WRONG-CODE')
  await page.getByRole('button', { name: '启封' }).click()
  await expect(page.getByText('体验码不正确，请检查后重试')).toBeVisible()

  await page.getByLabel('体验码').fill('SHIGUANG')
  await page.getByRole('button', { name: '启封' }).click()
  await expect(page.getByRole('button', { name: /开始寻迹/ })).toBeVisible()
  await page.getByRole('button', { name: /开始寻迹/ }).click()

  await expect(page.getByText('01 / 24')).toBeVisible()
  for (let index = 0; index < 3; index += 1) {
    await page.locator('.answers-grid button').first().click()
    await page.waitForTimeout(390)
  }
  await expect(page.getByText('04 / 24')).toBeVisible()

  await page.getByRole('button', { name: '返回上一题' }).click()
  await expect(page.getByText('03 / 24')).toBeVisible()
  await page.locator('.answers-grid button').first().click()
  await page.waitForTimeout(390)

  for (let index = 0; index < 21; index += 1) {
    await page.locator('.answers-grid button').first().click()
    await page.waitForTimeout(390)
  }

  await expect(page.getByText('与你同频的历史人物是')).toBeVisible()
  await expect(page.locator('.share-card')).toBeVisible()
  await expect(page.locator('.radar')).toBeVisible()
  await expect(page.getByText('你的第二同频人物')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '保存结果卡' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^拾光人物志-.+\.png$/)

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)

  await page.getByRole('button', { name: /重新寻迹/ }).click()
  await expect(page.getByText('01 / 24')).toBeVisible()
})

test('renders the desktop entry without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await expect(page.getByRole('heading', { name: /谁与你同频/ })).toBeVisible()
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})
