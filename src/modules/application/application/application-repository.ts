import type { ApplicationId, CounselorId, IsoDateTime } from "@/modules/shared/events";
import type { Application } from "../domain/application";
import type { PhoneNumber } from "../domain/phone-number";

/** 전화번호 열람 기록 (`PhoneNumberRevealed`). 계약 이벤트가 아니라 `application` 안의 기록이다 (A8) */
export interface PhoneNumberReveal {
  applicationId: ApplicationId;
  counselorId: CounselorId;
  revealedAt: IsoDateTime;
}

export interface ApplicationRepository {
  save(application: Application): Promise<void>;
  findById(id: ApplicationId): Promise<Application | null>;
  /** 같은 전화번호의 가장 최근 접수 (재접수 판정, A3) */
  findLatestByPhoneNumber(phoneNumber: PhoneNumber): Promise<Application | null>;
  list(): Promise<Application[]>;
  saveReveal(reveal: PhoneNumberReveal): Promise<void>;
  listReveals(applicationId: ApplicationId): Promise<PhoneNumberReveal[]>;
}
