/* ══════════════════════════════════════════════
   Instory Planner — view-preview.js
   버전: 1.2.0
   플레이 미리보기 탭 — 인스타그램 UI 피드 시뮬레이션
   ══════════════════════════════════════════════ */

/* ── 현재 화면에 표시할 게시글 목록 ── */
function previewPosts() {
  let list = S.posts.slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  if (P.view.mode === "tag") list = list.filter(p => effTags(p).includes(P.view.tag));
  if (P.view.mode === "profile") list = list.filter(p => p.authorId === P.view.profileId);
  return list;
}

/* ── 목표 HUD ──
   폰 상단에 고정되어 현재 목표와 진행도를 항상 보여준다. */
function previewHud() {
  const obj = activeObjective();
  const total = S.objectives.length;

  /* 모든 목표 완료 (또는 목표가 아예 없음) */
  if (!obj) {
    if (total && P.clearedObjectives.length >= total) {
      return `<div class="hud done">
        <div class="hud-label">모든 목표 완료</div>
        <div class="hud-title">✓ 단서를 전부 찾았습니다</div>
        <div class="hud-sub">목표 ${P.clearedObjectives.length}/${total} · 대화 이벤트로 진행</div>
      </div>`;
    }
    return `<div class="hud empty">
      <div class="hud-label">현재 목표</div>
      <div class="hud-title muted">활성 목표 없음 — 모든 단서가 잠겨 있습니다</div>
      <div class="hud-sub">목표 탭에서 목표를 만들고 단서를 배정하세요</div>
    </div>`;
  }

  const pr = objectiveProgress(obj);
  const dots = obj.clueIds.map(id => {
    const found = P.foundClues.has(id);
    const c = clueById(id);
    const tip = found && c ? esc(c.note || c.phrase) : "미발견";
    return `<span class="hud-dot ${found ? "on" : ""}" title="${tip}"></span>`;
  }).join("");

  const idx = S.objectives.findIndex(o => o.id === obj.id) + 1;

  return `<div class="hud ${pr.done ? "done" : ""}">
    <div class="hud-label">현재 목표 ${idx}/${total}
      <span class="hud-ev mono">${esc(obj.event)}</span></div>
    <div class="hud-title">${pr.done ? "✓ " : ""}${esc(obj.title)}</div>
    ${obj.desc ? `<div class="hud-sub">${esc(obj.desc)}</div>` : ""}
    <div class="hud-bar">
      <div class="hud-dots">${dots}</div>
      <span class="hud-count mono">단서 ${pr.found}/${pr.total}</span>
      ${pr.done && nextOpenObjective(obj.id)
        ? `<button class="btn sm blue hud-next" onclick="App.nextObjective()">다음 목표 →</button>` : ""}
    </div>
  </div>`;
}

/* ── 상단바 ──
   뒤로(‹)·앞으로(›)는 가능한 경우에만 노출한다. 키보드 A/D와 같은 동작. */
