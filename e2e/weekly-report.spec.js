import { test, expect } from '@playwright/test';
import { completeGuestOnboarding } from './helpers';

test('주간 리포트에서 핵심 인사이트를 확인할 수 있다', async ({ page }) => {
  await completeGuestOnboarding(page);

  await page.goto('/report');
  await expect(page.getByText('주간 리포트')).toBeVisible();
  await expect(page.getByText('일별 컨디션')).toBeVisible();
  await expect(page.getByText('주요 감정')).toBeVisible();
});
