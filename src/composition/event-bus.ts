import { InMemoryEventBus } from "@/modules/shared/infra/in-memory-event-bus";

// 조립 위치(composition root)의 공용 이벤트 버스.
// Next.js 개발 서버의 핫 리로드에서도 하나만 쓰도록 globalThis에 둔다.
const globalForBus = globalThis as unknown as { __eventBus?: InMemoryEventBus };

export const eventBus: InMemoryEventBus = globalForBus.__eventBus ?? new InMemoryEventBus();
globalForBus.__eventBus = eventBus;
