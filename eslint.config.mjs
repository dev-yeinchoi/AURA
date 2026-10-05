import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * 자극물·규칙 유출 방지 (CLAUDE.md 실험 무결성 규칙 2)
 *
 * 1차 방어선은 `server/` 파일마다 넣는 `import 'server-only'`이고,
 * 아래 규칙은 그 전에 import 자체를 막는 2차 방어선이다.
 * 빌드 산출물 검사는 `pnpm check:bundle`이 담당한다.
 *
 * no-restricted-imports 는 뒤에 오는 설정이 앞 설정을 완전히 덮으므로,
 * 범위가 좁은 블록에서는 패턴을 합쳐서 넘긴다.
 */
const NO_DATA = {
  group: ["@/data/*", "@/data/**", "**/data/stimuli/*"],
  message:
    "data/stimuli/ 는 server/stimuli/ 의 로더에서만 읽는다. 클라이언트 번들에 들어가면 안 된다.",
};

const NO_SERVER = {
  group: ["@/server/*", "@/server/**", "**/server/rules/*", "**/server/db/*"],
  message:
    "server/ 모듈은 서버 컴포넌트·Route Handler·Server Action에서만 import한다.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "supabase/.temp/**",
  ]),
  {
    name: "aura/no-stimuli-imports",
    files: ["**/*.{ts,tsx,mts}"],
    ignores: ["server/stimuli/**", "tests/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [NO_DATA] }],
    },
  },
  {
    name: "aura/client-shared-boundaries",
    files: [
      "components/**/*.{ts,tsx}",
      "lib/**/*.ts",
      "config/**/*.ts",
      "content/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": ["error", { patterns: [NO_DATA, NO_SERVER] }],
    },
  },
]);

export default eslintConfig;
