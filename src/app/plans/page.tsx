import Link from "next/link";
import { catalog, experiment, type PlanComparisonCard, type PlanSpeed } from "@/composition";
import { formatWon } from "@/components/format";
import { getVisitorId } from "../_lib/visitor";

const SPEEDS: readonly PlanSpeed[] = ["100M", "500M", "1G"];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** 예상 지원금 높은 순. 금액 없는 요금제(C6)는 맨 뒤 */
function byRewardDesc(a: PlanComparisonCard, b: PlanComparisonCard): number {
  return (b.rewardEstimate ?? -1) - (a.rewardEstimate ?? -1);
}

function filterHref(speed: PlanSpeed | null, tv: boolean): string {
  const params = new URLSearchParams();
  if (speed) params.set("speed", speed);
  if (tv) params.set("tv", "1");
  const query = params.toString();
  return query ? `/plans?${query}` : "/plans";
}

export default async function PlansPage({ searchParams }: { searchParams: SearchParams }) {
  const visitorId = await getVisitorId();
  await experiment.ensureAssignment({ visitorId, screen: "PlanComparison" });

  const query = await searchParams;
  const speed = SPEEDS.find((s) => s === query.speed) ?? null;
  const tvOnly = query.tv === "1";

  const cards = (await catalog.listPlanComparison())
    .filter((card) => (speed === null || card.speed === speed) && (!tvOnly || card.includesTv))
    .sort(byRewardDesc);

  return (
    <main className="page">
      <Link className="brand" href="/" prefetch={false}>
        아정당 미니
      </Link>
      <h1>요금제 비교</h1>
      <nav className="chips" aria-label="속도">
        <Link className="chip" href={filterHref(null, tvOnly)} aria-current={speed === null} prefetch={false}>
          전체
        </Link>
        {SPEEDS.map((s) => (
          <Link key={s} className="chip" href={filterHref(s, tvOnly)} aria-current={speed === s} prefetch={false}>
            {s}
          </Link>
        ))}
        <Link className="chip" href={filterHref(speed, !tvOnly)} aria-current={tvOnly} prefetch={false}>
          TV 포함
        </Link>
      </nav>
      <p className="muted">예상 지원금 높은 순</p>

      {cards.length === 0 ? (
        <section className="card">
          <p>조건에 맞는 요금제가 없어요</p>
          <Link className="button secondary" href="/plans" prefetch={false}>
            필터 초기화
          </Link>
        </section>
      ) : (
        cards.map((card) => (
          <section key={card.planId} className="card" data-testid="plan-card">
            <h2>{card.name}</h2>
            <div className="row">
              <span className="muted">월 요금</span>
              <span>{formatWon(card.monthlyFee)}</span>
            </div>
            <div className="row">
              <span className="muted">예상 지원금</span>
              {card.rewardEstimate === null ? (
                <span>지원금 상담 시 안내</span>
              ) : (
                <span className="amount">{formatWon(card.rewardEstimate)}</span>
              )}
            </div>
            {card.rewardEstimate !== null && (
              <Link
                className="button secondary"
                href={`/calculator?planId=${encodeURIComponent(card.planId)}`}
                prefetch={false}
              >
                이 요금제로 계산하기
              </Link>
            )}
          </section>
        ))
      )}
    </main>
  );
}
