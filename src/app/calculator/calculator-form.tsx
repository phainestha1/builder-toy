"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { formatWon } from "@/components/format";
import { calculateAction } from "./actions";
import type { CalculatorState } from "./state";

export interface CalculatorInitialValues {
  planId: string;
  commitment: "" | "yes" | "no";
  months: string;
  fee: string;
}

const REJECTION_MESSAGES = {
  EmptyInput: "요금제와 약정 여부를 입력해 주세요",
  PartialInput: "빠진 칸을 채워 주세요",
  OutOfRange: "남은 개월 수는 0~36, 위약금은 0원 이상으로 입력해 주세요",
  UnknownPlan: "요금제를 다시 골라 주세요",
  UnknownRateTableVersion: "잠시 후 다시 계산해 주세요",
} as const;

export function CalculatorForm({
  plans,
  initial,
}: {
  plans: { planId: string; name: string }[];
  initial: CalculatorInitialValues;
}) {
  const [state, formAction, pending] = useActionState<CalculatorState, FormData>(calculateAction, { kind: "Idle" });
  const [values, setValues] = useState(initial);
  const set = (key: keyof CalculatorInitialValues) => (value: string) => setValues((v) => ({ ...v, [key]: value }));

  const rangeError = state.kind === "Rejected" && state.reason === "OutOfRange";

  return (
    <>
      <form action={formAction}>
        <label className="field">
          요금제
          <select name="planId" value={values.planId} onChange={(e) => set("planId")(e.target.value)}>
            <option value="">선택해 주세요</option>
            {plans.map((plan) => (
              <option key={plan.planId} value={plan.planId}>
                {plan.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend>지금 쓰는 인터넷 약정이 남았나요?</legend>
          <div className="options">
            {(["yes", "no"] as const).map((option) => (
              <label key={option} className="check">
                <input
                  type="radio"
                  name="commitment"
                  value={option}
                  checked={values.commitment === option}
                  onChange={() => set("commitment")(option)}
                />
                {option === "yes" ? "네" : "아니요"}
              </label>
            ))}
          </div>
        </fieldset>

        {/* 약정 "아니요"면 개월·위약금 칸을 숨긴다. 보전액 0원은 서버가 정한다 */}
        {values.commitment !== "no" && (
          <>
            <label className="field" data-invalid={rangeError}>
              남은 개월 수
              <input
                name="months"
                inputMode="numeric"
                value={values.months}
                onChange={(e) => set("months")(e.target.value)}
                placeholder="0~36"
              />
            </label>
            <label className="field" data-invalid={rangeError}>
              예상 위약금 (원)
              <input
                name="fee"
                inputMode="numeric"
                value={values.fee}
                onChange={(e) => set("fee")(e.target.value)}
                placeholder="모르면 비워 두세요 (평균값으로 계산)"
              />
            </label>
          </>
        )}

        {state.kind === "Rejected" && <p className="error">{REJECTION_MESSAGES[state.reason]}</p>}

        <button className="button secondary" type="submit" disabled={pending}>
          계산하기
        </button>
      </form>

      {state.kind === "Calculated" && (
        <section className="card accent" aria-live="polite">
          <p className="muted">총 예상 지원금</p>
          <p className="amount" data-testid="estimate-result">
            기본 지원금 {formatWon(state.baseReward)} + 위약금 보전액 {formatWon(state.feeCoverage)} ={" "}
            {formatWon(state.total)}
          </p>
          {state.capped && <p className="muted">최대 30만 원까지 보전돼요</p>}
          {state.averageFeeApplied !== null && (
            <p className="muted">위약금은 평균값 {formatWon(state.averageFeeApplied)}으로 계산했어요</p>
          )}
          <Link className="button" href={`/apply?${state.applyQuery}`} prefetch={false}>
            이 금액으로 상담 접수하기
          </Link>
        </section>
      )}

      {state.kind === "PlanNotInRateTable" && (
        <section className="card" aria-live="polite">
          <p className="amount">지원금 상담 시 안내</p>
          <p className="muted">이 요금제는 상담원이 지원금을 안내해 드려요</p>
        </section>
      )}
    </>
  );
}
