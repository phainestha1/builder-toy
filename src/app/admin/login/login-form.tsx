"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import styles from "../admin.module.css";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const result = await signIn("credentials", {
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });
    setPending(false);
    if (!result || result.error) {
      setError("아이디 또는 비밀번호가 맞지 않아요");
      return;
    }
    router.replace("/admin/applications");
    router.refresh();
  }

  return (
    <form className={styles.loginCard} onSubmit={handleSubmit}>
      <h1 style={{ margin: 0, fontSize: 22 }}>상담원 로그인</h1>
      <label className={styles.field}>
        아이디
        <input name="username" autoComplete="username" required />
      </label>
      <label className={styles.field}>
        비밀번호
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button className={styles.primaryButton} type="submit" disabled={pending}>
        {pending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
