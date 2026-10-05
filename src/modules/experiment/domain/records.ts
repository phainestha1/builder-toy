// `experiment` 안에서만 쓰는 기록. BC 밖으로 나가지 않으므로 계약 이벤트가 아니다.
import type {
  ApplicationId,
  AssignedVariant,
  IsoDateTime,
  RateTableVersion,
  VisitorId,
} from "@/modules/shared/events";

/** 노출 (`Exposure`). 방문자·실험당 첫 1회만 (E3) */
export interface Exposure {
  visitorId: VisitorId;
  variant: AssignedVariant;
  recordedAt: IsoDateTime;
}

/** 계산 기록 (`RewardEstimated`). 03 계산기에서 계산될 때마다 남긴다 (E4) */
export interface EstimateRecord {
  visitorId: VisitorId;
  variant: AssignedVariant;
  rateTableVersion: RateTableVersion;
  recordedAt: IsoDateTime;
}

/** 전환 (`Conversion`). 방문자·실험당 1회, 변형은 접수에 기록된 값 (E5) */
export interface Conversion {
  visitorId: VisitorId;
  applicationId: ApplicationId;
  variant: AssignedVariant;
  recordedAt: IsoDateTime;
}
