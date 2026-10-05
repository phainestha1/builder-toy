"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../admin.module.css";

const MENU = [
  { href: "/admin/applications", label: "접수 관리" },
  { href: "/admin/rewards", label: "지원금 지급" },
] as const;

export function AdminMenu() {
  const pathname = usePathname();
  return (
    <>
      {MENU.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? `${styles.menuLink} ${styles.menuLinkActive}` : styles.menuLink}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
