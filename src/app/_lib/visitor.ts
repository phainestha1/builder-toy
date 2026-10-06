import { cookies, headers } from "next/headers";
import { VISITOR_COOKIE, VISITOR_HEADER } from "./visitor-id";

/** 라우트와 서버 액션의 `visitorId`. proxy가 넣은 요청 헤더 → 쿠키 순으로 읽는다 */
export async function getVisitorId(): Promise<string> {
  const fromHeader = (await headers()).get(VISITOR_HEADER);
  if (fromHeader) return fromHeader;
  const fromCookie = (await cookies()).get(VISITOR_COOKIE)?.value;
  if (fromCookie) return fromCookie;
  // proxy matcher 밖에서 불린 경우. 저장하지 않는 일회용 값이라 배정은 이어지지 않는다
  return crypto.randomUUID();
}
