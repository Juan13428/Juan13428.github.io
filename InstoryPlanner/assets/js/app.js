/* ══════════════════════════════════════════════
   Instory Planner — app.js
   버전: 1.2.0
   진입점 — App 액션 객체 · 렌더 루프 · 초기화

   로드 순서 (index.html):
     state.js → clue-highlight.js → view-*.js → io.js → app.js
   ══════════════════════════════════════════════ */

/* ── 상태 표시줄 ── */
function setStatus(text) {
  const el = document.getElementById("saveState");
  if (el) el.textContent = text;
}

/* ── 피드 스크롤 제어 ──
   render()를 거치지 않고 .phone-feed만 직접 움직인다 (W / S 키).
   scrollTo가 없는 환경에서는 scrollTop으로 폴백. */
function scrollFeedTo(where) {
  const feed = document.querySelector(".phone-feed");
  if (!feed) return;
  const top = (where === "top") ? 0 : feed.scrollHeight;
  if (typeof feed.scrollTo === "function") {
    try { feed.scrollTo({ top, behavior: "smooth" }); return; } catch (e) { /* 폴백 */ }
  }
  feed.scrollTop = top;
}

/* ── 렌더 루프 ──
   상태 변경 후에는 render() 호출이 원칙.
   피드 스크롤 위치는 기본 보존하고, 화면 전환 시에만 최상단으로 되돌린다.
   (댓글 열기/접기·단서 발견은 제자리 갱신이어야 하므로 보존이 기본값) */
function render() {
  const oldFeed = document.querySelector(".phone-feed");
  const keepScroll = (oldFeed && !resetFeedScroll) ? oldFeed.scrollTop : 0;

  /* 탭 버튼 */
  document.getElementById("nav").innerHTML = [
    ["posts", "게시글"],
    ["profiles", "프로필"],
    ["objectives", "목표"],
    ["analysis", "경로 분석"],
    ["preview", "플레이 미리보기"],
  ].map(([key, label]) =>
    `<button class="${U.tab === key ? "active" : ""}" onclick="App.setTab('${key}')">${label}</button>`
  ).join("");

  /* 본문 */
  const main = document.getElementById("main");
  if (U.tab === "profiles") main.innerHTML = renderProfiles();
  else if (U.tab === "posts") main.innerHTML = renderPosts();
  else if (U.tab === "objectives") main.innerHTML = renderObjectives();
  else if (U.tab === "analysis") main.innerHTML = renderAnalysis();
  else main.innerHTML = renderPreview();

  /* 스크롤 복원 */
  const newFeed = document.querySelector(".phone-feed");
  if (newFeed && !resetFeedScroll) newFeed.scrollTop = keepScroll;
  resetFeedScroll = false;
}

/* ══════════════════════════════════════════════
   App — 인라인 onclick/onchange에서 호출하는 액션 모음
   ══════════════════════════════════════════════ */
