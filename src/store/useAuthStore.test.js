/**
 * useAuthStore 테스트
 */
import { describe, it, expect, beforeEach } from 'vitest';
import useAuthStore from './useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('should start unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('should sign up a new user', async () => {
    const result = await useAuthStore.getState().signUp({
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.name).toBe('Test User');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user.email).toBe('test@example.com');
  });

  it('should use email prefix as name when name not provided', async () => {
    const result = await useAuthStore.getState().signUp({
      email: 'john@example.com',
    });

    expect(result.user.name).toBe('john');
  });

  it('should sign in with existing user', async () => {
    // First sign up
    await useAuthStore.getState().signUp({
      email: 'test@example.com',
      name: 'Test',
    });

    // Sign out
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    // Sign in with same email
    const result = await useAuthStore.getState().signIn({
      email: 'test@example.com',
    });

    expect(result.success).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user.name).toBe('Test');
  });

  it('should sign out', async () => {
    await useAuthStore.getState().signUp({
      email: 'test@example.com',
    });

    const result = await useAuthStore.getState().signOut();
    expect(result.success).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    // User data is kept for next login
    expect(useAuthStore.getState().user).not.toBeNull();
  });

  it('should update user info', async () => {
    await useAuthStore.getState().signUp({
      email: 'test@example.com',
      name: 'Old Name',
    });

    useAuthStore.getState().updateUser({ name: 'New Name' });
    expect(useAuthStore.getState().user.name).toBe('New Name');
  });

  it('should not update user when not authenticated', () => {
    useAuthStore.getState().updateUser({ name: 'Ghost' });
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('should update settings', async () => {
    await useAuthStore.getState().signUp({
      email: 'test@example.com',
    });

    useAuthStore.getState().updateSettings({ theme: 'light' });
    expect(useAuthStore.getState().user.settings.theme).toBe('light');
    // Other settings preserved
    expect(useAuthStore.getState().user.settings.language).toBe('ko');
  });

  it('should complete onboarding', async () => {
    await useAuthStore.getState().signUp({
      email: 'test@example.com',
    });

    expect(useAuthStore.getState().user.onboardingCompleted).toBe(false);

    useAuthStore.getState().completeOnboarding();
    expect(useAuthStore.getState().user.onboardingCompleted).toBe(true);
  });

  it('should generate unique user IDs', async () => {
    const result1 = await useAuthStore.getState().signUp({
      email: 'user1@example.com',
    });

    useAuthStore.getState().reset();

    const result2 = await useAuthStore.getState().signUp({
      email: 'user2@example.com',
    });

    expect(result1.user.id).not.toBe(result2.user.id);
  });

  it('should reset state', async () => {
    await useAuthStore.getState().signUp({
      email: 'test@example.com',
    });

    useAuthStore.getState().reset();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
