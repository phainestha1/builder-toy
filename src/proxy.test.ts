import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { VISITOR_COOKIE, VISITOR_HEADER } from "./app/_lib/visitor-id";
import { proxy } from "./proxy";

/** NextResponse.next({ request: { headers } })가 라우트에 넘기는 요청 헤더 */
const forwarded = (response: Response, key: string) => response.headers.get(`x-middleware-request-${key}`);

describe("visitorId 발급 (proxy)", () => {
  it("쿠키가 없으면 UUID를 만들어 응답 쿠키와 요청 헤더에 같은 값을 넣는다 (첫 요청에서도 같은 값)", () => {
    const response = proxy(new NextRequest("http://localhost/"));

    const cookie = response.cookies.get(VISITOR_COOKIE)?.value;
    expect(cookie).toMatch(/^[0-9a-f-]{36}$/);
    expect(forwarded(response, VISITOR_HEADER)).toBe(cookie);
  });

  it("쿠키가 있으면 새로 만들지 않고 그 값을 요청 헤더로 넘긴다", () => {
    const request = new NextRequest("http://localhost/plans", { headers: { cookie: `${VISITOR_COOKIE}=v-1` } });
    const response = proxy(request);

    expect(response.cookies.get(VISITOR_COOKIE)).toBeUndefined();
    expect(forwarded(response, VISITOR_HEADER)).toBe("v-1");
  });

  it("고객이 보낸 visitorId 헤더는 믿지 않고 쿠키 값으로 덮어쓴다", () => {
    const request = new NextRequest("http://localhost/", {
      headers: { cookie: `${VISITOR_COOKIE}=v-1`, [VISITOR_HEADER]: "spoofed" },
    });

    expect(forwarded(proxy(request), VISITOR_HEADER)).toBe("v-1");
  });
});
