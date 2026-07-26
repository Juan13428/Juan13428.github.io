/* ══════════════════════════════════════════════
   scripts/smoke-test.mjs
   버전: 1.5.0

   헤드리스(jsdom) 스모크 테스트. 앱을 실제로 띄우고
   드래그·키보드 이벤트를 발생시켜 동작을 검증한다.

   사용법
     npm i -D jsdom            (최초 1회)
     node scripts/smoke-test.mjs

   설계 원칙
     - 스크립트 목록을 하드코딩하지 않고 index.html의 <script> 순서를 그대로 읽는다.
       로드 등록을 빠뜨리면 여기서 잡힌다.
     - 실제 사용자의 느슨한 드래그(본문 밖으로 삐져나가는 선택)를 재현한다.
   ══════════════════════════════════════════════ */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let JSDOM;
try {
  ({ JSDOM } = await import("jsdom"));
} catch {
  console.error("jsdom이 필요합니다:  npm i -D jsdom");
  process.exit(1);
}

/* ── 하네스 ── */
function scriptPaths(html) {
  const out = [];
  const re = /<script\s+src="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) if (!/^https?:/.test(m[1])) out.push(m[1]);
  return out;
}

function boot({ fetchOk = true } = {}) {
  const html = readFileSync(join(ROOT, "index.html"), "utf8");
  const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/" });
  const { window } = dom;

  window.fetch = async (url) => {
    if (!fetchOk) throw new Error("fetch 불가 (file:// 모사)");
    const p = join(ROOT, url);
    if (!existsSync(p)) return { ok: false, status: 404 };
    return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(p, "utf8")) };
  };
  window.XLSX = { utils: {}, writeFile: () => {} };
  window.alert = () => {};
  window.confirm = () => true;

  const bundle = scriptPaths(html)
    .map(f => readFileSync(join(ROOT, f), "utf8"))
    .join("\n;\n");

  window.eval(bundle + `
    window.__t = { S, U, P, App, render, esc, escJs, effTags, computeHops, allClues,
      clueById, objectiveOfClue, activeObjective, isClueUnlocked, objectiveProgress,
      objectiveMaxHop, applyData, APP_VERSION, scrollFlag: () => resetFeedScroll };`);

  return { window, d: window.document, t: window.__t };
}

const defaultData = () => JSON.parse(readFileSync(join(ROOT, "data/default-data.json"), "utf8"));

function drag(ctx, postId, phrase) {
  const { d, window } = ctx;
  const body = d.querySelector(`.clue-text[data-post='${postId}'][data-comment='']`);
  if (!body) return false;
  const walker = d.createTreeWalker(body, window.NodeFilter.SHOW_TEXT, null);
  let node, offset = -1;
  while ((node = walker.nextNode())) {
    const i = node.textContent.indexOf(phrase);
    if (i !== -1) { offset = i; break; }
  }
  if (offset === -1) return false;
  const r = d.createRange();
  r.setStart(node, offset);
  r.setEnd(node, offset + phrase.length);
  const sel = window.getSelection();
  sel.removeAllRanges(); sel.addRange(r);
  d.dispatchEvent(new window.Event("mouseup", { bubbles: true }));
  return true;
}

function dragRange(ctx, postId, mk) {
  const { d, window } = ctx;
  const b = d.querySelector(`.clue-text[data-post='${postId}'][data-comment='']`);
  const r = d.createRange();
  mk(r, b, b.closest(".fp-caption"), b.closest(".feed-post"));
  const sel = window.getSelection();
  sel.removeAllRanges(); sel.addRange(r);
  d.dispatchEvent(new window.Event("mouseup", { bubbles: true }));
}

function press(ctx, code, target) {
  const ev = new ctx.window.KeyboardEvent("keydown", { code, bubbles: true, cancelable: true });
  (target || ctx.d.body).dispatchEvent(ev);
  return ev;
}

