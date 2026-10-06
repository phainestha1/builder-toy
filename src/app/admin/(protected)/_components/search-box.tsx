import styles from "../../admin.module.css";

/** 이름 또는 전화번호 뒷자리 4자리로 찾는다. 전화번호는 뒷자리 4자리로만 찾는다 (A8) */
export function SearchBox({
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
      <input
        className={styles.searchInput}
        name="q"
        defaultValue={query ?? ""}
        placeholder="이름·전화번호 뒷자리 검색"
        aria-label="이름·전화번호 뒷자리 검색"
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
