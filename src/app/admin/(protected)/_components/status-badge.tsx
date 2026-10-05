import styles from "../../admin.module.css";
import { type ApplicationStatus, STATUS_LABEL } from "../_lib/view-model";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status${status}`]}`} data-testid="status-badge">
      {STATUS_LABEL[status]}
    </span>
  );
}
