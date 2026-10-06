import styles from "../../admin.module.css";

export function PageHeader({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className={styles.pageHeader}>
      <h1>{title}</h1>
      {aside && <span>{aside}</span>}
    </div>
  );
}
