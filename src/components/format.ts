/** 원 단위 금액 표시. 예: 600000 → "600,000원" */
export function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}
