import { expect } from '@playwright/test';

export async function completeGuestOnboarding(page) {
  await page.goto('/login');
  await page.getByRole('button', { name: '게스트로 시작하기' }).click();

  await page.waitForURL('**/onboarding', { timeout: 10_000 }).catch(() => {});
  if (page.url().includes('/onboarding')) {
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '시작하기' }).click();
  }

  await expect(page.getByRole('button', { name: '꿈 기록하기', exact: true })).toBeVisible();
}

export function makeUniqueEmail(prefix = 'e2e') {
  return `${prefix}-${Date.now()}@example.com`;
}
