import { NextResponse, type NextRequest } from "next/server";
import { VISITOR_COOKIE, VISITOR_COOKIE_MAX_AGE, VISITOR_HEADER } from "./app/_lib/visitor-id";

/**
 * 고객 경로에서 `visitorId`를 발급한다. 서버 컴포넌트는 쿠키를 쓸 수 없어서 여기서 정한다.
 * 쿠키가 없으면 UUID를 만들어 응답 쿠키와 요청 헤더에 함께 넣어, 첫 요청의 라우트도 같은 값을 읽게 한다.
 */
export function proxy(request: NextRequest) {
  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = existing ?? crypto.randomUUID();

  const headers = new Headers(request.headers);
  headers.set(VISITOR_HEADER, visitorId);
  const response = NextResponse.next({ request: { headers } });

  if (!existing) {
    response.cookies.set({
      name: VISITOR_COOKIE,
      value: visitorId,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: VISITOR_COOKIE_MAX_AGE,
    });
  }
  return response;
}

export const config = {
  // 어드민, 로그인 API, 정적 파일은 뺀다
  matcher: ["/((?!admin|api/auth|_next/static|_next/image|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
