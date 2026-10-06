import type { ApplicationRejectionReason } from "@/composition";

/** 04 접수 결과 화면 상태. 금액은 접수할 때 서버가 다시 계산한 값이다 (A2) */
export type ApplyState =
  | { kind: "Idle" }
  | { kind: "Submitted"; total: number | null }
  | { kind: "Merged"; message: string; total: number | null }
  | { kind: "Rejected"; reason: ApplicationRejectionReason };
