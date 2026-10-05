import { defineConfig } from "vitest/config";

/** 단위 테스트: DB 불필요. 규칙 함수·설정 검증 (계획 01 §2). */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": new URL(".", import.meta.url).pathname },
  },
});
