import type { DomainEvent, DomainEventType, EventOfType } from "@/modules/shared/events";

export type EventHandler<T extends DomainEventType> = (event: EventOfType<T>) => void | Promise<void>;

/**
 * 메모리 이벤트 버스. 한 프로세스 안에서 구독자를 차례로 부른다.
 * BC 로직은 두지 않는다. 유스케이스는 자기 BC의 발행 인터페이스로만 이 버스를 쓴다.
 */
export class InMemoryEventBus {
  private readonly handlers = new Map<DomainEventType, ((event: DomainEvent) => void | Promise<void>)[]>();
  private readonly log: DomainEvent[] = [];

  /** 발행한 이벤트 (발행 순서) */
  get published(): readonly DomainEvent[] {
    return this.log;
  }

  subscribe<T extends DomainEventType>(type: T, handler: EventHandler<T>): void {
    const list = this.handlers.get(type) ?? [];
    // 구독 타입과 같은 type의 이벤트만 넘기므로 안전하다
    list.push(handler as unknown as (event: DomainEvent) => void | Promise<void>);
    this.handlers.set(type, list);
  }

  async publish(event: DomainEvent): Promise<void> {
    this.log.push(event);
    for (const handler of this.handlers.get(event.type) ?? []) {
      await handler(event);
    }
  }
}
