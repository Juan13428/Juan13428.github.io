/* ══════════════════════════════════════════════
   Instory Planner — state.js
   버전: 1.2.0
   전역 상태 · 공용 유틸 · 데이터 로드
   ══════════════════════════════════════════════ */

/* ── 상수 ── */
const APP_VERSION = "1.2.0";
const C_EVENTS = ["C1", "C2", "C3", "C4", "C5"];
const DATA_URL = "data/default-data.json";
/* 본문·댓글 안에 직접 쓴 해시태그를 찾는 패턴 (영문·숫자·밑줄·한글) */
const TAG_RE = /#([0-9A-Za-z_가-힣]+)/g;

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
  _justFound: null,        // { ids:Set } — sweep 애니메이션 1회용
};

/* 화면 전환 시에만 피드 스크롤을 최상단으로 되돌린다 */
let resetFeedScroll = false;
function requestFeedScrollReset() { resetFeedScroll = true; }

/* ── file:// 직접 실행용 폴백 데이터 ──
   data/default-data.json을 수정하면 이 값도 함께 갱신할 것. */
const FALLBACK_DATA = {
    "profiles": [
      {
        "id": "p_jihoon",
        "handle": "jihoon_p",
        "name": "박지훈",
        "relationship": "고인 (플레이어=AI)",
        "bio": "그냥, 기록.",
        "followers": 214,
        "following": 180,
        "color": "#0095f6"
      },
      {
        "id": "p_jiwon",
        "handle": "jiwon.p_",
        "name": "박지원",
        "relationship": "여동생 (18)",
        "bio": "고3 | 합격기원 🙏",
        "followers": 342,
        "following": 501,
        "color": "#c77400"
      },
      {
        "id": "p_gaeun",
        "handle": "ga.eun__",
        "name": "윤가은",
        "relationship": "친구",
        "bio": "필름 속에서 살기 📷",
        "followers": 1204,
        "following": 322,
        "color": "#ed4956"
      },
      {
        "id": "p_mother",
        "handle": "sunhwa_kim",
        "name": "어머니",
        "relationship": "어머니",
        "bio": "가족이 전부",
        "followers": 58,
        "following": 120,
        "color": "#1e9e57"
      }
    ],
    "posts": [
      {
        "id": "post_start",
        "authorId": "p_jihoon",
        "date": "2025-11-02",
        "content": "오랜만에 셋이서. 이 날씨, 이 골목. 다시 오긴 어렵겠지.",
        "imageDesc": "해질녘 골목, 세 명의 그림자",
        "hashtags": [
          "골목산책",
          "필름사진"
        ],
        "likes": 43,
        "isClue": true,
        "clueEvent": "C1",
        "clueNote": "시작 게시글. C1 대화의 앵커.",
        "clues": [
          {
            "id": "clue_last_day",
            "phrase": "다시 오긴 어렵겠지",
            "note": "이미 끝을 예감하고 있었다"
          }
        ],
        "comments": [
          {
            "id": "c_start_1",
            "author": "ga.eun__",
            "text": "이 사진 내가 찍은 거 잊지 마라",
            "likes": 5
          },
          {
            "id": "c_start_2",
            "author": "jiwon.p_",
            "text": "오빠 나만 빼고 갔네?",
            "likes": 2
          }
        ]
      },
      {
        "id": "post_g1",
        "authorId": "p_gaeun",
        "date": "2025-11-03",
        "content": "현상 맡긴 필름 찾아옴. 잘 나온 건 몇 장 없지만 #그날의빛 은 담겼다.",
        "imageDesc": "필름 스캔 4분할 컷",
        "hashtags": [
          "필름사진",
          "현상소"
        ],
        "likes": 87,
        "isClue": true,
        "clueEvent": "C1",
        "clueNote": "가은 계정 진입 지점. 홉 1.",
        "clues": [
          {
            "id": "clue_few_frames",
            "phrase": "잘 나온 건 몇 장 없지만",
            "note": "찍은 장수에 비해 남은 게 적다"
          }
        ],
        "comments": [
          {
            "id": "c_g1_1",
            "author": "jihoon_p",
            "text": "마지막 장, 나 눈 감았지 #흑역사",
            "likes": 9
          }
        ]
      },
      {
        "id": "post_j1",
        "authorId": "p_jiwon",
        "date": "2025-11-05",
        "content": "오빠가 알려준 골목. 혼자 와보니까 훨씬 길다. 새벽에 오면 왜 좋은지 알겠어.",
        "imageDesc": "새벽 골목, 가로등 하나",
        "hashtags": [
          "골목산책",
          "새벽"
        ],
        "likes": 61,
        "isClue": true,
        "clueEvent": "C2",
        "clueNote": "지원이 오빠의 동선을 따라가고 있다.",
        "clues": [
          {
            "id": "clue_alone_walk",
            "phrase": "혼자 와보니까 훨씬 길다",
            "note": "지원이 이미 혼자 다녀왔다"
          },
          {
            "id": "clue_dawn_habit",
            "phrase": "새벽에 오면 왜 좋은지 알겠어",
            "note": "새벽 시간대가 반복 키워드"
          }
        ],
        "comments": [
          {
            "id": "c_j1_1",
            "author": "ga.eun__",
            "text": "너 혼자 다니지 마 #새벽",
            "likes": 12
          }
        ]
      },
      {
        "id": "post_g2",
        "authorId": "p_gaeun",
        "date": "2025-11-08",
        "content": "안 올릴 사진이 하나 있다. 지훈이가 지워달라고 했으니까 그냥 갖고만 있을게.",
        "imageDesc": "현상소 봉투, 사진 한 장이 뒤집혀 있음",
        "hashtags": [
          "현상소",
          "새벽"
        ],
        "likes": 34,
        "isClue": true,
        "clueEvent": "C3",
        "clueNote": "가은이 숨기고 있는 사진. C3 분기 트리거.",
        "clues": [
          {
            "id": "clue_hidden_photo",
            "phrase": "안 올릴 사진이 하나 있다",
            "note": "공개하지 않은 사진의 존재"
          },
          {
            "id": "clue_asked_delete",
            "phrase": "지훈이가 지워달라고 했으니까",
            "note": "지훈 본인이 삭제를 요청했다"
          }
        ],
        "comments": [
          {
            "id": "c_g2_1",
            "author": "sunhwa_kim",
            "text": "가은아 언제 한번 집에 와",
            "likes": 3
          }
        ]
      },
      {
        "id": "post_m1",
        "authorId": "p_mother",
        "date": "2025-11-11",
        "content": "요즘도 새벽에 눈이 떠진다. 그 애 방 불이 켜져 있는 것 같아서.",
        "imageDesc": "새벽 거실, 복도 끝 방문",
        "hashtags": [
          "새벽",
          "기일"
        ],
        "likes": 18,
        "isClue": true,
        "clueEvent": "C4",
        "clueNote": "어머니의 수면 패턴. 새벽 키워드 수렴점.",
        "clues": [
          {
            "id": "clue_mother_dawn",
            "phrase": "그 애 방 불이 켜져 있는 것 같아서",
            "note": "지훈의 방이 아직 정리되지 않았다"
          }
        ],
        "comments": []
      }
    ],
    "objectives": [
      {
        "id": "obj_last_day",
        "title": "지훈의 마지막 하루를 재구성하라",
        "desc": "골목에서 찍힌 사진과 필름에 남은 흔적으로 그날의 시간대를 좁힌다.",
        "event": "C1",
        "clueIds": [
          "clue_last_day",
          "clue_few_frames"
        ]
      },
      {
        "id": "obj_dawn",
        "title": "'새벽'이라는 단어를 쫓아라",
        "desc": "세 사람이 각자 다른 맥락에서 새벽을 말하고 있다. 공통점을 찾는다.",
        "event": "C2",
        "clueIds": [
          "clue_alone_walk",
          "clue_dawn_habit",
          "clue_mother_dawn"
        ]
      },
      {
        "id": "obj_hidden",
        "title": "가은이 올리지 않은 사진",
        "desc": "가은의 계정에서 삭제 요청의 흔적을 찾아낸다.",
        "event": "C3",
        "clueIds": [
          "clue_hidden_photo",
          "clue_asked_delete"
        ]
      }
    ],
    "activeObjectiveId": "obj_last_day",
    "startPostId": "post_start"
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

/* ══ 목표(Objective) · 단서(Clue) 헬퍼 ══ */

function objById(id) { return S.objectives.find(o => o.id === id); }

/* 전체 단서를 소속 게시글과 함께 평탄화 */
function allClues() {
  return S.posts.flatMap(p => (p.clues || []).map(c => ({ ...c, post: p })));
}

function clueById(id) {
  for (const p of S.posts) {
    const c = (p.clues || []).find(x => x.id === id);
    if (c) return { ...c, post: p };
  }
  return null;
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
    if (Array.isArray(post.clues)) {
      post.clues = post.clues.map(c => ({ id: c.id || "clue_" + uid(), phrase: c.phrase || "", note: c.note || "" }));
    } else if (Array.isArray(post.cluePhrases)) {
      post.clues = post.cluePhrases.filter(Boolean)
        .map(phrase => ({ id: "clue_" + uid(), phrase, note: "" }));
    } else {
      post.clues = [];
    }
    delete post.cluePhrases;
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
