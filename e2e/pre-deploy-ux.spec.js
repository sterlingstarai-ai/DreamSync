import { test, expect } from '@playwright/test';
import { completeEmailOnboarding } from './helpers';

test('pre-deploy UX checklist @ux', async ({ page }) => {
  await completeEmailOnboarding(page, {
    prefix: 'uxpreflight',
    name: 'UX 프리플라이트',
  });

  await page.getByRole('button', { name: '리포트' }).click();
  await expect(page).toHaveURL(/\/report$/);
  await expect(page.getByRole('heading', { name: '주간 리포트' })).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);

  await page.getByRole('button', { name: '설정' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(4);

  await page.goto('/search');
  await expect(page.getByRole('heading', { name: '통합 검색' })).toBeVisible();
  await expect(page.locator('select')).toHaveCount(3);

  const optionCounts = await Promise.all(
    [0, 1, 2].map((index) => page.locator('select').nth(index).locator('option').count()),
  );
  expect(optionCounts[1]).toBeGreaterThan(1);
  expect(optionCounts[2]).toBeGreaterThan(1);

  await page.goto('/settings');
  await page.getByRole('button', { name: '개발자 모드' }).click();
  await expect(page.getByRole('heading', { name: '개발자 모드' })).toBeVisible();

  const modalState = await page.evaluate(() => ({
    bodyOverflow: document.body.style.overflow,
  }));
  expect(modalState.bodyOverflow).toBe('hidden');

  const layerStyles = await page.evaluate(() => {
    const modalOverlay = document.querySelector('.modal-overlay');
    const bottomNav = document.querySelector('nav[aria-label="메인 내비게이션"]');

    return {
      modalBackdropFilter: modalOverlay ? getComputedStyle(modalOverlay).backdropFilter : 'none',
      modalZIndex: modalOverlay ? Number(getComputedStyle(modalOverlay).zIndex || 0) : 0,
      bottomNavZIndex: bottomNav ? Number(getComputedStyle(bottomNav).zIndex || 0) : 0,
    };
  });

  expect(layerStyles.modalBackdropFilter).not.toBe('none');
  expect(layerStyles.modalZIndex).toBeGreaterThan(layerStyles.bottomNavZIndex);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: '개발자 모드' })).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const bottomSpacing = await page.evaluate(() => {
    const logoutButton = Array.from(document.querySelectorAll('button'))
      .find((element) => element.textContent?.includes('로그아웃'));
    const bottomNav = document.querySelector('nav[aria-label="메인 내비게이션"]');

    if (!logoutButton || !bottomNav) return null;

    const logoutRect = logoutButton.getBoundingClientRect();
    const navRect = bottomNav.getBoundingClientRect();

    return {
      gap: navRect.top - logoutRect.bottom,
      logoutBottom: logoutRect.bottom,
      navTop: navRect.top,
    };
  });

  expect(bottomSpacing).not.toBeNull();
  expect(bottomSpacing.gap).toBeGreaterThanOrEqual(12);
});
