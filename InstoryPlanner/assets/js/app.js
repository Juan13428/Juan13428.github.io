/* ══════════════════════════════════════════════
   Instory Planner — app.js
   버전: 1.0.0
   진입점 — App 액션 객체 · 렌더 루프 · 초기화

   로드 순서 (index.html):
     state.js → clue-highlight.js → view-*.js → io.js → app.js
   ══════════════════════════════════════════════ */

/* ── 상태 표시줄 ── */
function setStatus(text) {
  const el = document.getElementById("saveState");
  if (el) el.textContent = text;
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
    ["analysis", "경로 분석"],
    ["preview", "플레이 미리보기"],
  ].map(([key, label]) =>
    `<button class="${U.tab === key ? "active" : ""}" onclick="App.setTab('${key}')">${label}</button>`
  ).join("");

  /* 본문 */
  const main = document.getElementById("main");
  if (U.tab === "profiles") main.innerHTML = renderProfiles();
  else if (U.tab === "posts") main.innerHTML = renderPosts();
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
      isClue: false, clueEvent: "C1", clueNote: "", cluePhrases: [], comments: [],
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
    else if (key === "cluePhrases") p.cluePhrases = val.split("\n").map(s => s.trim()).filter(Boolean);
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
    S.posts.unshift(copy);
    U.openId = copy.id;
    render();
  },

  delPost(id) {
    if (!confirm("게시글을 삭제할까요?")) return;
    S.posts = S.posts.filter(p => p.id !== id);
    if (S.startPostId === id) S.startPostId = "";
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

  /* ── 플레이 미리보기 ── */
  pvGo(next, countsAsJump) {
    P.history.push(P.view);
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

  pvBack() {
    if (!P.history.length) return;
    P.view = P.history.pop();
    requestFeedScrollReset();
    render();
  },

  pvReset() {
    P.view = { mode: "feed" };
    P.history = [];
    P.tagJumps = 0;
    P.openComments = {};
    P.visited = {};
    P.foundClues = {};
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
