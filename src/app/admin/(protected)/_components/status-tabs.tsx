import Link from "next/link";
import styles from "../../admin.module.css";
import { STATUS_TABS, type ApplicationStatus } from "../_lib/view-model";

export function StatusTabs({
  basePath,
  current,
  query,
}: {
  basePath: string;
  current: ApplicationStatus | "All";
  query: string | null;
}) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="접수 상태">
      {STATUS_TABS.map((tab) => {
        const params = new URLSearchParams();
        if (tab.key !== "All") params.set("status", tab.key);
        if (query) params.set("q", query);
        const href = params.size ? `${basePath}?${params}` : basePath;
        const active = tab.key === current;
        return (
          <Link
            key={tab.key}
            href={href}
            role="tab"
            aria-selected={active}
            className={active ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