/* ── 리포터 ── */
let pass = 0, failed = 0;
const ok = (m) => { pass++; console.log("  ✅ " + m); };
const fail = (m) => { failed++; console.error("  ❌ " + m); };
const check = (cond, m, detail) => cond ? ok(m) : fail(m + (detail ? ` — ${detail}` : ""));
const group = (name) => console.log(`\n── ${name} ──`);

/* ── 실행 ── */
const ctx = boot();
await new Promise(r => setTimeout(r, 300));
const { d, window, t } = ctx;

group("부팅 · 데이터");
check(t.S.posts.length === 5, `게시글 ${t.S.posts.length}개 로드`);
check(t.S.profiles.length === 4, `프로필 ${t.S.profiles.length}개 로드`);
check(t.S.objectives.length === 3, `목표 ${t.S.objectives.length}개 로드`);
check(t.allClues().length === 9, `단서 ${t.allClues().length}개 로드 (본문+댓글)`);
check(d.querySelectorAll("#nav button").length === 5, "탭 5개 렌더");

group("file:// 폴백");
{
  const fb = boot({ fetchOk: false });
  await new Promise(r => setTimeout(r, 300));
  check(fb.t.S.posts.length === 5, "fetch 실패 시 폴백 데이터로 동작",
    `게시글 ${fb.t.S.posts.length}개`);
  const json = defaultData();
  check(JSON.stringify(fb.t.S.posts.map(p => p.id)) === JSON.stringify(json.posts.map(p => p.id)),
    "폴백 데이터가 JSON과 일치 (sync-fallback.mjs 실행 상태)");
}

group("단서 문구 정합성");
for (const c of t.allClues()) {
  check((c.host.text || "").includes(c.phrase),
    `"${c.phrase.slice(0, 12)}…" ${c.host.kind === "comment" ? "댓글" : "본문"}에 존재`, c.post.id);
}
check(t.allClues().every(c => t.objectiveOfClue(c.id)), "모든 단서가 목표에 배정됨");

group("목표 기반 잠금");
t.App.setTab("preview");
check(t.isClueUnlocked("clue_last_day"), "활성 목표 단서 → 잠금 해제");
check(!t.isClueUnlocked("clue_hidden_photo"), "비활성 목표 단서 → 잠김");
drag(ctx, "post_g2", "안 올릴 사진이 하나 있다");
check(!t.P.foundClues.has("clue_hidden_photo"), "잠긴 단서 드래그 → 무반응");
drag(ctx, "post_start", "다시 오긴 어렵겠지");
check(t.P.foundClues.has("clue_last_day"), "활성 단서 드래그 → 발견");
check(d.querySelector(".clue-highlight")?.textContent === "다시 오긴 어렵겠지", "형광펜 표시");

group("목표 완료 · 자동 진행");
drag(ctx, "post_g1", "잘 나온 건 몇 장 없지만");
check(t.P.clearedObjectives.includes("obj_last_day"), "목표 완료 기록");
check(t.P.activeObjectiveId === t.S.objectives[1].id, "다음 목표로 자동 전환");
check(t.isClueUnlocked("clue_alone_walk"), "다음 목표 단서 잠금 해제");

group("드래그 범위 견고성");
t.App.pvReset();
t.P.activeObjectiveId = "obj_hidden";
t.render();
/* 본문 맨 앞 단서는 굵은 사용자명 옆에서 시작한다 — v1.2.1 회귀 */
dragRange(ctx, "post_g2", (r, b, cap) => {
  r.setStart(cap.querySelector("b").firstChild, 0);
  r.setEnd(b.firstChild, 14);
});
check(t.P.foundClues.has("clue_hidden_photo"), "사용자명에서 시작한 드래그 → 맨 앞 단서 발견");

