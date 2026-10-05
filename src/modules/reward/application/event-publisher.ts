import type { RewardEvent } from "@/modules/shared/events";

/** `reward`가 이벤트를 내보내는 곳. 구현(메모리 버스)과 연결은 T-G3/G4에서 한다 */
export interface EventPublisher {
  publish(event: RewardEvent): Promise<void>;
}
