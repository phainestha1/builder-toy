import Link from "next/link";
import { experiment } from "@/composition";
import { getVisitorId } from "./_lib/visitor";

// 데모 문구 (screens.md 01). 배정이 제외면 A안을 보여 준다 (E2)
const HEADLINES = {
  A: "최대 45만 원 받아요",
  B: "위약금까지 보전해 드려요",
} as const;

export default async function LandingPage() {
  const visitorId = await getVisitorId();
  const variant = await experiment.ensureAssignment({ visitorId, screen: "Landing" });
  await experiment.recordExposure({ visitorId });
  const headline = HEADLINES[variant === "B" ? "B" : "A"];

  return (
    <main className="page">
      <span className="brand">아정당 미니</span>
      <section className="card accent">
        <p className="muted">인터넷·TV 바꾸고 지원금 받기</p>
        <h1>{headline}</h1>
        <ul className="notes">
          <li>지원금은 개통 완료 후 지급해요</li>
          <li>계산할 때는 연락처를 받지 않아요</li>
        </ul>
      </section>
      <Link className="button" href="/calculator" prefetch={false}>
        내 지원금 계산하기
      </Link>
      <Link className="button secondary" href="/plans" prefetch={false}>
        요금제 먼저 비교하기
      </Link>
    </main>
  );
}