const App = {

  /* ── 탭 ── */
  setTab(tab) {
    U.tab = tab;
    requestFeedScrollReset();
    render();
  },

  /* ── 프로필 ── */
  addProfile() {
    S.profiles.push({
      id: "p_" + uid(), handle: "new_user", name: "새 인물", relationship: "", bio: "",
      followers: 0, following: 0,
      color: "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0"),
    });
    render();
  },

  updProfile(id, key, val) {
    const p = profById(id);
    if (!p) return;
    p[key] = (key === "followers" || key === "following") ? (+val || 0) : val;
    render();
  },

  delProfile(id) {
    const used = S.posts.filter(p => p.authorId === id).length;
    if (used > 0) {
      alert(`이 프로필로 작성된 게시글이 ${used}개 있습니다. 먼저 게시글의 작성자를 변경하세요.`);
      return;
    }
    if (!confirm("프로필을 삭제할까요?")) return;
    S.profiles = S.profiles.filter(p => p.id !== id);
    render();
  },

  /* ── 게시글 ── */
  addPost() {
    const id = "post_" + uid();
    S.posts.unshift({
      id, authorId: (S.profiles[0] || {}).id || "",
      date: new Date().toISOString().slice(0, 10),
      content: "", imageDesc: "", hashtags: [], likes: 0,
      isClue: false, clueEvent: "C1", clueNote: "", clues: [], comments: [],
    });
    U.openId = id;
    render();
  },

  toggleOpen(id) {
    U.openId = (U.openId === id) ? null : id;
    render();
  },

  updPost(id, key, val) {
    const p = postById(id);
    if (!p) return;
    if (key === "likes") p.likes = +val || 0;
    else if (key === "hashtags") p.hashtags = normTags(val);
    else if (key === "isClue") p.isClue = !!val;
    else p[key] = val;
    render();
  },

  setStart(id) {
    S.startPostId = id;
    render();
  },

  dupPost(id) {
    const p = postById(id);
    if (!p) return;
    const copy = JSON.parse(JSON.stringify(p));
    copy.id = "post_" + uid();
    copy.comments = (copy.comments || []).map(c => ({ ...c, id: "c_" + uid() }));
    /* 단서는 새 id를 받으므로 목표 배정은 따라오지 않는다 (목표 탭에서 재배정) */
    copy.clues = (copy.clues || []).map(c => ({ ...c, id: "clue_" + uid() }));
    S.posts.unshift(copy);
    U.openId = copy.id;
    render();
  },

  delPost(id) {
    if (!confirm("게시글을 삭제할까요?")) return;
    S.posts = S.posts.filter(p => p.id !== id);
    if (S.startPostId === id) S.startPostId = "";
    pruneClueRefs();
    render();
  },

  setFilter(key, val) {
    if (key === "author") U.filterAuthor = val;
    if (key === "clueOnly") U.clueOnly = !!val;
    if (key === "search") U.search = val;
    render();
  },

  /* ── 댓글 ── */
  addComment(postId) {
    const p = postById(postId);
    if (!p) return;
    (p.comments = p.comments || []).push({ id: "c_" + uid(), author: "", text: "", likes: 0 });
    render();
  },

  updComment(postId, cid, key, val) {
    const p = postById(postId);
    if (!p) return;
    const c = (p.comments || []).find(x => x.id === cid);
    if (!c) return;
    c[key] = (key === "likes") ? (+val || 0) : val;
    render();
  },

  delComment(postId, cid) {
    const p = postById(postId);
    if (!p) return;
    p.comments = (p.comments || []).filter(x => x.id !== cid);
    render();
  },


  /* ── 단서 (게시글 소속) ── */
  addClue(postId) {
    const p = postById(postId);
    if (!p) return;
    (p.clues = p.clues || []).push({ id: "clue_" + uid(), phrase: "", note: "" });
    render();
  },

  updClue(postId, clueId, key, val) {
    const p = postById(postId);
    if (!p) return;
    const c = (p.clues || []).find(x => x.id === clueId);
    if (!c) return;
    c[key] = val;
    render();
  },

  delClue(postId, clueId) {
    const p = postById(postId);
    if (!p) return;
    p.clues = (p.clues || []).filter(x => x.id !== clueId);
    pruneClueRefs();
    render();
  },

  /* 게시글 탭에서 단서의 소속 목표를 바꾼다 (빈 값이면 미배정) */
  assignClueTo(clueId, objectiveId) {
    S.objectives.forEach(o => { o.clueIds = o.clueIds.filter(id => id !== clueId); });
    const obj = objById(objectiveId);
    if (obj) obj.clueIds.push(clueId);
    render();
  },

  /* ── 목표 ── */
  addObjective() {
    const obj = {
      id: "obj_" + uid(),
      title: "새 목표",
      desc: "",
      event: "C1",
      clueIds: [],
    };
    S.objectives.push(obj);
    if (!S.activeObjectiveId) S.activeObjectiveId = obj.id;
    if (!P.activeObjectiveId) P.activeObjectiveId = obj.id;
    render();
  },

  updObjective(id, key, val) {
    const o = objById(id);
    if (!o) return;
    o[key] = val;
    render();
  },

  delObjective(id) {
    if (!confirm("목표를 삭제할까요? 배정된 단서는 미배정 상태가 됩니다.")) return;
    S.objectives = S.objectives.filter(o => o.id !== id);
    if (S.activeObjectiveId === id) S.activeObjectiveId = (S.objectives[0] || {}).id || "";
    if (P.activeObjectiveId === id) P.activeObjectiveId = S.activeObjectiveId;
    P.clearedObjectives = P.clearedObjectives.filter(x => x !== id);
    render();
  },

  /* 목표 순서 이동 (진행 순서 = 배열 순서) */
  moveObjective(id, dir) {
    const i = S.objectives.findIndex(o => o.id === id);
    const j = i + dir;
    if (i === -1 || j < 0 || j >= S.objectives.length) return;
    [S.objectives[i], S.objectives[j]] = [S.objectives[j], S.objectives[i]];
    render();
  },

  /* 목표 탭에서 단서 배정 / 해제 */
  assignClue(objectiveId, clueId) {
    if (!clueId) return;
    App.assignClueTo(clueId, objectiveId);
  },

  unassignClue(objectiveId, clueId) {
    const o = objById(objectiveId);
    if (!o) return;
    o.clueIds = o.clueIds.filter(id => id !== clueId);
    render();
  },

  /* 플레이 시작 시 활성화될 목표 */
  setDefaultObjective(id) {
    S.activeObjectiveId = id;
    render();
  },

  /* ── 플레이 중 목표 전환 ── */
  setActiveObjective(id) {
    P.activeObjectiveId = id;
    render();
  },

  nextObjective() {
    const next = nextOpenObjective(P.activeObjectiveId);
    P.activeObjectiveId = next ? next.id : "";
    render();
  },

  pvToggleAutoAdvance(on) {
    P.autoAdvance = !!on;
    render();
  },

  /* ── 플레이 미리보기 ── */
  /* 새 화면으로 이동 — 브라우저와 같이 forward 스택은 비운다 */
  pvGo(next, countsAsJump) {
    P.history.push(P.view);
    P.forward = [];
    if (countsAsJump) P.tagJumps++;
    P.view = next;
    requestFeedScrollReset();   // 화면 전환은 최상단부터
    render();
  },

  pvGoTag(tag) {
    if (P.view.mode === "tag" && P.view.tag === tag) return;
    P.visited[tag] = true;      // 방문한 태그는 회색 처리
    App.pvGo({ mode: "tag", tag }, true);
  },

  pvGoProfile(profileId) {
    if (P.view.mode === "profile" && P.view.profileId === profileId) return;
    App.pvGo({ mode: "profile", profileId }, false);
  },

  /* 뒤로 (A) — 현재 화면을 forward에 쌓아둔다 */
  pvBack() {
    if (!P.history.length) return;
    P.forward.push(P.view);
    P.view = P.history.pop();
    requestFeedScrollReset();
    render();
  },

  /* 앞으로 (D) — 되돌린 화면을 다시 따라간다. 새 탐색이 아니므로 이동 횟수는 늘지 않는다 */
  pvForward() {
    if (!P.forward.length) return;
    P.history.push(P.view);
    P.view = P.forward.pop();
    requestFeedScrollReset();
    render();
  },

  /* 피드 스크롤 (W / S) — 렌더 없이 DOM만 직접 움직인다 */
  pvScrollTop() { scrollFeedTo("top"); },
  pvScrollBottom() { scrollFeedTo("bottom"); },

  pvReset() {
    const auto = P.autoAdvance;   // 컨트롤 설정은 유지
    const show = P.showClues;
    resetPlayState();
    P.autoAdvance = auto;
    P.showClues = show;
    requestFeedScrollReset();
    render();
  },

  pvToggleClues(on) {
    P.showClues = !!on;
    render();                   // 스크롤은 render()에서 보존됨
  },

  pvToggleComments(postId) {
    P.openComments[postId] = !P.openComments[postId];
    render();                   // 스크롤은 render()에서 보존됨
  },

  /* ── 입출력 (io.js) ── */
  exportJson() { exportJson(); },
  importJson(ev) { importJson(ev); },
  exportXlsx() { exportXlsx(); },
};

/* ── 초기화 ── */
(async function init() {
  await loadDefaultData();
  render();
  setStatus("v" + APP_VERSION + " · 기본 데이터 로드됨");
})();
