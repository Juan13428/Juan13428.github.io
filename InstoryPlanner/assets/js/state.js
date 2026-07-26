/* ══════════════════════════════════════════════
   Instory Planner — state.js
   버전: 1.0.0
   전역 상태 · 공용 유틸 · 데이터 로드
   ══════════════════════════════════════════════ */

/* ── 상수 ── */
const APP_VERSION = "1.0.0";
const C_EVENTS = ["C1", "C2", "C3", "C4", "C5"];
const DATA_URL = "data/default-data.json";
/* 본문·댓글 안에 직접 쓴 해시태그를 찾는 패턴 (영문·숫자·밑줄·한글) */
const TAG_RE = /#([0-9A-Za-z_가-힣]+)/g;

/* ── 기획 데이터 (JSON에서 로드, 편집 대상) ── */
const S = {
  profiles: [],
  posts: [],
  startPostId: "",
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
  history: [],
  tagJumps: 0,
  showClues: true,
  openComments: {},        // postId -> bool
  visited: {},             // tag -> true (한 번이라도 들어간 해시태그)
  foundClues: {},          // postId -> Set(cluePhrases 인덱스)
  _justFound: null,        // { postId, ids:Set } — sweep 애니메이션 1회용
};

/* 화면 전환 시에만 피드 스크롤을 최상단으로 되돌린다 */
let resetFeedScroll = false;
function requestFeedScrollReset() { resetFeedScroll = true; }

/* ── file:// 직접 실행용 폴백 데이터 ──
   data/default-data.json을 수정하면 이 값도 함께 갱신할 것. */
const FALLBACK_DATA = {
  profiles: [
    { id: "p_jihoon", handle: "jihoon_p", name: "박지훈", relationship: "고인 (플레이어=AI)",
      bio: "그냥, 기록.", followers: 214, following: 180, color: "#0095f6" },
    { id: "p_jiwon", handle: "jiwon.p_", name: "박지원", relationship: "여동생 (18)",
      bio: "고3 | 합격기원 🙏", followers: 342, following: 501, color: "#c77400" },
    { id: "p_gaeun", handle: "ga.eun__", name: "윤가은", relationship: "친구",
      bio: "필름 속에서 살기 📷", followers: 1204, following: 322, color: "#ed4956" },
    { id: "p_mother", handle: "sunhwa_kim", name: "어머니", relationship: "어머니",
      bio: "가족이 전부", followers: 58, following: 120, color: "#1e9e57" },
  ],
  posts: [
    { id: "post_start", authorId: "p_jihoon", date: "2025-11-02",
      content: "오랜만에 셋이서. 이 날씨, 이 골목. 다시 오긴 어렵겠지.",
      imageDesc: "해질녘 골목, 세 명의 그림자", hashtags: ["골목산책", "필름사진"], likes: 43,
      isClue: true, clueEvent: "C1", clueNote: "시작 게시글. C1 대화의 앵커.",
      cluePhrases: ["다시 오긴 어렵겠지"],
      comments: [
        { id: "c_start_1", author: "ga.eun__", text: "이 사진 내가 찍은 거 잊지 마라", likes: 5 },
        { id: "c_start_2", author: "jiwon.p_", text: "오빠 나만 빼고 갔네?", likes: 2 },
      ] },
    { id: "post_g1", authorId: "p_gaeun", date: "2025-11-03",
      content: "현상 맡긴 필름 찾아옴. 잘 나온 건 몇 장 없지만 #그날의빛 은 담겼다.",
      imageDesc: "필름 스캔 4분할 컷", hashtags: ["필름사진", "현상소"], likes: 87,
      isClue: true, clueEvent: "C2", clueNote: "가은 계정 진입 지점. 홉 1.",
      cluePhrases: ["잘 나온 건 몇 장 없지만"],
      comments: [
        { id: "c_g1_1", author: "jihoon_p", text: "마지막 장, 나 눈 감았지 #흑역사", likes: 9 },
      ] },
  ],
  startPostId: "post_start",
};

/* ── 공용 유틸 ── */
const uid = () => Math.random().toString(36).slice(2, 9);

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function profById(id) { return S.profiles.find(p => p.id === id); }
function postById(id) { return S.posts.find(p => p.id === id); }

/* "#a, b  #c" -> ["a","b","c"] (중복 제거) */
function normTags(raw) {
  return Array.from(new Set(
    String(raw || "").split(/[,\s]+/).map(t => t.replace(/^#/, "").trim()).filter(Boolean)
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

/* ── 데이터 적용 / 로드 ── */
function applyData(d) {
  if (!d) return;
  S.profiles = Array.isArray(d.profiles) ? d.profiles : [];
  S.posts = (Array.isArray(d.posts) ? d.posts : []).map(p => ({
    hashtags: [], cluePhrases: [], comments: [], likes: 0,
    isClue: false, clueEvent: "C1", clueNote: "", imageDesc: "", ...p,
  }));
  S.startPostId = d.startPostId || "";
}

async function loadDefaultData() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    applyData(await res.json());
  } catch (e) {
    /* file:// 로 직접 열었거나 fetch 실패 -> 폴백 사용 */
    console.warn("기본 데이터 로드 실패, FALLBACK_DATA 사용:", e.message);
    applyData(JSON.parse(JSON.stringify(FALLBACK_DATA)));
  }
}
