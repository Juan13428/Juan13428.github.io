/* ══════════════════════════════════════════════
   Instory Planner — state.js
   버전: 1.5.0
   전역 상태 · 공용 유틸 · 데이터 로드
   ══════════════════════════════════════════════ */

/* ── 상수 ── */
const APP_VERSION = "1.5.0";
const C_EVENTS = ["C1", "C2", "C3", "C4", "C5"];
const DATA_URL = "data/default-data.json";
/* 본문·댓글 안에 직접 쓴 해시태그를 찾는 패턴 (영문·숫자·밑줄·한글) */
const TAG_RE = /#([0-9A-Za-z_가-힣]+)/g;

/* 단서 판정 밸런싱 값 —
   선택 영역에서 '단서가 아닌 부분'의 허용 길이.
   해시태그·조사·문장부호가 함께 잡히는 것은 정상이므로 넉넉히 준다.
   단서 여러 개를 한 번에 드래그하면 그 길이는 모두 '단서 부분'으로 계산되므로
   사이 간격만 이 예산에 들어간다.
   본문을 통째로 긁어 쓸어담는 것만 걸러내는 용도다. Infinity로 두면 제한 해제. */
const CLUE_SELECTION_SLACK = 40;

/* ── 기획 데이터 (JSON에서 로드, 편집 대상) ── */
const S = {
  profiles: [],
  posts: [],
  objectives: [],        // 단서 찾기 목표
  startPostId: "",
  activeObjectiveId: "",  // 기본으로 활성화되는 목표
};

/* ── UI 상태 (저장 대상 아님) ── */
const U = {
  tab: "posts",         // posts | profiles | analysis | preview
  openId: null,         // 펼쳐진 게시글 id
  filterAuthor: "all",
  clueOnly: false,
  search: "",
};

/* ── 플레이 미리보기 상태 (저장 대상 아님) ── */
const P = {
  view: { mode: "feed" },  // feed | tag | profile
  history: [],             // 뒤로 갈 화면 (A 키)
  forward: [],             // 앞으로 갈 화면 (D 키) — 새 이동 시 비워진다
  tagJumps: 0,
  showClues: true,
  openComments: {},        // postId -> bool
  visited: {},             // tag -> true (한 번이라도 들어간 해시태그)
  foundClues: new Set(),   // 발견한 단서 id 집합
  clearedObjectives: [],   // 완료한 목표 id (완료 순서)
  activeObjectiveId: "",   // 현재 진행 중인 목표 (빈 문자열이면 전체 잠금)
  autoAdvance: true,       // 목표 완료 시 다음 목표로 자동 전환
  hint: null,              // 기획자 뷰 안내 문구 (과대선택 등)
  _justFound: null,        // { ids:Set } — sweep 애니메이션 1회용
};

/* 화면 전환 시에만 피드 스크롤을 최상단으로 되돌린다 */
let resetFeedScroll = false;
function requestFeedScrollReset() { resetFeedScroll = true; }

/* ── file:// 폴백 데이터 ──
   data/default-data.js가 전역 FALLBACK_DATA를 정의한다 (index.html에서 먼저 로드).
   그 파일은 자동 생성물이므로 손대지 말 것 —
   기본 데이터는 data/default-data.json에서 고치고 `node scripts/sync-fallback.mjs` 실행. */
function fallbackData() {
  return (typeof FALLBACK_DATA !== "undefined")
    ? JSON.parse(JSON.stringify(FALLBACK_DATA))
    : { profiles: [], posts: [], objectives: [], startPostId: "", activeObjectiveId: "" };
}

/* ── 공용 유틸 ── */
const uid = () => Math.random().toString(36).slice(2, 9);

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* 인라인 이벤트 핸들러의 JS 문자열 리터럴에 값을 넣을 때 사용한다.
   esc()는 작은따옴표를 처리하지 않으므로, onclick="App.f('${esc(v)}')" 형태는
   v에 '가 들어오면 문자열을 탈출해 임의 코드가 실행된다.
   해시태그 입력값과 import한 JSON의 id가 실제로 이 경로를 탄다. */
