import Link from "next/link";
import styles from "../../admin.module.css";
import {
  type AdminApplicationRow,
  STATUS_LABEL,
  VARIANT_LABEL,
  formatDate,
  formatWon,
} from "../_lib/view-model";

export function ApplicationTable({
  rows,
  selectedId,
  linkFor,
}: {
  rows: AdminApplicationRow[];
  selectedId: string | null;
  linkFor: (applicationId: string) => string;
}) {
  if (rows.length === 0) return <p>조건에 맞는 접수가 없어요.</p>;
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>접수번호</th>
          <th>접수일</th>
          <th>고객</th>
          <th>요금제</th>
          <th>예상 지원금</th>
          <th>변형</th>
          <th>상태</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.applicationId}
            className={row.applicationId === selectedId ? styles.rowSelected : undefined}
            data-testid={`application-row-${row.applicationId}`}
          >
            <td>
              <Link href={linkFor(row.applicationId)}>{row.applicationId}</Link>
            </td>
            <td>{formatDate(row.submittedAt)}</td>
            <td>
              {row.customerName} {row.maskedPhoneNumber}
              {row.resubmissionCount > 0 && <span className={styles.badge}>재접수 {row.resubmissionCount}회</span>}
            </td>
            <td>{row.planLabel ?? "-"}</td>
            <td>{formatWon(row.estimateTotal)}</td>
            <td>{VARIANT_LABEL[row.assignedVariant]}</td>
            <td>{STATUS_LABEL[row.status]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
