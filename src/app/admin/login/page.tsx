import { redirect } from "next/navigation";
import { getCounselor } from "@/composition/auth";
import styles from "../admin.module.css";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getCounselor()) redirect("/admin/applications");
  return (
    <main className={styles.loginPage}>
      <LoginForm />
    </main>
  );
}
