/* ══════════════════════════════════════════════
   Instory Planner — keyboard.js
   버전: 1.2.0
   플레이 미리보기 키보드 단축키

     A  뒤로 가기       D  앞으로 가기
     W  스크롤 맨 위     S  스크롤 맨 아래

   설계 메모
   - `event.code`(물리 키 위치)로 판정한다. `event.key`를 쓰면 한글 IME가 켜져 있을 때
     'ㅁ'/'ㅇ' 등이 들어와 동작하지 않는다. code는 자판 배열·IME와 무관하다.
   - 입력 중(input/textarea/select/contentEditable)에는 절대 가로채지 않는다.
   - Ctrl/Alt/Meta 조합은 브라우저 단축키이므로 건드리지 않는다.
   - 미리보기 탭에서만 동작한다.
   ══════════════════════════════════════════════ */

const PREVIEW_KEYS = {
  KeyA: () => App.pvBack(),
  KeyD: () => App.pvForward(),
  KeyW: () => App.pvScrollTop(),
  KeyS: () => App.pvScrollBottom(),
};

/* 텍스트를 입력하는 중인가 */
function isTypingTarget(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = (el.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

function handlePreviewKey(e) {
  if (U.tab !== "preview") return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (isTypingTarget(e.target)) return;
  if (e.isComposing) return;              // 한글 조합 중

  const action = PREVIEW_KEYS[e.code];
  if (!action) return;

  e.preventDefault();                      // S 키 등으로 페이지가 스크롤되지 않도록
  action();
}

document.addEventListener("keydown", handlePreviewKey);