function escJs(v) {
  return esc(String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029"));
}

function profById(id) { return S.profiles.find(p => p.id === id); }
function postById(id) { return S.posts.find(p => p.id === id); }

/* "#a, b  #c" 또는 "#a#b" -> ["a","b","c"] (중복 제거)
   구분자뿐 아니라 붙여 쓴 #도 경계로 본다. */
function normTags(raw) {
  return Array.from(new Set(
    String(raw || "")
      .split(/[,\s]+|(?=#)/)
      .map(t => t.replace(/^#/, "").trim())
      .filter(Boolean)
  ));
}

/* 텍스트 안에 직접 쓴 #태그만 추출 */
function inlineTags(text) {
  const out = [];
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(String(text || "")))) out.push(m[1]);
  return out;
}

/* 게시글의 유효 태그 = 태그 필드 + 본문 인라인 + 댓글 인라인 (합집합) */
function effTags(p) {
  return Array.from(new Set([
    ...(p.hashtags || []),
    ...inlineTags(p.content),
    ...(p.comments || []).flatMap(c => inlineTags(c.text)),
  ]));
}

function avatarHtml(pr, size, ring) {
  const c = (pr && pr.color) || "#8e8e8e";
  const ch = esc(((pr && pr.name) || "?").slice(0, 1));
  const core = `<div class="avatar" style="width:${size}px;height:${size}px;` +
    `background:${c}1a;color:${c};font-size:${Math.round(size * 0.42)}px">${ch}</div>`;
  return ring ? `<span class="ring">${core}</span>` : core;
}

/* ── 탐색 그래프 ──
   해시태그를 공유하는 게시글끼리 연결하고, 시작 게시글에서의 최단 홉을 BFS로 구한다. */
function computeHops() {
  const start = S.startPostId;
  if (!start || !S.posts.some(p => p.id === start)) return {};

  const tagMap = {};
  S.posts.forEach(p => effTags(p).forEach(t => { (tagMap[t] = tagMap[t] || []).push(p.id); }));

  const adj = {};
  Object.values(tagMap).forEach(ids => {
    ids.forEach(a => ids.forEach(b => { if (a !== b) (adj[a] = adj[a] || new Set()).add(b); }));
  });

  const hops = { [start]: 0 };
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    (adj[cur] ? Array.from(adj[cur]) : []).forEach(next => {
      if (!(next in hops)) { hops[next] = hops[cur] + 1; queue.push(next); }
    });
  }
  return hops;
}

/* 태그 -> 게시글 배열 */
function tagMapAll() {
  const m = {};
  S.posts.forEach(p => effTags(p).forEach(t => { (m[t] = m[t] || []).push(p); }));
  return m;
}

/* ══ 목표(Objective) · 단서(Clue) 헬퍼 ══ */

function objById(id) { return S.objectives.find(o => o.id === id); }

/* ── 단서 호스트 ──
   단서는 게시글 본문과 댓글 양쪽에 붙을 수 있다.
   둘을 같은 모양으로 다뤄 판정·검증·렌더가 갈라지지 않게 한다. */
function clueHosts(post) {
  return [
    { kind: "content", id: "", text: post.content || "", clues: post.clues || [], post },
    ...(post.comments || []).map(c => ({
      kind: "comment", id: c.id, text: c.text || "", clues: c.clues || [], post, comment: c,
    })),
  ];
}

/* postId + commentId(빈 문자열이면 본문)로 호스트를 찾는다 */
function hostOf(postId, commentId) {
  const p = postById(postId);
  if (!p) return null;
  return clueHosts(p).find(h => h.id === (commentId || "")) || null;
}

/* 전체 단서를 소속 위치와 함께 평탄화 */
function allClues() {
  return S.posts.flatMap(p =>
    clueHosts(p).flatMap(h => h.clues.map(c => ({ ...c, post: p, host: h })))
  );
}

function clueById(id) {
  for (const p of S.posts) {
    for (const h of clueHosts(p)) {
      const c = h.clues.find(x => x.id === id);
      if (c) return { ...c, post: p, host: h };
    }
  }
  return null;
}

/* 목록·경고에 쓸 위치 표시 */
function clueLocation(entry) {
  const h = entry && entry.host;
  if (!h) return "";
  return h.kind === "comment" ? `댓글 @${h.comment.author || "?"}` : "본문";
}

/* 핸들로 프로필 찾기 (댓글 작성자 → 프로필 이동) */
function profByHandle(handle) {
  const key = String(handle || "").replace(/^@/, "").trim().toLowerCase();
  if (!key) return null;
  return S.profiles.find(p => String(p.handle || "").toLowerCase() === key) || null;
}

/* 이 단서를 요구하는 목표 (한 단서는 최대 1개 목표에만 속함) */
function objectiveOfClue(clueId) {
  return S.objectives.find(o => o.clueIds.includes(clueId));
}

/* 현재 활성 목표 (플레이 미리보기 기준) */
function activeObjective() { return objById(P.activeObjectiveId); }

/* 지금 드래그로 찾을 수 있는 단서인가 — 활성 목표에 속해야만 활성화된다 */
function isClueUnlocked(clueId) {
  const obj = activeObjective();
  return !!obj && obj.clueIds.includes(clueId);
}

/* 목표 진행도: { found, total, done } */
function objectiveProgress(obj) {
  if (!obj) return { found: 0, total: 0, done: false };
  const total = obj.clueIds.length;
  const found = obj.clueIds.filter(id => P.foundClues.has(id)).length;
  return { found, total, done: total > 0 && found === total };
}

/* 목표를 클리어하는 데 필요한 최대 홉 (탐색 난이도 지표) */
function objectiveMaxHop(obj, hops) {
  let max = null;
  (obj.clueIds || []).forEach(id => {
    const c = clueById(id);
    if (!c) return;
    const h = (c.post.id in hops) ? hops[c.post.id] : null;
    if (h === null) { max = "도달불가"; return; }
    if (max !== "도달불가") max = (max === null) ? h : Math.max(max, h);
  });
  return max;
}

/* 아직 완료하지 않은 다음 목표 */
function nextOpenObjective(afterId) {
  const idx = S.objectives.findIndex(o => o.id === afterId);
  const rotated = S.objectives.slice(idx + 1).concat(S.objectives.slice(0, Math.max(idx, 0)));
  return rotated.find(o => !objectiveProgress(o).done) || null;
}

/* 플레이 상태 초기화 (데이터 교체·리셋 공용) */
function resetPlayState() {
  P.view = { mode: "feed" };
  P.history = [];
  P.forward = [];
  P.tagJumps = 0;
  P.openComments = {};
  P.visited = {};
  P.foundClues = new Set();
  P.clearedObjectives = [];
  P.hint = null;
  P.activeObjectiveId = S.activeObjectiveId;
  P._justFound = null;
}

/* ── 데이터 적용 / 로드 ── */

/* 구버전 스키마 흡수:
   - posts[].cluePhrases: string[]  ->  posts[].clues: [{id, phrase, note}]
   - objectives / activeObjectiveId 누락 시 빈 값으로 생성
   - 존재하지 않는 단서를 가리키는 clueIds(유령 참조)는 제거
   - 한 단서는 최대 하나의 목표에만 속한다 (중복 소속 시 첫 목표 우선) */
function applyData(d) {
  if (!d) return;

  S.profiles = Array.isArray(d.profiles) ? d.profiles : [];

  S.posts = (Array.isArray(d.posts) ? d.posts : []).map(p => {
    const post = {
      hashtags: [], comments: [], likes: 0,
      isClue: false, clueEvent: "C1", clueNote: "", imageDesc: "",
      ...p,
    };
    const normClues = (list, legacy) => {
      if (Array.isArray(list)) {
        return list.map(c => ({ id: c.id || "clue_" + uid(), phrase: c.phrase || "", note: c.note || "" }));
      }
      if (Array.isArray(legacy)) {
        return legacy.filter(Boolean).map(phrase => ({ id: "clue_" + uid(), phrase, note: "" }));
      }
      return [];
    };

    post.clues = normClues(post.clues, post.cluePhrases);
    delete post.cluePhrases;

    post.comments = (post.comments || []).map(c => ({
      id: c.id || "c_" + uid(), author: c.author || "", text: c.text || "", likes: c.likes || 0,
      clues: normClues(c.clues),
    }));

    return post;
  });

  const validIds = new Set(allClues().map(c => c.id));
  const taken = new Set();
  S.objectives = (Array.isArray(d.objectives) ? d.objectives : []).map(o => {
    const ids = (Array.isArray(o.clueIds) ? o.clueIds : [])
      .filter(id => validIds.has(id) && !taken.has(id));
    ids.forEach(id => taken.add(id));
    return {
      id: o.id || "obj_" + uid(),
      title: o.title || "새 목표",
      desc: o.desc || "",
      event: o.event || "C1",
      clueIds: ids,
    };
  });

  S.startPostId = d.startPostId || "";
  S.activeObjectiveId = objById(d.activeObjectiveId) ? d.activeObjectiveId
    : ((S.objectives[0] || {}).id || "");

  resetPlayState();
}

let usedFallback = false;

async function loadDefaultData() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    applyData(await res.json());
  } catch (e) {
    /* file:// 로 직접 열었거나 fetch 실패 -> 폴백 사용 */
    console.warn("기본 데이터 로드 실패, 폴백 사용:", e.message);
    applyData(fallbackData());
    usedFallback = true;
  }
}