/* 본문 끝을 넘어 날짜까지 이어지는 드래그 (하이라이트가 생긴 뒤라 텍스트 노드를 찾아서 시작) */
t.App.pvReset(); t.P.activeObjectiveId = "obj_hidden"; t.render();
dragRange(ctx, "post_g2", (r, b, cap, art) => {
  const walker = d.createTreeWalker(b, window.NodeFilter.SHOW_TEXT, null);
  let n, off = -1;
  while ((n = walker.nextNode())) {
    const i = n.textContent.indexOf("지훈이가");
    if (i !== -1) { off = i; break; }
  }
  r.setStart(n, off);
  r.setEnd(art.querySelector(".fp-date").firstChild, 3);
});
check(t.P.foundClues.has("clue_asked_delete"), "본문 밖까지 이어진 드래그 → 발견");

/* 같은 게시글의 단서 2개를 연속으로 */
t.App.pvReset(); t.P.activeObjectiveId = "obj_hidden"; t.render();
drag(ctx, "post_g2", "안 올릴 사진이 하나 있다");
drag(ctx, "post_g2", "지훈이가 지워달라고 했으니까");
check(t.P.foundClues.size === 2, "같은 게시글 단서 2개 연속 발견", `${t.P.foundClues.size}개`);
check(d.querySelectorAll(".clue-text[data-post='post_g2'][data-comment=''] .clue-highlight").length === 2,
  "하이라이트 2개 유지");

group("해시태그와 함께 드래그 (v1.4.0)");
{
  const post = t.S.posts.find(p => p.id === "post_g1");
  const s0 = post.content.indexOf("잘 나온");
  const fresh = () => {
    t.App.setTab("preview"); t.App.pvReset(); t.render();
    return d.querySelector("[data-post='post_g1']");
  };
  const fire = (r) => {
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(r);
    d.dispatchEvent(new window.Event("mouseup", { bubbles: true }));
  };

  let b = fresh();
  let r = d.createRange();
  r.setStart(b.childNodes[0], s0); r.setEnd(b.childNodes[1].firstChild, 5);
  fire(r);
  check(t.P.foundClues.has("clue_few_frames"), "단서 + 해시태그 → 수집");

  b = fresh(); r = d.createRange();
  r.setStart(b.childNodes[0], s0); r.setEnd(b.childNodes[2], 6);
  fire(r);
  check(t.P.foundClues.has("clue_few_frames"), "단서 + 해시태그 + 뒷말 → 수집");

  /* 드래그 중 해시태그 위에서 손을 떼도 태그 페이지로 튀지 않아야 한다 */
  b = fresh(); r = d.createRange();
  r.setStart(b.childNodes[0], s0); r.setEnd(b.childNodes[1].firstChild, 5);
  const sel = window.getSelection();
  sel.removeAllRanges(); sel.addRange(r);
  t.App.pvGoTag("그날의빛");
  check(t.P.view.mode === "feed", "선택이 남아 있으면 해시태그 클릭 무시");
  sel.removeAllRanges();
  t.App.pvGoTag("그날의빛");
  check(t.P.view.mode === "tag", "선택이 없으면 정상 이동");
}

group("단서 여러 개 한 번에 수집 (v1.4.0)");
{
  const fire = (r) => {
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(r);
    d.dispatchEvent(new window.Event("mouseup", { bubbles: true }));
  };

  t.App.setTab("preview"); t.App.pvReset();
  t.P.activeObjectiveId = "obj_hidden"; t.render();
  let b = d.querySelector("[data-post='post_g2']");
  let r = d.createRange();
  r.selectNodeContents(b);
  fire(r);
  check(t.P.foundClues.size === 2, "같은 게시글 단서 2개 동시 수집",
    `${t.P.foundClues.size}개`);
  check(d.querySelectorAll("[data-post='post_g2'] .clue-highlight").length === 2,
    "둘 다 하이라이트");

  t.App.pvReset(); t.P.activeObjectiveId = "obj_dawn"; t.render();
  b = d.querySelector("[data-post='post_j1']");
  r = d.createRange(); r.selectNodeContents(b);
  fire(r);
  check(t.P.foundClues.size === 2, "다른 게시글에서도 2개 동시 수집",
    `${t.P.foundClues.size}개`);

  /* 잠긴 단서는 함께 긁어도 열리지 않는다 */
  t.App.pvReset(); t.P.activeObjectiveId = "obj_last_day"; t.render();
  b = d.querySelector("[data-post='post_g2']");
  r = d.createRange(); r.selectNodeContents(b);
  fire(r);
  check(t.P.foundClues.size === 0, "잠긴 단서는 동시 드래그로도 안 열림");
}

