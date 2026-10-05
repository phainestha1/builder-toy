// 계약 파일. `experiment`가 `application`에 공개하는 조회 Port.
// 조회 전용이다. 배정 레코드를 만들지 않는다 (만드는 일은 배정 확인 유스케이스, E1).
import type { AssignedVariant, VisitorId } from "@/modules/shared/events";

/** 방문자의 배정 레코드 읽기 모델 */
export interface AssignmentView {
  visitorId: VisitorId;
  variant: AssignedVariant;
}

export interface ExperimentPort {
  /**
   * 방문자의 배정 레코드 조회. 레코드가 없으면 `null`이다.
   * `null`을 `Excluded`로 바꾸는 일(A9)은 `application`이 한다.
   */
  findAssignment(visitorId: VisitorId): Promise<AssignmentView | null>;
}
