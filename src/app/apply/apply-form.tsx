"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ApplicationRejectionReason } from "@/composition";
import { formatWon } from "@/components/format";
import { submitAction } from "./actions";
import type { ApplyState } from "./state";

// 화면 편의용 검사. 버튼을 막기만 하고, 최종 판단은 서버가 한다 (A1)
const PHONE_PATTERN = /^01\d{8,9}$/;
const looksLikePhoneNumber = (value: string) => PHONE_PATTERN.test(value.replace(/-/g, "").trim());

const CONTACT_TIMES = [
  { value: "Morning", label: "오전" },
  { value: "Afternoon", label: "오후" },
  { value: "Evening", label: "저녁" },
] as const;

const REJECTION_MESSAGES: Record<ApplicationRejectionReason, string> = {
  MissingName: "이름을 입력해 주세요",
  MissingPhoneNumber: "전화번호를 입력해 주세요",
  InvalidPhoneNumber: "전화번호 형식을 확인해 주세요",
  PrivacyConsentRequired: "개인정보 수집·이용에 동의해 주세요",
  InvalidPreferredContactTime: "상담 희망 시간을 다시 골라 주세요",
  PartialInput: "계산 내용을 확인해 주세요",
  OutOfRange: "계산 내용을 확인해 주세요",
  UnknownPlan: "계산 내용을 확인해 주세요",
  UnknownRateTableVersion: "잠시 후 다시 접수해 주세요",
};

const PHONE_REASONS: readonly ApplicationRejectionReason[] = ["MissingPhoneNumber", "InvalidPhoneNumber"];

export function ApplyForm({ estimateFields }: { estimateFields: Record<string, string> }) {
  const [state, formAction, pending] = useActionState<ApplyState, FormData>(submitAction, { kind: "Idle" });
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [region, setRegion] = useState("");
  const [contactTime, setContactTime] = useState("");
  const [consent, setConsent] = useState(false);

  if (state.kind === "Submitted" || state.kind === "Merged") {
    return (
      <section className="card accent" data-testid="application-done" aria-live="polite">
        <h2>{state.kind === "Submitted" ? "상담 접수가 끝났어요" : state.message}</h2>
        {state.total !== null ? (
          <div className="row">
            <span className="muted">예상 지원금</span>
            <span className="amount">{formatWon(state.total)}</span>
          </div>
        ) : (
          <p className="muted">지원금은 상담 때 안내해 드려요</p>
        )}
        <p className="muted">상담원이 곧 연락드려요. 지원금은 개통 완료 후 지급해요</p>
        <Link className="link" href="/" prefetch={false}>
          처음으로
        </Link>
      </section>
    );
  }

  const phoneTyped = phoneNumber.trim() !== "";
  const phoneInvalid = phoneTyped && !looksLikePhoneNumber(phoneNumber);
  const rejected = state.kind === "Rejected" ? state.reason : null;
  const canSubmit = name.trim() !== "" && looksLikePhoneNumber(phoneNumber) && consent && !pending;

  return (
    <form action={formAction}>
      {Object.entries(estimateFields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <label className="field" data-invalid={rejected === "MissingName"}>
        이름
        <input name="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </label>
      <label className="field" data-invalid={phoneInvalid || (rejected !== null && PHONE_REASONS.includes(rejected))}>
        전화번호
        <input
          name="phoneNumber"
          inputMode="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="010-1234-5678"
          autoComplete="tel"
        />
      </label>
      {phoneInvalid && <p className="error">01로 시작하는 10~11자리 번호를 입력해 주세요</p>}
      <label className="field">
        설치 희망 지역 (선택)
        <input name="installationRegion" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="예: 서울 마포구" />
      </label>
      <fieldset>
        <legend>상담 희망 시간 (선택)</legend>
        <div className="options">
          {CONTACT_TIMES.map((time) => (
            <label key={time.value} className="check">
              <input
                type="radio"
                name="preferredContactTime"
                value={time.value}
                checked={contactTime === time.value}
                onChange={() => setContactTime(time.value)}
              />
              {time.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="check">
        <input type="checkbox" name="privacyConsent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        개인정보 수집·이용에 동의합니다 (필수)
      </label>
      {rejected !== null && <p className="error">{REJECTION_MESSAGES[rejected]}</p>}
      <button className="button" type="submit" disabled={!canSubmit}>
        접수하기
      </button>
    </form>
  );
}
