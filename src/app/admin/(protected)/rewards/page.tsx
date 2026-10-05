import Link from "next/link";
import styles from "../../admin.module.css";
import { PageHeader } from "../_components/page-header";
import { availableActions } from "../_lib/available-actions";
import { loadApplicationDetail, loadApplicationList } from "../_lib/load";
import { formatMonthDay, formatWon, payoutStatusLabel } from "../_lib/view-model";
import { payRewardAction } from "../actions";

/** 지원금 지급: 개통완료 접수만 모아 지원금 상태와 지급 처리를 보여 준다 */
export default async function RewardsPage() {
  const list = await loadApplicationList({ status: "Activated", query: null });
  const details = (await Promise.all(list.rows.map((row) => loadApplicationDetail(row.applicationId)))).filter(
    (detail) => detail !== null,
  );

  return (
    <>
      <PageHeader title="지원금 지급" aside={`개통완료 ${details.length}건`} />
      <table className={styles.table}>
        <thead>
          <tr>
            <th>접수번호</th>
            <th>접수일</th>
            <th>고객</th>
            <th>예상 지원금</th>
            <th>산정 지원금</th>
            <th>지급 상태</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {details.map((detail) => {
            const payout = availableActions(detail.status, detail.reward?.status ?? null).payout;
            return (
              <tr key={detail.applicationId}>
                <td>
                  <Link href={`/admin/applications?id=${detail.applicationId}`}>{detail.applicationId}</Link>
                </td>
                <td>{formatMonthDay(detail.submittedAt)}</td>
                <td>
                  {detail.customerName} {detail.maskedPhoneNumber}
                </td>
                <td>{formatWon(detail.estimateTotal)}</td>
                <td>{formatWon(detail.reward?.totalReward ?? null)}</td>
                <td>{payoutStatusLabel(detail.status, detail.reward)}</td>
                <td>
                  {payout !== "hidden" && (
                    <form action={payRewardAction}>
                      <input type="hidden" name="applicationId" value={detail.applicationId} />
                      <button className={styles.button} disabled={payout !== "enabled"}>
                        지급 완료 처리
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {details.length === 0 && <p>개통완료된 접수가 아직 없어요.</p>}
      <p className={styles.caption}>실제 송금은 하지 않고 지급완료 상태만 기록해요.</p>
    </>
  );
}
