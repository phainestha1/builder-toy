// 배정 (`Assignment`). v1의 실험은 하나뿐이라 배정 레코드 키는 `visitorId`다 [가정].
import type { AssignedVariant, IsoDateTime, VisitorId } from "@/modules/shared/events";

/** 고객 화면 01~04. 랜딩만 배정 대상이다 */
export type CustomerScreen = "Landing" | "PlanComparison" | "Calculator" | "Application";

/** 실험 변형 A안·B안 (`Variant`) */
export type Variant = Exclude<AssignedVariant, "Excluded">;

/** 방문자별 배정 레코드. 한 번 만들면 바뀌지 않는다 (E1·E2) */
export interface Assignment {
  visitorId: VisitorId;
  variant: AssignedVariant;
  assignedAt: IsoDateTime;
}

/**
 * 처음 들어온 화면으로 배정을 정한다 (E1).
 * 랜딩이면 A 또는 B, 선택에 실패하면 제외다. 랜딩이 아니면 영구히 제외다.
 */
export function decideAssignment(firstScreen: CustomerScreen, pickVariant: () => Variant): AssignedVariant {
  if (firstScreen !== "Landing") return "Excluded";
  try {
    return pickVariant();
  } catch {
    return "Excluded";
  }
}

/** 노출·계산 기록에 다는 변형 표시. 레코드가 없거나 제외면 제외다 (E2) */
export function recordedVariant(assignment: Assignment | null): AssignedVariant {
  return assignment?.variant ?? "Excluded";
}
