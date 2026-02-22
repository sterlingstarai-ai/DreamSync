import { test, expect } from '@playwright/test';
import { completeGuestOnboarding } from './helpers';

test('꿈 기록 후 AI 분석 결과가 표시된다', async ({ page }) => {
  await completeGuestOnboarding(page);

  await page.getByRole('button', { name: '꿈 기록하기', exact: true }).click();
  await expect(page.getByText('어젯밤 어떤 꿈을 꾸셨나요?')).toBeVisible();

  await page
    .getByPlaceholder('꿈에서 본 것, 느낀 감정, 등장인물 등을 자유롭게 적어주세요...')
    .fill('바다에서 수영하며 돌고래를 만나는 꿈을 꿨다. 평온하고 자유로웠다.');
  await page.getByRole('button', { name: '저장하기' }).click();

  await expect(page.getByText('AI 분석 결과')).toBeVisible();
  await expect(page.getByText('발견된 심볼')).toBeVisible();
});
