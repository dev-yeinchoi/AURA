/**
 * Next.js 는 `server-only` 를 컴파일러 레벨에서 처리하므로 Node 런타임에서는
 * 해석되지 않는다. Vitest 에서 server/ 모듈을 그대로 테스트하기 위한 빈 스텁이다.
 * 실제 유출 방지는 빌드(server-only), ESLint, check:bundle 세 장치가 담당한다.
 */
export {};
