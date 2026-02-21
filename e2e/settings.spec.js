import { test, expect } from '@playwright/test';
import { completeGuestOnboarding } from './helpers';

test('설정에서 알림 시간/프라이버시 토글을 변경할 수 있다', async ({ page }) => {
  await completeGuestOnboarding(page);

  await page.goto('/settings');
  await expect(page.getByText('알림 활성화')).toBeVisible();

  await page.getByRole('switch', { name: '아침 꿈 기록 알림' }).click();
  await expect(page.getByRole('switch', { name: '아침 꿈 기록 알림' })).toHaveAttribute('aria-checked', 'false');

  await page.getByRole('switch', { name: '아침 꿈 기록 알림' }).click();
  await expect(page.getByRole('switch', { name: '아침 꿈 기록 알림' })).toHaveAttribute('aria-checked', 'true');

  await page.getByLabel('아침 알림 시간').fill('06:30');
  await expect(page.getByLabel('아침 알림 시간')).toHaveValue('06:30');

  await page.getByRole('switch', { name: '사용 데이터 분석' }).click();
  await expect(page.getByRole('switch', { name: '사용 데이터 분석' })).toHaveAttribute('aria-checked', 'false');
});
