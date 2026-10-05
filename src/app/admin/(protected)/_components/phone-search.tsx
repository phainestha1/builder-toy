import styles from "../../admin.module.css";

/** 전화번호 검색은 뒷자리 4자리로만 한다 (A8) */
export function PhoneSearch({
  basePath,
  status,
  query,
  error,
}: {
  basePath: string;
  status: string | null;
  query: string | null;
  error: string | null;
}) {
  return (
    <form className={styles.search} action={basePath} method="get" role="search">
      {status && <input type="hidden" name="status" value={status} />}
      <label className={styles.field}>
        전화번호 뒷자리 4자리
        <input name="q" defaultValue={query ?? ""} inputMode="numeric" maxLength={4} placeholder="1234" />
      </label>
      <button className={styles.button} type="submit">
        검색
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
