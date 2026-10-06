import Link from "next/link";
import { catalog, experiment } from "@/composition";
import { getVisitorId } from "../_lib/visitor";
import { CalculatorForm, type CalculatorInitialValues } from "./calculator-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function CalculatorPage({ searchParams }: { searchParams: SearchParams }) {
  const visitorId = await getVisitorId();
  await experiment.ensureAssignment({ visitorId, screen: "Calculator" });

  // 02 [이 요금제로 계산하기]나 04 [수정]에서 온 입력으로 칸을 채운다
  const query = await searchParams;
  const commitment = first(query.commitment);
  const initial: CalculatorInitialValues = {
    planId: first(query.planId),
    commitment: commitment === "yes" || commitment === "no" ? commitment : "",
    months: first(query.months),
    fee: first(query.fee),
  };
  const plans = (await catalog.listPlanComparison()).map(({ planId, name }) => ({ planId, name }));

  return (
    <main className="page">
      <Link className="brand" href="/" prefetch={false}>
        아정당 미니
      </Link>
      <h1>지원금 계산기</h1>
      <p className="muted">연락처 없이 계산할 수 있어요</p>
      <CalculatorForm plans={plans} initial={initial} />
    </main>
  );
}
