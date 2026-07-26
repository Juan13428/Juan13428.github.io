/* ══════════════════════════════════════════════
   Instory Planner — view-preview.js
   버전: 1.0.0
   플레이 미리보기 탭 — 인스타그램 UI 피드 시뮬레이션
   ══════════════════════════════════════════════ */

/* ── 현재 화면에 표시할 게시글 목록 ── */
function previewPosts() {
  let list = S.posts.slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  if (P.view.mode === "tag") list = list.filter(p => effTags(p).includes(P.view.tag));
  if (P.view.mode === "profile") list = list.filter(p => p.authorId === P.view.profileId);
  return list;
}

/* ── 상단바 ── */
function previewBar() {
  if (P.view.mode === "feed") {
    return `<span class="script" style="font-size:22px">Instory</span>
      <span style="margin-left:auto;font-size:17px">♡</span><span style="font-size:17px">✈</span>
      <span class="mono muted fs-11" style="margin-left:6px">이동 ${P.tagJumps}회</span>`;
  }
  const title = P.view.mode === "tag"
    ? "#" + P.view.tag
    : ((profById(P.view.profileId) || {}).handle || "?");
  return `<button class="back-btn" onclick="App.pvBack()">‹</button>
    <span class="bold" style="font-size:15px">${esc(title)}</span>
    <span class="mono muted fs-11" style="margin-left:auto">이동 ${P.tagJumps}회</span>`;
}

/* ── 프로필 헤더 ── */
function previewProfileHead() {
  if (P.view.mode !== "profile") return "";
  const pr = profById(P.view.profileId);
  if (!pr) return "";
  return `<div class="pf-head">
      ${avatarHtml(pr, 64, true)}
      <div class="pf-stats">
        <div><b>${S.posts.filter(p => p.authorId === pr.id).length}</b><span>게시물</span></div>
        <div><b>${pr.followers}</b><span>팔로워</span></div>
        <div><b>${pr.following}</b><span>팔로잉</span></div>
      </div>
    </div>
    <div class="pf-bio"><b>${esc(pr.name)}</b><br><span class="muted">${esc(pr.bio)}</span></div>`;
}

/* ── 게시글 1개 ── */
function previewPostHtml(p, hops) {
  const author = profById(p.authorId);
  const hop = (p.id in hops) ? hops[p.id] : null;
  const cmts = p.comments || [];
  const phrases = p.cluePhrases || [];
  const foundN = (P.foundClues[p.id] || new Set()).size;
  const progress = phrases.length ? ` · ${foundN}/${phrases.length}` : "";

  return `<article class="feed-post">
    ${(P.showClues && p.isClue)
      ? `<div class="fp-badge"><span class="clue-badge">단서 ${esc(p.clueEvent || "?")}${progress}</span></div>`
      : ""}

    <div class="fp-head" onclick="App.pvGoProfile('${p.authorId}')">
      ${avatarHtml(author, 32, true)}
      <div>
        <div class="fp-handle">${esc((author || {}).handle || "?")}
          ${(p.id === S.startPostId && P.showClues) ? '<span class="warn">★</span>' : ""}
          ${(P.showClues && hop !== null)
            ? `<span class="mono bold fs-11" style="color:var(--blue)"> hop${hop}</span>` : ""}
        </div>
        <div class="fp-name">${esc((author || {}).name || "")}</div>
      </div>
      <span class="fp-more-dots">···</span>
    </div>

    <div class="fp-img"><span class="ico">📷</span>${p.imageDesc
      ? esc(p.imageDesc) : '<span class="muted">이미지 미정</span>'}</div>

    <div class="fp-actions"><span>♡</span><span>💬</span><span>✈</span><span class="save">🔖</span></div>
    <div class="fp-likes">좋아요 ${p.likes}개</div>

    <div class="fp-caption"><b>${esc((author || {}).handle || "?")}</b><span class="fp-body" data-post="${p.id}">${captionHtml(p)}</span></div>

    ${(p.hashtags || []).length
      ? `<div class="fp-tags">${(p.hashtags || []).map(t => tagSpan(t)).join("")}</div>` : ""}

    ${cmts.length ? `<div class="fp-more" onclick="App.pvToggleComments('${p.id}')">
      ${P.openComments[p.id] ? "댓글 접기" : "댓글 " + cmts.length + "개 모두 보기"}</div>` : ""}

    ${P.openComments[p.id] ? cmts.map(c => `
      <div class="fp-comment"><b>${esc(c.author)}</b> ${commentHtml(c.text)}
        <span class="muted fs-11"> 좋아요 ${c.likes}개</span></div>`).join("") : ""}

    <div class="fp-date">${esc(p.date)}</div>
  </article>`;
}

/* ── 사이드 패널 진행도 ── */
function previewProgress() {
  let totalPhrases = 0;
  let totalFound = 0;
  S.posts.forEach(p => {
    const valid = (p.cluePhrases || []).filter(ph => (p.content || "").indexOf(ph) !== -1).length;
    totalPhrases += valid;
    totalFound += Math.min(valid, (P.foundClues[p.id] || new Set()).size);
  });
  const visited = Object.keys(P.visited);

  return `<div class="progress-list">
    <div>단서 문구 <b style="color:var(--red)">${totalFound}</b> / ${totalPhrases} 발견</div>
    <div>방문한 태그 <b style="color:var(--blue)">${visited.length}</b>개
      ${visited.length ? `<div class="muted fs-12">${visited.map(t => "#" + esc(t)).join(" ")}</div>` : ""}</div>
  </div>`;
}

/* ── 이동 기록 ── */
function previewHistory() {
  return P.history.concat([P.view]).map((v, i) => {
    const label = v.mode === "feed" ? "홈 피드"
      : v.mode === "tag" ? "#" + v.tag
      : "@" + ((profById(v.profileId) || {}).handle || "?");
    const cls = (i === P.history.length) ? "now" : "past";
    return `<div class="${cls}">${i}. ${esc(label)}</div>`;
  }).join("");
}

/* ── 탭 전체 ── */
function renderPreview() {
  const hops = computeHops();
  const posts = previewPosts();
  const feed = posts.length
    ? posts.map(p => previewPostHtml(p, hops)).join("")
    : `<div class="empty-note">이 화면에 표시할 게시글이 없습니다.</div>`;

  return `<div class="preview-wrap">

    <div class="phone">
      <div class="phone-bar">${previewBar()}</div>
      ${previewProfileHead()}
      <div class="phone-feed">${feed}</div>
      <div class="phone-tabbar"><span>🏠</span><span>🔍</span><span>➕</span><span>🎬</span><span>👤</span></div>
    </div>

    <div class="side">
      <div class="card flush">
        <h3>플레이테스트 컨트롤</h3>
        <label class="inline" style="margin-bottom:10px">
          <input type="checkbox" ${P.showClues ? "checked" : ""}
            onchange="App.pvToggleClues(this.checked)"> 기획자 뷰 (단서·홉 표시)</label>
        <button class="btn sm w-full" onclick="App.pvReset()">처음으로 리셋</button>
        <p class="side-note">해시태그를 탭하면 태그 피드로 이동하고, 방문한 태그는 회색으로 바뀝니다.
          본문을 드래그해 단서 문구를 찾으면 형광펜으로 표시됩니다.</p>
      </div>

      <div class="card flush">
        <h3>탐색 진행도</h3>
        ${previewProgress()}
      </div>

      <div class="card flush">
        <h3>이동 기록</h3>
        <div class="history-list">${previewHistory()}</div>
      </div>
    </div>

  </div>`;
}