group("과대선택 방지 (완화된 규칙)");
{
  const fire = (r) => {
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(r);
    d.dispatchEvent(new window.Event("mouseup", { bubbles: true }));
  };

  /* 긴 본문에서 짧은 단서 하나만 노리고 전체를 긁는 것은 여전히 차단 */
  t.applyData({
    profiles: [{ id: "p1", name: "A", handle: "a", color: "#000" }],
    posts: [{
      id: "lp", authorId: "p1", date: "2025-01-01", hashtags: ["t"],
      content: "요즘 날씨가 참 좋아서 산책을 자주 나간다. 아침마다 같은 길을 걷는데 어제는 조금 달랐다. "
             + "그 사람을 봤다. 그리고 계속 걸었다. 별일 아니겠지 싶었지만 하루종일 마음에 남았다.",
      clues: [{ id: "k1", phrase: "그 사람을 봤다" }],
    }],
    objectives: [{ id: "o1", title: "O", clueIds: ["k1"] }],
    startPostId: "lp", activeObjectiveId: "o1",
  });
  t.App.setTab("preview");
  let b = d.querySelector("[data-post='lp']");
  let r = d.createRange(); r.selectNodeContents(b);
  fire(r);
  check(t.P.foundClues.size === 0, "긴 본문 전체 긁기 → 차단");
  check(!!t.P.hint, "기획자 뷰에 과대선택 안내 표시");
  check(!!d.querySelector(".hint-bar"), "안내 배너 렌더");

  t.App.pvReset(); t.P.activeObjectiveId = "o1"; t.render();
  b = d.querySelector("[data-post='lp']");
  const i = b.textContent.indexOf("그 사람을 봤다");
  r = d.createRange();
  r.setStart(b.firstChild, i - 5); r.setEnd(b.firstChild, i + 15);
  fire(r);
  check(t.P.foundClues.size === 1, "단서 주변 느슨한 드래그 → 수집");

  /* 피드 전체 선택은 여러 게시글에 걸치므로 차단 */
  t.applyData(defaultData());
  t.App.setTab("preview"); t.App.pvReset(); t.render();
  r = d.createRange(); r.selectNodeContents(d.querySelector(".phone-feed"));
  fire(r);
  check(t.P.foundClues.size === 0, "피드 전체 선택 → 차단 (여러 게시글)");
}

