# builder-toy

아정당 AI Builder 온보딩 연습 프로젝트 — 「아정당 미니: 인터넷·TV 가입 상담 + 지원금」

- 플랜: [`_docs/PLAN.md`](_docs/PLAN.md)
- 작업 보드: [`docs/board.md`](docs/board.md)
- 세션 역할: [`.claude/roles/`](.claude/roles/)

herdr 세션 4개(Orchestrator, Builder A, Builder B, Checker)가 역할을 나눠 협업합니다. 운영 방식은 PLAN 8절을 참고하세요.

## 로컬 환경변수
시크릿과 상담원 계정은 저장소에 두지 않고 `.env.local`(커밋 안 됨)에서 읽습니다. 값이 없거나 형식이 틀리면 어드민 로그인이 무엇을 넣어야 하는지 알려 주며 멈춥니다.

1. `cp .env.example .env.local`
2. `NEXTAUTH_SECRET`: `openssl rand -base64 32` 결과를 넣습니다.
3. `COUNSELOR_ACCOUNTS`: 비밀번호마다 `npm run hash-password -- '<비밀번호>'`로 해시를 만들어 JSON 배열 한 줄로 넣습니다. 평문 비밀번호는 넣지 않습니다.
4. E2E를 돌리려면 `E2E_PORT`(Builder A 3101, Builder B 3102)와 `E2E_COUNSELOR_USERNAME`·`E2E_COUNSELOR_PASSWORD`(위 계정의 원래 비밀번호)를 채웁니다. `E2E_SEED_ENABLED`는 비워 둡니다. playwright가 E2E 서버에만 넘깁니다.

`.env.local`은 폴더마다 따로 있습니다. 원본 폴더와 다른 worktree에서는 이미 준비한 폴더의 파일을 복사해 씁니다.

```bash
cp <준비한 폴더>/.env.local <worktree 경로>/.env.local
```
