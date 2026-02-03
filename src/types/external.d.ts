/**
 * Type stubs for not-yet-installed dependencies
 * Phase 2에서 실제 패키지 설치 후 제거
 */

declare module 'mixpanel-browser' {
  const mixpanel: any;
  export default mixpanel;
}

declare module '@sentry/react' {
  export function init(options: any): void;
  export function captureException(error: any): void;
  export function captureMessage(message: string): void;
  export function setUser(user: any): void;
  export function addBreadcrumb(breadcrumb: any): void;
}

declare module '@supabase/supabase-js' {
  export function createClient(url: string, key: string, options?: any): any;
}
