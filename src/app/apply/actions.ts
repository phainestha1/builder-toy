"use server";

import { application, type PreferredContactTime } from "@/composition";
import { parseEstimateQuery } from "../_lib/estimate-query";
import { getVisitorId } from "../_lib/visitor";
import type { ApplyState } from "./state";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

/** 04 접수. submitApplication만 부른다. 전환은 experiment가 이벤트로 기록한다 (E5) */
export async function submitAction(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const preferredContactTime = text(formData, "preferredContactTime");
  const result = await application.submitApplication({
    visitorId: await getVisitorId(),
    contact: {
      name: text(formData, "name"),
      phoneNumber: text(formData, "phoneNumber"),
      privacyConsent: formData.get("privacyConsent") === "on",
      installationRegion: text(formData, "installationRegion") || null,
      // 값 검사는 application이 한다 (A1)
      preferredContactTime: (preferredContactTime || null) as PreferredContactTime | null,
    },
    estimateInput: parseEstimateQuery({
      planId: text(formData, "planId"),
      commitment: text(formData, "commitment"),
      months: text(formData, "months"),
      fee: text(formData, "fee"),
    }),
  });

  switch (result.kind) {
    case "Submitted":
      return { kind: "Submitted", total: result.estimate?.total ?? null };
    case "Merged":
      return { kind: "Merged", message: result.message, total: result.estimate?.total ?? null };
    case "Rejected":
      return { kind: "Rejected", reason: result.reason };
  }
}
