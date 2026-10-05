import { defineConfig } from "vitest/config";

/**
 * DB 테스트: 로컬 Supabase 스택이 떠 있어야 한다(`pnpm supabase start`).
 * 테스트는 계획 01 §4(배정 함수)에서 추가한다.
 * TODO: 체크포인트 3에서 테스트를 추가하면 passWithNoTests 를 제거한다.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    passWithNoTests: true,
    // 동시 RPC 호출 테스트가 있으므로 넉넉하게 둔다.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: { "@": new URL(".", import.meta.url).pathname },
  },
});
