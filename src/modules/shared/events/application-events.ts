// 계약 파일. `application`이 발행하는 이벤트.
// payload에는 ID와 그 시점의 사실만 담고 개인정보(전화번호, 이름 등)는 넣지 않는다 (P1).
import type {
  ApplicationId,
  AssignedVariant,
  CounselorId,
  DomainEventBase,
  VisitorId,
} from "./types";

/** 새 접수가 만들어졌다. 접수 시각은 `occurredAt`이다. 받는 BC: `experiment` (전환 기록) */
export type ApplicationSubmitted = DomainEventBase<
  "ApplicationSubmitted",
  {
    applicationId: ApplicationId;
    visitorId: VisitorId;
    assignedVariant: AssignedVariant;
  }
>;

/** 재접수가 기존 접수에 합쳐졌다. 전환이 아니다. 받는 BC: 없음 */
export type ApplicationMerged = DomainEventBase<
  "ApplicationMerged",
  {
    applicationId: ApplicationId;
    /** 이번 합침을 더한 뒤의 재접수 횟수 */
    resubmissionCount: number;
  }
>;

/** 접수가 `상담중`이 됐다. 받는 BC: 없음 */
export type ConsultationStarted = DomainEventBase<
  "ConsultationStarted",
  {
    applicationId: ApplicationId;
    counselorId: CounselorId;
  }
>;

/** 접수가 `개통완료`가 됐다. 받는 BC: `reward` (지원금 산정) */
export type LineActivated = DomainEventBase<
  "LineActivated",
  {
    applicationId: ApplicationId;
    counselorId: CounselorId;
  }
>;

/** 접수가 `취소`됐다. 받는 BC: 없음 */
export type ApplicationCancelled = DomainEventBase<
  "ApplicationCancelled",
  {
    applicationId: ApplicationId;
    counselorId: CounselorId;
  }
>;

export type ApplicationEvent =
  | ApplicationSubmitted
  | ApplicationMerged
  | ConsultationStarted
  | LineActivated
  | ApplicationCancelled;
