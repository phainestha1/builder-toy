// 라우트는 이 파일에서만 가져온다. 4개 BC를 모두 불러와 구독 두 개가 항상 등록되게 한다.
import { application } from "./application";
import { catalog } from "./catalog";
import { eventBus } from "./event-bus";
import { experiment } from "./experiment";
import { reward } from "./reward";
import { registerSubscriptions } from "./subscriptions";

registerSubscriptions(eventBus, { experiment, reward });

export { application, catalog, eventBus, experiment, reward };
