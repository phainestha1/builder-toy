"use client";

import { useState, useTransition } from "react";
import styles from "../../admin.module.css";

/** 기본은 가린 번호. [보기]를 누르면 서버의 열람 명령이 누가, 언제 봤는지 남긴다 (A8) */
export function PhoneReveal({
  maskedPhoneNumber,
  reveal,
}: {
  maskedPhoneNumber: string;
  reveal: () => Promise<string | null>;
}) {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <span>
      <span data-testid="phone-number">{phoneNumber ?? maskedPhoneNumber}</span>{" "}
      {phoneNumber === null && (
        <button
          className={styles.button}
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => setPhoneNumber(await reveal()))}
        >
          보기
        </button>
      )}
    </span>
  );
}
