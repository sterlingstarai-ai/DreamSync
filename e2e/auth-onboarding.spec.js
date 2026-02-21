import { test, expect } from '@playwright/test';
import { makeUniqueEmail } from './helpers';

test('회원가입 후 4단계 온보딩을 완료하고 대시보드로 이동한다', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: '회원가입' }).click();

  const email = makeUniqueEmail('signup');
  await page.getByPlaceholder('이름 (선택)').fill('온보딩테스터');
  await page.getByPlaceholder('이메일').fill(email);
  await page.getByPlaceholder('비밀번호 (6자 이상)').fill('password123');
  await page.getByPlaceholder('비밀번호 확인').fill('password123');
  await page.getByRole('button', { name: '가입하기' }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByText('"꿈이 알려주는 내일의 나"')).toBeVisible();

  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByText('미니 체크인 체험')).toBeVisible();
  await page.getByLabel('미니 체크인 컨디션').fill('4');

  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByText('알림을 설정할까요?')).toBeVisible();

  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByText('주간 목표 선택')).toBeVisible();

  await page.getByRole('button', { name: '시작하기' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: '꿈 기록하기', exact: true })).toBeVisible();
});
