/**
 * 환경 기반 로거
 * DEV 모드에서만 콘솔 출력, 프로덕션에서는 무시
 */
const isDev = import.meta.env.DEV;

const noop = () => {};

const logger = {
  log: isDev ? console.log.bind(console) : noop,
  warn: isDev ? console.warn.bind(console) : noop,
  error: isDev ? console.error.bind(console) : noop,
  info: isDev ? console.info.bind(console) : noop,
};

export default logger;
