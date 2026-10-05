import type { InMemoryEventBus } from "@/modules/shared/infra/in-memory-event-bus";
import type { ExperimentComposition } from "./experiment";
import { globalSingleton } from "./global";
import type { RewardComposition } from "./reward";

// 구독을 붙인 버스. 핫 리로드로 이 모듈이 다시 평가돼도 같은 버스에 두 번 붙이지 않는다.
const subscribedBuses = globalSingleton("__composition_subscribed_buses", () => new WeakSet<InMemoryEventBus>());

/** BC 사이 구독 두 개를 버스에 붙인다. 같은 버스에는 한 번만 붙인다 */
export function registerSubscriptions(
  bus: InMemoryEventBus,
  handlers: {
    experiment: Pick<ExperimentComposition, "handleApplicationSubmitted">;
    reward: Pick<RewardComposition, "handleLineActivated">;
  },
): void {
  if (subscribedBuses.has(bus)) return;
  subscribedBuses.add(bus);
  bus.subscribe("ApplicationSubmitted", async (event) => {
    await handlers.experiment.handleApplicationSubmitted(event);
  });
  bus.subscribe("LineActivated", async (event) => {
    await handlers.reward.handleLineActivated(event);
  });
}
