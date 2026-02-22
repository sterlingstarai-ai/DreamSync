import { test, expect } from '@playwright/test';
import { completeGuestOnboarding } from './helpers';

test('체크인 핵심 플로우를 완료하고 대시보드로 복귀한다', async ({ page }) => {
  await completeGuestOnboarding(page);

  await page.goto('/checkin');
  await expect(page.getByRole('heading', { name: '저녁 체크인' })).toBeVisible();
  await expect(page.getByText('오늘 컨디션은 어땠나요?')).toBeVisible();

  await page.getByRole('radio', { name: '컨디션 좋음' }).click();
  await page.getByRole('button', { name: '다음' }).click();

  await page.getByRole('button', { name: /^감정 / }).first().click();
  await page.getByRole('button', { name: '다음' }).click();

  await page.getByRole('radio', { name: '스트레스 보통 (3/5)' }).click();
  await page.getByRole('button', { name: '다음' }).click();

  const sleepQuestion = page.getByText('어젯밤 수면은 어땠나요?');
  if (await sleepQuestion.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: '다음' }).click();
  }

  await page.getByRole('button', { name: /^이벤트 / }).first().click();
  await page.getByRole('button', { name: '체크인 완료' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('저녁 체크인')).toBeVisible();
});