group("선택 경계 형태 (v1.3.1 회귀)");
/* 브라우저는 선택 경계의 컨테이너로 요소 노드를 자주 준다.
   특히 첫 단서가 하이라이트 span으로 바뀐 뒤에 그렇다.
   getCharOffset이 텍스트 노드만 처리하면 여기서 두 번째 단서가 영영 안 잡힌다. */
{
  const POST = "post_g2";
  const C1 = "안 올릴 사진이 하나 있다";
  const C2 = "지훈이가 지워달라고 했으니까";
  const content = t.S.posts.find(p => p.id === POST).content;
  const restOffset = content.indexOf(C2) - C1.length;   // 하이라이트 뒤 텍스트 노드 내 위치

  const withFirstFound = () => {
    t.App.setTab("preview");
    t.App.pvReset();
    t.P.activeObjectiveId = "obj_hidden";
    t.render();
    drag(ctx, POST, C1);
    return d.querySelector(`.clue-text[data-post='${POST}'][data-comment='']`);
  };

  const shapes = [
    ["텍스트 노드 내부", (r, b) => {
      const n = b.childNodes[1];
      r.setStart(n, restOffset); r.setEnd(n, restOffset + C2.length);
    }],
    ["시작이 요소 노드 (본문 span, 1)", (r, b) => {
      r.setStart(b, 1); r.setEnd(b.childNodes[1], restOffset + C2.length);
    }],
    ["끝이 요소 노드 (본문 span, 2)", (r, b) => {
      r.setStart(b.childNodes[1], restOffset); r.setEnd(b, 2);
    }],
    ["양쪽 모두 요소 노드", (r, b) => { r.setStart(b, 1); r.setEnd(b, 2); }],
    ["하이라이트 span 내부에서 시작", (r, b) => {
      r.setStart(b.childNodes[0].firstChild, 5);
      r.setEnd(b.childNodes[1], restOffset + C2.length);
    }],
    ["span 요소 경계에서 시작", (r, b) => {
      r.setStart(b.childNodes[0], 1);
      r.setEnd(b.childNodes[1], restOffset + C2.length);
    }],
    ["사용자명(<b>)부터 이어진 선택", (r, b) => {
      r.setStart(b.closest(".fp-caption"), 0);
      r.setEnd(b.childNodes[1], restOffset + C2.length);
    }],
    ["본문 밖(날짜)까지 이어진 선택", (r, b) => {
      r.setStart(b.childNodes[1], restOffset);
      r.setEnd(b.closest(".feed-post").querySelector(".fp-date").firstChild, 3);
    }],
  ];

  for (const [label, mk] of shapes) {
    const b = withFirstFound();
    const r = d.createRange();
    mk(r, b);
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(r);
    d.dispatchEvent(new window.Event("mouseup", { bubbles: true }));
    check(t.P.foundClues.has("clue_asked_delete"), `2번째 단서 수집 — ${label}`);
  }
}

group("한 게시글 단서 3개 순차 수집");
{
  t.applyData({
    profiles: [{ id: "p1", name: "A", handle: "a", color: "#000" }],
    posts: [{
      id: "pp", authorId: "p1", date: "2025-01-01", hashtags: ["t"],
      content: "첫째 단서 여기. 둘째 단서 저기. 셋째 단서 거기.",
      clues: [
        { id: "k1", phrase: "첫째 단서 여기" },
        { id: "k2", phrase: "둘째 단서 저기" },
        { id: "k3", phrase: "셋째 단서 거기" },
      ],
    }],
    objectives: [{ id: "o1", title: "O", clueIds: ["k1", "k2", "k3"] }],
    startPostId: "pp", activeObjectiveId: "o1",
  });
  t.App.setTab("preview");
  ["첫째 단서 여기", "둘째 단서 저기", "셋째 단서 거기"].forEach((ph, i) => {
    drag(ctx, "pp", ph);
    check(t.P.foundClues.size === i + 1, `${i + 1}번째 수집 → 누적 ${t.P.foundClues.size}개`);
  });
  check(d.querySelectorAll(".clue-text[data-post='pp'][data-comment=''] .clue-highlight").length === 3,
    "하이라이트 3개 모두 유지");
  t.applyData(defaultData());
}

group("댓글 작성자 → 프로필 이동 (v1.5.0)");
{
  t.App.setTab("preview"); t.App.pvReset(); t.render();
  t.App.pvToggleComments("post_start");
  const link = d.querySelector(".fp-cmt-author");
  check(!!link, "프로필과 연결된 댓글 작성자는 링크로 렌더");
  if (link) {
    const id = link.getAttribute("onclick").match(/'([^']+)'/)[1];
    t.App.pvGoProfile(id);
    check(t.P.view.mode === "profile" && t.P.view.profileId === "p_gaeun",
      "작성자 클릭 → 해당 프로필로 이동", JSON.stringify(t.P.view));
  }
  /* 프로필에 없는 핸들은 링크가 아니어야 한다 */
  t.applyData({
    profiles: [{ id: "p1", name: "A", handle: "a", color: "#000" }],
    posts: [{ id: "pp", authorId: "p1", date: "2025-01-01", hashtags: ["t"], content: "본문",
      comments: [{ id: "cc", author: "모르는사람", text: "안녕", likes: 0 }] }],
    objectives: [], startPostId: "pp",
  });
  t.App.setTab("preview"); t.App.pvToggleComments("pp");
  check(!d.querySelector(".fp-cmt-author"), "프로필 없는 작성자는 링크 아님");
  t.applyData(defaultData());
}

