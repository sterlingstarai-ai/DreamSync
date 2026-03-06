import { test, expect } from '@playwright/test';
import { completeEmailOnboarding } from './helpers';

test('post-deploy core journey @smoke', async ({ page }) => {
  await completeEmailOnboarding(page, {
    prefix: 'postdeploy',
    name: '배포스모크',
  });

  await expect(page.getByTestId('morning-brief')).toBeVisible();

  await page.getByRole('button', { name: '꿈 기록하기', exact: true }).click();
  await expect(page.getByText('어젯밤 어떤 꿈을 꾸셨나요?')).toBeVisible();
  await page
    .getByPlaceholder('꿈에서 본 것, 느낀 감정, 등장인물 등을 자유롭게 적어주세요...')
    .fill('맑은 호수 위를 천천히 걷다가 새벽빛을 만나는 꿈을 꿨다. 차분했고 가벼웠다.');
  await page.getByRole('button', { name: '저장하기' }).click();

  await expect(page.getByText('AI 분석 결과')).toBeVisible();

  await page.goto('/');
  await expect(page.getByTestId('morning-brief')).toBeVisible();
  await expect(page.getByText(/신뢰도/)).toBeVisible({ timeout: 15_000 });

  const suggestion = page.getByTestId('forecast-suggestion').first();
  await expect(suggestion).toBeVisible();
  await suggestion.click();

  await page.goto('/checkin');
  await expect(page.getByRole('heading', { name: '저녁 체크인' })).toBeVisible();

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

  await expect(page.getByText('행동 실험 회수')).toBeVisible();
  await page.getByRole('button', { name: '도움 됐어요' }).first().click();
  await page.getByRole('button', { name: /^이벤트 / }).first().click();
  await page.getByRole('button', { name: '체크인 완료' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: /저녁 체크인 완료됨/ })).toBeVisible();

  await page.goto('/report');
  await expect(page.getByText('주간 리포트')).toBeVisible();
  await expect(page.getByText('행동 실험 결과')).toBeVisible();
  await expect(page.getByText('가장 도움이 된 행동')).toBeVisible();
});
