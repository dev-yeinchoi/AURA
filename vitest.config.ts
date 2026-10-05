import { defineConfig } from "vitest/config";

/** 단위 테스트: DB 불필요. 규칙 함수·설정 검증 (계획 01 §2). */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname,
      // Next 가 컴파일 시 처리하는 모듈이므로 Node 런타임용 빈 스텁으로 바꾼다.
      "server-only": new URL("./tests/support/server-only.ts", import.meta.url).pathname,
    },
  },
});
