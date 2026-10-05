import type { ReactNode } from "react";
import { requireCounselor } from "@/composition/auth";
import styles from "../admin.module.css";
import { AdminMenu } from "./admin-menu";
import { LogoutButton } from "./logout-button";

// /admin 아래 보호 경로. 서버에서 세션을 확인하고, 없으면 로그인 화면으로 보낸다.
// 서버 액션과 라우트 핸들러도 각자 requireCounselor()로 다시 확인한다.
export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const counselor = await requireCounselor();
  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar} aria-label="어드민 메뉴">
        <p className={styles.brand}>아정당 어드민</p>
        <AdminMenu />
        <p className={styles.counselor}>
          상담원 {counselor.name} · <LogoutButton />
        </p>
      </nav>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
