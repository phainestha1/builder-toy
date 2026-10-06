import Link from "next/link";
import { catalog, experiment } from "@/composition";
import { formatWon } from "@/components/format";
import { hasEstimateQuery, parseEstimateQuery, toEstimateQuery, type QueryRecord } from "../_lib/estimate-query";
import { getVisitorId } from "../_lib/visitor";
import { ApplyForm } from "./apply-form";

const ESTIMATE_KEYS = ["planId", "commitment", "months", "fee"] as const;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function ApplyPage({ searchParams }: { searchParams: Promise<QueryRecord> }) {
  const visitorId = await getVisitorId();
  await experiment.ensureAssignment({ visitorId, screen: "Application" });

  const query = await searchParams;
  // 계산 입력은 받은 그대로 접수에 넘긴다. 금액은 접수할 때 서버가 다시 계산한다 (A2)
  const estimateFields = Object.fromEntries(ESTIMATE_KEYS.map((key) => [key, first(query[key])]));
  const rawQuery = new URLSearchParams(Object.entries(estimateFields).filter(([, v]) => v !== "")).toString();

  const result = hasEstimateQuery(query) ? await catalog.estimateReward(parseEstimateQuery(query)) : null;
  const planName = new Map((await catalog.listPlanComparison()).map((card) => [card.planId, card.name]));

  return (
    <main className="page">
      <Link className="brand" href="/" prefetch={false}>
        아정당 미니
      </Link>
      <h1>상담 접수</h1>

      {result?.kind === "Calculated" ? (
        <section className="card accent" data-testid="estimate-summary">
          <div className="row">
            <h2>{planName.get(result.input.planId)}</h2>
            <Link className="link" href={`/calculator?${toEstimateQuery(result.input)}`} prefetch={false}>
              수정
            </Link>
          </div>
          <p className="muted">
            {result.input.hasRemainingCommitment
              ? `남은 약정 ${result.input.remainingCommitmentMonths}개월`
              : "남은 약정 없음"}
          </p>
          <div className="row">
            <span className="muted">총 예상 지원금</span>
            <span className="amount">{formatWon(result.estimate.total)}</span>
          </div>
        </section>
      ) : result?.kind === "PlanNotInRateTable" ? (
        <section className="card" data-testid="estimate-summary">
          <div className="row">
            <h2>{planName.get(result.planId)}</h2>
            <Link className="link" href={`/calculator?${rawQuery}`} prefetch={false}>
              수정
            </Link>
          </div>
          <div className="row">
            <span className="muted">총 예상 지원금</span>
            <span>지원금 상담 시 안내</span>
          </div>
        </section>
      ) : (
        <Link className="button secondary" href={rawQuery ? `/calculator?${rawQuery}` : "/calculator"} prefetch={false}>
          지원금 먼저 계산해 보기
        </Link>
      )}

      <ApplyForm estimateFields={estimateFields} />
    </main>
  );
}