group("댓글 단서 수집 (v1.5.0)");
{
  const fire = (r) => {
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(r);
    d.dispatchEvent(new window.Event("mouseup", { bubbles: true }));
  };
  const commentSpan = (match) => Array.from(
    d.querySelectorAll('[data-comment]:not([data-comment=""])')
  ).find(e => e.textContent.includes(match));

  t.App.setTab("preview"); t.App.pvReset();
  t.P.activeObjectiveId = "obj_dawn"; t.render();

  check(!!d.querySelector(".cmt-hint"), "댓글 속 활성 단서를 접힌 상태에서 알림");

  t.App.pvToggleComments("post_j1");
  const span = commentSpan("그날도 오빠 혼자였어");
  check(!!span, "댓글에 판정 영역(data-comment) 부여");
  if (span) {
    check(span.dataset.post === "post_j1" && span.dataset.comment === "c_j1_1",
      "판정 영역이 올바른 게시글·댓글을 가리킴");
    const txt = span.firstChild.textContent;
    const i = txt.indexOf("그날도 오빠 혼자였어");
    const r = d.createRange();
    r.setStart(span.firstChild, i); r.setEnd(span.firstChild, i + 10);
    fire(r);
    check(t.P.foundClues.has("clue_alone_that_day"), "댓글 드래그 → 단서 수집");
    check(d.querySelectorAll('[data-comment]:not([data-comment=""]) .clue-highlight').length === 1,
      "댓글 안에 형광펜 표시");
    check(!!d.querySelector(".cmt-clue-badge"), "댓글 단서 진행 배지");
  }

  /* 다른 목표에 속한 댓글 단서는 잠겨 있어야 한다 */
  t.App.pvReset(); t.P.activeObjectiveId = "obj_dawn"; t.render();
  t.App.pvToggleComments("post_g2");
  const locked = commentSpan("지훈이 방 아직 그대로야");
  if (locked) {
    const tx = locked.firstChild.textContent;
    const j = tx.indexOf("지훈이 방 아직 그대로야");
    const r2 = d.createRange();
    r2.setStart(locked.firstChild, j); r2.setEnd(locked.firstChild, j + 12);
    fire(r2);
  }
  check(!t.P.foundClues.has("clue_room_intact"), "잠긴 댓글 단서는 열리지 않음");

  /* 본문과 댓글에 걸친 선택은 무시 */
  t.App.pvReset(); t.P.activeObjectiveId = "obj_dawn"; t.render();
  t.App.pvToggleComments("post_j1");
  const art = d.querySelector("[data-post='post_j1']").closest(".feed-post");
  const r3 = d.createRange(); r3.selectNodeContents(art);
  fire(r3);
  check(t.P.foundClues.size === 0, "본문+댓글에 걸친 선택 → 차단");
  t.applyData(defaultData());
}

group("키보드 단축키");
t.App.pvReset();
t.App.pvGoTag("필름사진");
t.App.pvGoProfile("p_gaeun");
press(ctx, "KeyA");
check(t.P.view.mode === "tag", "A → 뒤로");
press(ctx, "KeyD");
check(t.P.view.mode === "profile", "D → 앞으로");
const jumps = t.P.tagJumps;
press(ctx, "KeyA"); press(ctx, "KeyD");
check(t.P.tagJumps === jumps, "뒤로/앞으로는 이동 횟수 미증가");
{
  const feed = d.querySelector(".phone-feed");
  Object.defineProperty(feed, "scrollHeight", { value: 2000, configurable: true });
  feed.scrollTop = 500;
  press(ctx, "KeyW");
  check(feed.scrollTop === 0, "W → 스크롤 맨 위");
  press(ctx, "KeyS");
  check(feed.scrollTop === 2000, "S → 스크롤 맨 아래");
}
{
  const inp = d.createElement("input");
  d.body.appendChild(inp);
  const before = JSON.stringify(t.P.view);
  press(ctx, "KeyA", inp);
  check(JSON.stringify(t.P.view) === before, "입력창 포커스 → 단축키 무시");
  inp.remove();
}
t.App.setTab("posts");
{
  const before = JSON.stringify(t.P.view);
  press(ctx, "KeyA");
  check(JSON.stringify(t.P.view) === before, "미리보기 외 탭 → 단축키 무시");
}

