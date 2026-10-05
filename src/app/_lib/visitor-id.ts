// 방문자 식별 (`visitorId`). src/proxy.ts가 발급하고 라우트가 읽는다.
export const VISITOR_COOKIE = "visitor_id";
export const VISITOR_HEADER = "x-visitor-id";
/** 1년 */
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
