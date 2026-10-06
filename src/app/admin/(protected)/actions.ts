"use server";

// 화면 05 서버 액션. 레이아웃만 믿지 않고 액션마다 세션을 다시 확인한다.
// counselorId는 폼이 아니라 세션에서 꺼내 유스케이스 인자로 넘긴다 (ADR 0001).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { application, reward } from "@/composition";
import { requireCounselor } from "@/composition/auth";
import type { ApplicationStatus } from "./_lib/view-model";

const TARGET_STATUSES: readonly ApplicationStatus[] = ["InConsultation", "Activated", "Cancelled"];

function withMessage(applicationId: string, message: string): string {
  return `/admin/applications?${new URLSearchParams({ id: applicationId, msg: message })}`;
}

export async function changeStatusAction(formData: FormData): Promise<void> {
  const counselor = await requireCounselor();
  const applicationId = String(formData.get("applicationId") ?? "");
  const to = String(formData.get("to") ?? "") as ApplicationStatus;
  if (!TARGET_STATUSES.includes(to)) redirect(withMessage(applicationId, "바꿀 수 없는 상태예요"));

  const result = await application.changeApplicationStatus({ applicationId, to, counselorId: counselor.counselorId });
  revalidatePath("/admin", "layout");
  if (result.kind === "Rejected") redirect(withMessage(applicationId, "지금 상태에서는 그 상태로 바꿀 수 없어요"));
  if (result.kind === "NotFound") redirect(withMessage(applicationId, "접수를 찾을 수 없어요"));
}

export async function payRewardAction(formData: FormData): Promise<void> {
  const counselor = await requireCounselor();
  const applicationId = String(formData.get("applicationId") ?? "");
  const result = await reward.payReward({ applicationId, counselorId: counselor.counselorId });
  revalidatePath("/admin", "layout");
  if (result.kind === "Rejected") {
    const message =
      result.reason === "AlreadyPaid"
        ? "이미 지급 완료된 지원금이에요"
        : result.reason === "NotEligible"
          ? "산정 대상 아님이라 지급할 수 없어요"
          : "개통 전이라 지원금이 없어요";
    redirect(withMessage(applicationId, message));
  }
}

/** 전화번호 열람. 누가, 언제 봤는지 `application`이 기록한다 (A8) */
export async function revealPhoneNumberAction(applicationId: string): Promise<string | null> {
  const counselor = await requireCounselor();
  const result = await application.revealPhoneNumber({ applicationId, counselorId: counselor.counselorId });
  return result.kind === "Revealed" ? result.phoneNumber : null;
}