function previewBar() {
  const back = P.history.length
    ? `<button class="back-btn" onclick="App.pvBack()" title="뒤로 (A)">‹</button>` : "";
  const fwd = P.forward.length
    ? `<button class="back-btn" onclick="App.pvForward()" title="앞으로 (D)">›</button>` : "";
  const nav = (back || fwd) ? `<span class="phone-nav">${back}${fwd}</span>` : "";

  if (P.view.mode === "feed") {
    return `${nav}<span class="script" style="font-size:22px">Instory</span>
      <span style="margin-left:auto;font-size:17px">♡</span><span style="font-size:17px">✈</span>
      <span class="mono muted fs-11" style="margin-left:6px">이동 ${P.tagJumps}회</span>`;
  }

  const title = P.view.mode === "tag"
    ? "#" + P.view.tag
    : ((profById(P.view.profileId) || {}).handle || "?");
  return `${nav}<span class="bold" style="font-size:15px">${esc(title)}</span>
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
  const clues = p.clues || [];
  const foundN = clues.filter(c => P.foundClues.has(c.id)).length;
  const progress = clues.length ? ` · ${foundN}/${clues.length}` : "";
  /* 활성 목표의 단서를 품고 있는 게시글 — 기획자 뷰 전용 표식 */
  const hasLive = clues.some(c => isClueUnlocked(c.id) && !P.foundClues.has(c.id));

  return `<article class="feed-post">
    ${(P.showClues && (p.isClue || clues.length))
      ? `<div class="fp-badge">
           ${hasLive ? '<span class="live-badge">목표 단서</span>' : ""}
           <span class="clue-badge">단서 ${esc(p.clueEvent || "?")}${progress}</span>
         </div>`
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

/* ── 사이드 패널: 목표 진행도 ── */
function previewProgress() {
  const totalClues = allClues().filter(c => (c.post.content || "").indexOf(c.phrase) !== -1).length;
  const foundClues = P.foundClues.size;
  const visited = Object.keys(P.visited);

  const objRows = S.objectives.map((o, i) => {
    const pr = objectiveProgress(o);
    const isActive = P.activeObjectiveId === o.id;
    const cls = pr.done ? "done" : (isActive ? "active" : "locked");
    const mark = pr.done ? "✓" : (isActive ? "▶" : "🔒");
    return `<div class="obj-prog ${cls}" onclick="App.setActiveObjective('${o.id}')" title="클릭해서 이 목표로 전환">
      <span class="obj-prog-mark">${mark}</span>
      <span class="obj-prog-title">${i + 1}. ${esc(o.title)}</span>
      <span class="mono fs-11">${pr.found}/${pr.total}</span>
    </div>`;
  }).join("");

  return `<div class="obj-prog-list">${objRows ||
      '<div class="muted fs-12">목표가 없습니다.</div>'}</div>
    <div class="progress-list" style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">
      <div>발견 단서 <b style="color:var(--red)">${foundClues}</b> / ${totalClues}</div>
      <div>방문한 태그 <b style="color:var(--blue)">${visited.length}</b>개
        ${visited.length ? `<div class="muted fs-12">${visited.map(t => "#" + esc(t)).join(" ")}</div>` : ""}</div>
    </div>`;
}

/* ── 이동 기록 ──
   history + 현재 + forward(앞으로 갈 수 있는 화면)를 한 줄로 이어 보여준다. */
function previewHistory() {
  const label = (v) => v.mode === "feed" ? "홈 피드"
    : v.mode === "tag" ? "#" + v.tag
    : "@" + ((profById(v.profileId) || {}).handle || "?");

  const rows = P.history.map((v, i) => `<div class="past">${i}. ${esc(label(v))}</div>`);
  rows.push(`<div class="now">${P.history.length}. ${esc(label(P.view))}</div>`);
  /* forward는 스택이므로 뒤에서부터가 다음에 갈 화면 */
  P.forward.slice().reverse().forEach((v, i) => {
    rows.push(`<div class="ahead">${P.history.length + 1 + i}. ${esc(label(v))}</div>`);
  });
  return rows.join("");
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
      ${previewHud()}
      ${previewProfileHead()}
      <div class="phone-feed">${feed}</div>
      <div class="phone-tabbar"><span>🏠</span><span>🔍</span><span>➕</span><span>🎬</span><span>👤</span></div>
    </div>

    <div class="side">
      <div class="card flush">
        <h3>플레이테스트 컨트롤</h3>
        <label class="inline" style="margin-bottom:6px">
          <input type="checkbox" ${P.showClues ? "checked" : ""}
            onchange="App.pvToggleClues(this.checked)"> 기획자 뷰 (단서·홉 표시)</label>
        <label class="inline" style="margin-bottom:10px">
          <input type="checkbox" ${P.autoAdvance ? "checked" : ""}
            onchange="App.pvToggleAutoAdvance(this.checked)"> 목표 완료 시 자동 진행</label>
        <button class="btn sm w-full" onclick="App.pvReset()">처음으로 리셋</button>
        <p class="side-note">활성 목표에 속한 단서만 드래그로 찾을 수 있습니다.
          해시태그를 탭하면 태그 피드로 이동하고, 방문한 태그는 회색으로 바뀝니다.</p>
      </div>

      <div class="card flush">
        <h3>목표 진행도</h3>
        ${previewProgress()}
      </div>

      <div class="card flush">
        <h3>키보드 단축키</h3>
        <div class="key-help">
          <div><kbd>A</kbd><span>뒤로 가기</span>
            <em class="${P.history.length ? "" : "off"}">${P.history.length}단계</em></div>
          <div><kbd>D</kbd><span>앞으로 가기</span>
            <em class="${P.forward.length ? "" : "off"}">${P.forward.length}단계</em></div>
          <div><kbd>W</kbd><span>스크롤 맨 위</span><em></em></div>
          <div><kbd>S</kbd><span>스크롤 맨 아래</span><em></em></div>
        </div>
        <p class="side-note">입력창에 포커스가 있을 때는 단축키가 동작하지 않습니다.
          한글 입력 상태에서도 그대로 작동합니다.</p>
      </div>

      <div class="card flush">
        <h3>이동 기록</h3>
        <div class="history-list">${previewHistory()}</div>
      </div>
    </div>

  </div>`;
}
