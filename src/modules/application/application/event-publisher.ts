import type { ApplicationEvent } from "@/modules/shared/events";

/** `application`이 이벤트를 내보내는 곳. `shared/infra`의 메모리 이벤트 버스가 같은 모양으로 구현한다 */
export interface EventPublisher {
  publish(event: ApplicationEvent): Promise<void>;
}
