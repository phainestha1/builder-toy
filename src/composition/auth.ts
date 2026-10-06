// 어드민 인증 조립. 상담원 계정과 `counselorId`의 주인은 shared의 어드민 인증이다 (ADR 0001).
// 라우트는 세션에서 `counselorId`를 꺼내 유스케이스 인자로 넘긴다.
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { readNextAuthSecret } from "@/modules/shared/infra/auth/auth-env";
import {
  type Counselor,
  parseCounselorAccounts,
  verifyCounselorCredentials,
} from "@/modules/shared/infra/auth/counselor-accounts";

declare module "next-auth" {
  interface Session {
    counselor: Counselor;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    counselorId?: string;
    counselorName?: string;
  }
}

// 시크릿과 상담원 계정은 환경변수에서만 읽는다(.env.local, README "로컬 환경변수").
// 없거나 형식이 틀리면 무엇을 넣어야 하는지 알려 주며 멈춘다.
const secret = readNextAuthSecret(process.env);
const counselorAccounts = parseCounselorAccounts(process.env.COUNSELOR_ACCOUNTS);

export const LOGIN_PATH = "/admin/login";

export const authOptions: NextAuthOptions = {
  secret,
  session: { strategy: "jwt" },
  pages: { signIn: LOGIN_PATH },
  providers: [
    CredentialsProvider({
      name: "상담원 로그인",
      credentials: {
        username: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const counselor = await verifyCounselorCredentials(
          counselorAccounts,
          credentials?.username ?? "",
          credentials?.password ?? "",
        );
        return counselor ? { id: counselor.counselorId, name: counselor.name } : null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.counselorId = user.id;
        token.counselorName = user.name ?? "";
      }
      return token;
    },
    session({ session, token }) {
      if (token.counselorId) {
        session.counselor = { counselorId: token.counselorId, name: token.counselorName ?? "" };
      }
      return session;
    },
  },
};

/** 로그인한 상담원. 세션이 없으면 `null` */
export async function getCounselor(): Promise<Counselor | null> {
  const session = await getServerSession(authOptions);
  return session?.counselor ?? null;
}

/** 서버 레이아웃·서버 액션용. 세션이 없으면 로그인 화면으로 보낸다 */
export async function requireCounselor(): Promise<Counselor> {
  const counselor = await getCounselor();
  if (!counselor) redirect(LOGIN_PATH);
  return counselor;
}
