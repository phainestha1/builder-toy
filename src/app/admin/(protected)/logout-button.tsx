"use client";

import { signOut } from "next-auth/react";
import styles from "../admin.module.css";

export function LogoutButton() {
  return (
    <button className={styles.button} type="button" onClick={() => signOut({ callbackUrl: "/admin/login" })}>
      로그아웃
    </button>
  );
}
