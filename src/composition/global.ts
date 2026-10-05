// Next.js 개발 서버는 핫 리로드 때 모듈을 다시 평가한다.
// 저장소와 유스케이스가 새로 만들어져 메모리 데이터가 사라지지 않도록 globalThis에 하나만 둔다.
const store = globalThis as unknown as Record<string, unknown>;

export function globalSingleton<T>(key: string, create: () => T): T {
  if (!(key in store)) store[key] = create();
  return store[key] as T;
}
