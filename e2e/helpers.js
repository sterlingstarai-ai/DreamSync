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

export async function completeEmailOnboarding(page, options = {}) {
  const email = makeUniqueEmail(options.prefix || 'smoke');
  const password = options.password || 'password123';
  const name = options.name || '스모크테스터';

  await page.goto('/login');
  await page.getByRole('link', { name: '회원가입' }).click();

  await page.getByPlaceholder('이름 (선택)').fill(name);
  await page.getByPlaceholder('이메일').fill(email);
  await page.getByPlaceholder('비밀번호 (6자 이상)').fill(password);
  await page.getByPlaceholder('비밀번호 확인').fill(password);
  await page.getByRole('button', { name: '가입하기' }).click();

  await page.waitForURL('**/onboarding');
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByLabel('미니 체크인 컨디션').fill('4');
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '시작하기' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: '꿈 기록하기', exact: true })).toBeVisible();

  return { email, password };
}

export function makeUniqueEmail(prefix = 'e2e') {
  return `${prefix}-${Date.now()}@example.com`;
}