group("보안 (인라인 핸들러 이스케이프)");
{
  const payload = "x'),window.__pwn(),('";
  t.applyData({
    profiles: [{ id: payload, name: "공격", handle: "x", color: "#000" }],
    posts: [], objectives: [],
  });
  t.App.setTab("profiles");
  const attr = d.querySelector(".profile-card .btn.red").getAttribute("onclick");
  check(/^App\.delProfile\('(?:[^'\\]|\\.)*'\)$/.test(attr),
    "import한 id가 JS 문자열을 탈출하지 못함", attr);

  t.applyData(defaultData());
  t.S.posts[0].hashtags = [payload];
  t.App.setTab("preview");
  const tagAttr = Array.from(d.querySelectorAll(".fp-tags .fp-tag"))
    .map(e => e.getAttribute("onclick")).find(a => a.includes("pwn"));
  check(!tagAttr || /^App\.pvGoTag\('(?:[^'\\]|\\.)*'\)$/.test(tagAttr),
    "해시태그 입력이 JS 문자열을 탈출하지 못함", tagAttr);

  t.applyData(defaultData());
  t.S.posts[0].content = '<img src=x onerror=alert(1)>';
  t.App.setTab("preview");
  check(!d.querySelector(".clue-text img"), "본문 HTML 이스케이프");
}

group("구버전 스키마 마이그레이션");
t.applyData({
  profiles: [{ id: "p_x", name: "구", handle: "old", color: "#000" }],
  posts: [{ id: "post_x", authorId: "p_x", content: "옛날 본문 단서A", cluePhrases: ["단서A"] }],
  startPostId: "post_x",
});
check(t.S.posts[0].clues?.length === 1 && t.S.posts[0].clues[0].id, "cluePhrases → clues 변환");
check(!t.S.posts[0].cluePhrases, "구 필드 제거");
t.applyData({ profiles: [], posts: [], objectives: [{ id: "o1", title: "T", clueIds: ["ghost"] }] });
check(t.S.objectives[0].clueIds.length === 0, "유령 clueId 참조 제거");

group("탐색 그래프 · 검증");
t.applyData(defaultData());
{
  const hops = t.computeHops();
  check(hops["post_start"] === 0 && hops["post_g2"] === 2, "홉 계산 (BFS)",
    JSON.stringify(hops));
  const tags = t.effTags(t.S.posts.find(p => p.id === "post_g1"));
  check(tags.includes("그날의빛") && tags.includes("흑역사"), "본문·댓글 인라인 태그 인식");
  t.App.setTab("analysis");
  check(d.querySelectorAll(".warn-row.err").length === 0, "기본 데이터 오류 0건");
  check(d.querySelectorAll(".stat").length > 0, "요약 통계 렌더");
}

group("UI 상태 보존");
t.App.setTab("preview");
t.App.pvToggleComments("post_start");
check(t.scrollFlag() === false, "댓글 토글 시 스크롤 리셋 안 함");
check(d.querySelectorAll(".fp-comment").length === 2, "댓글 펼침");
t.App.pvGoTag("필름사진");
check(d.querySelectorAll(".fp-tag.visited").length > 0, "방문 태그 회색 처리");

/* ── 결과 ── */
console.log(`\n${failed ? "❌" : "✅"} ${pass}개 통과${failed ? `, ${failed}개 실패` : ""}`);
process.exit(failed ? 1 : 0);
