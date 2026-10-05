import styles from "../../admin.module.css";
import { availableActions } from "../_lib/available-actions";
import {
  type AdminApplicationDetail,
  REWARD_STATUS_LABEL,
  STATUS_LABEL,
  VARIANT_LABEL,
  formatDate,
  formatWon,
} from "../_lib/view-model";
import { PhoneReveal } from "./phone-reveal";

export interface DetailActions {
  changeStatus: (formData: FormData) => Promise<void>;
  payReward: (formData: FormData) => Promise<void>;
  revealPhoneNumber: () => Promise<string | null>;
}

export function DetailPanel({
  detail,
  actions,
  message,
}: {
  detail: AdminApplicationDetail;
  actions: DetailActions;
  message: string | null;
}) {
  const can = availableActions(detail.status, detail.reward?.status ?? null);

  return (
    <aside className={styles.panel} aria-label="접수 상세">
      <h2>
        접수 {detail.applicationId} <span className={styles.statusBadge}>{STATUS_LABEL[detail.status]}</span>
      </h2>
      {detail.resubmissionCount > 0 && <span className={styles.badge}>재접수 {detail.resubmissionCount}회</span>}
      {message && (
        <p className={styles.notice} role="status">
          {message}
        </p>
      )}

      <section>
        <h3>고객</h3>
        <dl className={styles.dl}>
          <dt>이름</dt>
          <dd>{detail.customerName}</dd>
          <dt>전화번호</dt>
          <dd>
            <PhoneReveal maskedPhoneNumber={detail.maskedPhoneNumber} reveal={actions.revealPhoneNumber} />
          </dd>
          <dt>설치 희망 지역</dt>
          <dd>{detail.installationRegion ?? "-"}</dd>
          <dt>상담 희망 시간대</dt>
          <dd>{detail.preferredContactTimeLabel ?? "-"}</dd>
          <dt>접수일</dt>
          <dd>{formatDate(detail.submittedAt)}</dd>
        </dl>
      </section>

      <section>
        <h3>요금제·실험 변형</h3>
        <dl className={styles.dl}>
          <dt>요금제</dt>
          <dd>{detail.planLabel ?? "계산 없이 접수"}</dd>
          <dt>예상 지원금</dt>
          <dd>{formatWon(detail.estimateTotal)}</dd>
          <dt>변형</dt>
          <dd>{VARIANT_LABEL[detail.assignedVariant]}</dd>
        </dl>
      </section>

      <section>
        <h3>상태 변경</h3>
        <form action={actions.changeStatus} className={styles.actions}>
          <input type="hidden" name="applicationId" value={detail.applicationId} />
          <button className={styles.button} name="to" value="InConsultation" disabled={!can.startConsultation}>
            상담 시작
          </button>
          <button className={styles.button} name="to" value="Activated" disabled={!can.activate}>
            개통 완료
          </button>
          <button className={styles.button} name="to" value="Cancelled" disabled={!can.cancel}>
            취소
          </button>
        </form>
      </section>

      <RewardSection detail={detail} payout={can.payout} payReward={actions.payReward} />
    </aside>
  );
}

function RewardSection({
  detail,
  payout,
  payReward,
}: {
  detail: AdminApplicationDetail;
  payout: ReturnType<typeof availableActions>["payout"];
  payReward: DetailActions["payReward"];
}) {
  if (detail.status === "Cancelled") {
    return (
      <section>
        <h3>지원금</h3>
        <p>개통 전에 취소해서 지원금이 없어요.</p>
      </section>
    );
  }
  if (detail.status !== "Activated") {
    return (
      <section>
        <h3>지원금</h3>
        <p>개통 완료 뒤에 산정해요.</p>
      </section>
    );
  }
  const reward = detail.reward;
  return (
    <section>
      <h3>지원금</h3>
      {reward === null ? (
        <p>지원금을 산정하고 있어요.</p>
      ) : (
        <dl className={styles.dl}>
          <dt>지원금 상태</dt>
          <dd data-testid="reward-status">{REWARD_STATUS_LABEL[reward.status]}</dd>
          {reward.status !== "NotEligible" && (
            <>
              <dt>기본 지원금</dt>
              <dd>{formatWon(reward.baseReward)}</dd>
              <dt>위약금 보전</dt>
              <dd>{formatWon(reward.feeCoverage)}</dd>
              <dt>총 지원금</dt>
              <dd>{formatWon(reward.totalReward)}</dd>
            </>
          )}
          {reward.paidAt && (
            <>
              <dt>지급일</dt>
              <dd>{formatDate(reward.paidAt)}</dd>
            </>
          )}
        </dl>
      )}
      {payout !== "hidden" && payout !== "pending" && (
        <form action={payReward}>
          <input type="hidden" name="applicationId" value={detail.applicationId} />
          <button className={styles.primaryButton} disabled={payout !== "enabled"}>
            {payout === "paid" ? "지급 완료됨" : "지급 처리"}
          </button>
        </form>
      )}
    </section>
  );
}
