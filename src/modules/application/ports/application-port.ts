// 계약 파일. `application`이 `reward`에 공개하는 조회 Port.
// 조회 전용이고, 반환은 Port 전용 읽기 모델이다. 개인정보는 담지 않는다.
import type {
  NormalizedEstimateInput,
  RewardEstimateView,
} from "@/modules/catalog/ports/catalog-port";
import type { ApplicationId, RateTableVersion, Won } from "@/modules/shared/events";

/** 계산 결과 스냅샷 (`EstimateSnapshot`) 읽기 모델 */
export interface EstimateSnapshotView {
  applicationId: ApplicationId;
  input: NormalizedEstimateInput;
  appliedEarlyTerminationFee: Won;
  rateTableVersion: RateTableVersion;
  estimate: RewardEstimateView;
}

/** 스냅샷 조회 결과. 스냅샷이 없으면(계산 없이 접수, 기준표 버전에 없는 요금제) `NoSnapshot`이다 (R3) */
export type EstimateSnapshotLookup =
  | { kind: "Found"; snapshot: EstimateSnapshotView }
  | { kind: "NoSnapshot"; applicationId: ApplicationId }
  | { kind: "ApplicationNotFound"; applicationId: ApplicationId };

export interface ApplicationPort {
  /** 접수의 계산 결과 스냅샷 조회 (지원금 산정 근거, R2) */
  findEstimateSnapshot(applicationId: ApplicationId): Promise<EstimateSnapshotLookup>;
}
