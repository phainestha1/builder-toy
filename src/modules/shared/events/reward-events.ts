// 계약 파일. `reward`가 발행하는 이벤트.
// 지원금은 접수 1건에 하나라서(R4) `applicationId`로 식별한다.
import type {
  ApplicationId,
  CounselorId,
  DomainEventBase,
  RateTableVersion,
  Won,
} from "./types";

/** 지원금 금액이 산정됐다. 받는 BC: 없음 */
export type RewardCalculated = DomainEventBase<
  "RewardCalculated",
  {
    applicationId: ApplicationId;
    rateTableVersion: RateTableVersion;
    baseReward: Won;
    feeCoverage: Won;
    totalReward: Won;
  }
>;

/** 지원금이 지급완료로 기록됐다. 실제 송금은 없다. 받는 BC: 없음 */
export type RewardPaid = DomainEventBase<
  "RewardPaid",
  {
    applicationId: ApplicationId;
    counselorId: CounselorId;
    totalReward: Won;
  }
>;

export type RewardEvent = RewardCalculated | RewardPaid;
