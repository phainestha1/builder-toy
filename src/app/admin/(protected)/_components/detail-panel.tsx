import styles from "../../admin.module.css";
import { availableActions } from "../_lib/available-actions";
import {
  type AdminApplicationDetail,
  VARIANT_DETAIL_LABEL,
  formatWon,
  payoutStatusLabel,
} from "../_lib/view-model";
import { PhoneReveal } from "./phone-reveal";
import { StatusBadge } from "./status-badge";

export interface DetailActions {
  changeStatus: (formData: FormData) => Promise<void>;
  payReward: (formData: FormData) => Promise<void>;
  revealPhoneNumber: () => Promise<string | null>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span>{children}</span>
    </div>
  );
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
      <div className={styles.panelTitle}>
        <h2>접수 {detail.applicationId}</h2>
        <StatusBadge status={detail.status} />
        {detail.resubmissionCount > 0 && <span className={styles.badge}>재접수 {detail.resubmissionCount}회</span>}
      </div>
      {message && (
        <p className={styles.notice} role="status">
          {message}
        </p>
      )}

      <Row label="고객">{detail.customerName}</Row>
      <Row label="전화번호">
        <PhoneReveal maskedPhoneNumber={detail.maskedPhoneNumber} reveal={actions.revealPhoneNumber} />
      </Row>
      <Row label="요금제">{detail.planLabel ?? "계산 없이 접수"}</Row>
      <Row label="남은 약정">{detail.commitmentLabel ?? "-"}</Row>
      <Row label="설치 희망 지역">{detail.installationRegion ?? "-"}</Row>
      <Row label="상담 희망 시간">{detail.preferredContactTimeLabel ?? "-"}</Row>
      <Row label="실험 변형">{VARIANT_DETAIL_LABEL[detail.assignedVariant]}</Row>

      <hr className={styles.divider} />
      <h3>상태 변경</h3>
      <p className={styles.caption}>접수 → 상담중 → 개통완료 / 취소</p>
      <form action={actions.changeStatus} className={styles.actionGrid}>
        <input type="hidden" name="applicationId" value={detail.applicationId} />
        <button className={styles.button} name="to" value="InConsultation" disabled={!can.startConsultation}>
          상담 시작
        </button>
        <button className={styles.button} name="to" value="Cancelled" disabled={!can.cancel}>
          취소
        </button>
        <button className={`${styles.button} ${styles.fullWidth}`} name="to" value="Activated" disabled={!can.activate}>
          개통 완료 처리
        </button>
      </form>

      <hr className={styles.divider} />
      <h3>지원금</h3>
      <Row label="예상 지원금">{formatWon(detail.estimateTotal)}</Row>
      {detail.reward && detail.reward.status !== "NotEligible" && (
        <Row label="산정 지원금">{formatWon(detail.reward.totalReward)}</Row>
      )}
      <Row label="지급 상태">
        <span data-testid="payout-status">{payoutStatusLabel(detail.status, detail.reward)}</span>
      </Row>
      {can.payout !== "hidden" && (
        <form action={actions.payReward}>
          <input type="hidden" name="applicationId" value={detail.applicationId} />
          <button className={`${styles.primaryButton} ${styles.fullWidth}`} disabled={can.payout !== "enabled"}>
            지급 완료 처리
          </button>
        </form>
      )}
      <p className={styles.caption}>개통 완료 이벤트를 받은 뒤에 지원금을 산정하고 지급할 수 있어요.</p>
    </aside>
  );
}
