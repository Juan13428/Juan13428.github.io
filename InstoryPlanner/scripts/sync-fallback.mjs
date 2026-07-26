/* ══════════════════════════════════════════════
   scripts/sync-fallback.mjs
   버전: 1.5.0

   data/default-data.json  →  data/default-data.js 재생성

   왜 필요한가
     앱은 기본 데이터를 fetch로 읽는다. 그런데 index.html을 file://로 직접 열면
     fetch가 막히므로, 같은 내용을 <script>로 실어둔 폴백이 필요하다.
     그 폴백을 손으로 관리하면 조용히 어긋난다. 이 스크립트로만 갱신할 것.

   사용법
     node scripts/sync-fallback.mjs          갱신
     node scripts/sync-fallback.mjs --check  갱신 필요 여부만 확인 (CI/테스트용)
   ══════════════════════════════════════════════ */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = join(ROOT, "data", "default-data.json");
const JS_PATH = join(ROOT, "data", "default-data.js");

const data = JSON.parse(readFileSync(JSON_PATH, "utf8"));

const output = `/* ══════════════════════════════════════════════
   Instory Planner — data/default-data.js
   ⚠ 자동 생성 파일 — 직접 수정하지 마세요.

   기본 데이터는 data/default-data.json에서 수정하고,
   아래 명령으로 이 파일을 다시 만드세요.

     node scripts/sync-fallback.mjs

   이 파일은 index.html을 file://로 직접 열었을 때(fetch 불가)
   쓰이는 폴백입니다. HTTP로 열면 .json 쪽이 우선합니다.
   ══════════════════════════════════════════════ */

const FALLBACK_DATA = ${JSON.stringify(data, null, 2)};
`;

if (process.argv.includes("--check")) {
  let current = "";
  try { current = readFileSync(JS_PATH, "utf8"); } catch { /* 파일 없음 */ }
  if (current !== output) {
    console.error("❌ data/default-data.js 가 JSON과 어긋났습니다.");
    console.error("   node scripts/sync-fallback.mjs 를 실행하세요.");
    process.exit(1);
  }
  console.log("✅ data/default-data.js 동기화 상태 정상");
} else {
  writeFileSync(JS_PATH, output, "utf8");
  console.log(`✅ data/default-data.js 생성 — 프로필 ${data.profiles.length} · 게시글 ${data.posts.length} · 목표 ${data.objectives.length}`);
}
