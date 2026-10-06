// 테스트 전용 시드 라우트 (T-G4 E2E). 고객 화면을 거치지 않고 `application` 유스케이스로 접수 1건을 만든다.
// production이 아니고, E2E_SEED_ENABLED=1이고, 로그인한 상담원일 때만 동작한다. 그 밖에는 404.
import { NextResponse } from "next/server";
import { application } from "@/composition";
import { getCounselor } from "@/composition/auth";
import { isE2eSeedAllowed } from "./seed-guard";

export async function POST() {
  const counselor = await getCounselor();
  if (!isE2eSeedAllowed({ env: process.env, loggedIn: counselor !== null })) {
    return new NextResponse(null, { status: 404 });
  }

  // 같은 번호가 168시간 안에 다시 오면 합쳐지므로(A3), 새 접수가 나올 때까지 번호를 바꿔 본다
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const phoneNumber = `010${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
    const result = await application.submitApplication({
      visitorId: `e2e-${crypto.randomUUID()}`,
      contact: {
        name: "테스트고객",
        phoneNumber,
        privacyConsent: true,
        installationRegion: "서울시 마포구",
        preferredContactTime: "Afternoon",
      },
      estimateInput: {
        planId: "plan-500m-tv",
        hasRemainingCommitment: true,
        remainingCommitmentMonths: 8,
        earlyTerminationFee: null,
      },
    });
    if (result.kind === "Submitted") {
      return NextResponse.json({ applicationId: result.applicationId, phoneLastFour: phoneNumber.slice(-4) });
    }
  }
  return NextResponse.json({ error: "시드 접수를 만들지 못했어요" }, { status: 500 });
}
