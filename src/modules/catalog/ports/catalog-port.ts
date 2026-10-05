// 계약 파일. `catalog`가 다른 BC(`application`, `reward`)에 공개하는 조회 Port.
// 조회 전용이고, 반환은 Port 전용 읽기 모델이다.
import type { PlanId, RateTableVersion, Won } from "@/modules/shared/events";

/**
 * 계산 입력 (`EstimateInput`). 받은 그대로의 값이라 빈 칸은 `null`이다.
 * 검증과 정규화(C4)는 `catalog`가 한다.
 */
export interface EstimateInput {
  planId: PlanId | null;
  /** 약정 남음 여부. 예 = true, 아니요 = false */
  hasRemainingCommitment: boolean | null;
  remainingCommitmentMonths: number | null;
  /** 위약금. 비우면 `null`("모름") */
  earlyTerminationFee: Won | null;
}

/** 정규화한 위약금 입력. 스냅샷의 "입력값 / 모름 / 해당 없음(약정 아니요)" */
export type EarlyTerminationFeeInput =
  | { kind: "Entered"; amount: Won }
  | { kind: "Unknown" }
  | { kind: "NotApplicable" };

/** 검증을 통과한 계산 입력. 약정 아니요면 남은 약정 개월은 `null`, 위약금은 `NotApplicable`이다 */
export interface NormalizedEstimateInput {
  planId: PlanId;
  hasRemainingCommitment: boolean;
  remainingCommitmentMonths: number | null;
  earlyTerminationFee: EarlyTerminationFeeInput;
}

/** 예상 지원금 (`RewardEstimate`) = 기본 지원금 + 위약금 보전액 */
export interface RewardEstimateView {
  baseReward: Won;
  feeCoverage: Won;
  total: Won;
}

/** 입력 거절 사유 (C4) */
export type EstimateRejectionReason =
  /** 계산 입력이 전부 비었다 */
  | "EmptyInput"
  /** 일부만 있다 (필수 조건을 다 채우지 못함, 위약금만 있는 경우 포함) */
  | "PartialInput"
  /** 약정 남음이 "예"일 때 남은 약정 개월이나 위약금이 범위 밖이다 */
  | "OutOfRange"
  /** 존재하지 않는 요금제 ID */
  | "UnknownPlan"
  /** 존재하지 않는 기준표 버전 (버전을 지정해 계산할 때만) */
  | "UnknownRateTableVersion";

/** 지원금 계산 결과. (a) 계산됨 (b) 기준표 버전에 없음 (c) 입력 거절 */
export type RewardCalculationResult =
  | {
      kind: "Calculated";
      rateTableVersion: RateTableVersion;
      input: NormalizedEstimateInput;
      /** 적용 위약금. 입력값이면 그 값, 모름이면 평균 위약금, 해당 없음이면 0원 */
      appliedEarlyTerminationFee: Won;
      estimate: RewardEstimateView;
    }
  | {
      /** 요금제는 있지만 이 기준표 버전에 없다 (C6). 거절이 아니다 */
      kind: "PlanNotInRateTable";
      rateTableVersion: RateTableVersion;
      planId: PlanId;
    }
  | { kind: "Rejected"; reason: EstimateRejectionReason };

export interface CatalogPort {
  /** 현재 기준표 버전으로 지원금 계산 (접수 때 스냅샷, A2) */
  calculateRewardWithCurrentVersion(input: EstimateInput): Promise<RewardCalculationResult>;
  /** 지정한 기준표 버전으로 지원금 계산 (개통 뒤 산정, R2) */
  calculateRewardWithVersion(
    input: EstimateInput,
    rateTableVersion: RateTableVersion,
  ): Promise<RewardCalculationResult>;
}
