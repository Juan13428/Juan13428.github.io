/* ══════════════════════════════════════════════
   Instory Planner — view-posts.js
   버전: 1.2.0
   게시글 탭 렌더링 (본문·해시태그·단서·댓글 편집)
   ══════════════════════════════════════════════ */

function renderPosts() {
  const hops = computeHops();
  const keyword = U.search.replace(/^#/, "");

  const filtered = S.posts.filter(p =>
    (U.filterAuthor === "all" || p.authorId === U.filterAuthor) &&
    (!U.clueOnly || p.isClue) &&
    (!U.search || (p.content || "").includes(U.search) || effTags(p).some(t => t.includes(keyword)))
  );

  /* ── 상단 필터 바 ── */
  let h = `<div class="row tight">
    <h2 class="push" style="margin:0">게시글
      <span class="muted" style="font-weight:400">(${filtered.length}/${S.posts.length})</span></h2>

    <label class="field"><span>작성자 필터</span>
      <select class="w-140" onchange="App.setFilter('author',this.value)">
        <option value="all">전체</option>
        ${S.profiles.map(p =>
          `<option value="${p.id}" ${U.filterAuthor === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
      </select></label>

    <label class="field"><span>검색 (본문·태그)</span>
      <input class="w-170" value="${esc(U.search)}" placeholder="키워드"
        onchange="App.setFilter('search',this.value)"></label>

    <label class="inline pad">
      <input type="checkbox" ${U.clueOnly ? "checked" : ""}
        onchange="App.setFilter('clueOnly',this.checked)"> 단서만</label>

    <button class="btn sm blue" style="margin-bottom:6px" onclick="App.addPost()">+ 게시글 추가</button>
  </div>`;

  /* ── 게시글 카드 ── */
  h += filtered.map(p => {
    const author = profById(p.authorId);
    const open = U.openId === p.id;
    const hop = (p.id in hops) ? hops[p.id] : null;
    const inline = Array.from(new Set([
      ...inlineTags(p.content),
      ...(p.comments || []).flatMap(c => inlineTags(c.text)),
    ]));

    const head = `<div class="post-head" onclick="App.toggleOpen('${p.id}')">
      ${avatarHtml(author, 30)}
      <span class="bold fs-13">${esc((author || {}).name || "?")}</span>
      <span class="mono muted fs-12">${esc(p.date)}</span>
      <span class="summary">${p.content ? esc(p.content) : '<i class="muted">내용 없음</i>'}</span>
      ${p.id === S.startPostId ? '<span class="warn bold fs-11">★ 시작</span>' : ""}
      ${hop !== null
        ? `<span class="mono bold fs-11" style="color:var(--blue)">hop ${hop}</span>`
        : '<span class="mono warn fs-11">도달불가</span>'}
      ${p.isClue ? `<span class="clue-badge">단서 ${esc(p.clueEvent || "?")}</span>` : ""}
      <span class="muted fs-12">${open ? "▲" : "▼"}</span>
    </div>`;

    if (!open) return `<div class="post-item ${p.isClue ? "clue" : ""}">${head}</div>`;

    /* ── 펼친 편집 영역 ── */
    const body = `<div class="post-body">

      <div class="row">
        <label class="field"><span>작성자</span>
          <select class="w-140" onchange="App.updPost('${p.id}','authorId',this.value)">
            ${S.profiles.map(pr =>
              `<option value="${pr.id}" ${p.authorId === pr.id ? "selected" : ""}>${esc(pr.name)}</option>`).join("")}
          </select></label>
        <label class="field"><span>날짜</span>
          <input type="date" class="w-150" value="${esc(p.date)}"
            onchange="App.updPost('${p.id}','date',this.value)"></label>
        <label class="field"><span>좋아요</span>
          <input type="number" class="w-90" value="${p.likes}"
            onchange="App.updPost('${p.id}','likes',this.value)"></label>
        <label class="field grow"><span>해시태그 (쉼표/공백 구분)</span>
          <input value="${esc((p.hashtags || []).map(t => "#" + t).join(" "))}" placeholder="#필름사진 #골목산책"
            onchange="App.updPost('${p.id}','hashtags',this.value)"></label>
      </div>

      <label class="field"><span>본문 — #태그를 직접 쓰면 인라인 해시태그로 자동 인식됩니다</span>
        <textarea onchange="App.updPost('${p.id}','content',this.value)">${esc(p.content)}</textarea></label>
      ${inline.length
        ? `<div class="muted fs-12">인라인 태그 감지: ${inline.map(t => "#" + esc(t)).join(" ")}</div>`
        : ""}

      <label class="field"><span>이미지 설명 (아트 발주용 메모)</span>
        <input value="${esc(p.imageDesc)}" placeholder="예) 해질녘 골목, 세 명의 그림자"
          onchange="App.updPost('${p.id}','imageDesc',this.value)"></label>

      <div class="clue-box ${p.isClue ? "on" : ""}">
        <label class="inline pad">
          <input type="checkbox" ${p.isClue ? "checked" : ""}
            onchange="App.updPost('${p.id}','isClue',this.checked)">
          <span class="bold" style="color:${p.isClue ? "var(--red)" : "var(--muted)"}">단서 게시글</span></label>

        ${p.isClue ? `
        <label class="field"><span>연결 대화 이벤트</span>
          <select class="w-100" onchange="App.updPost('${p.id}','clueEvent',this.value)">
            ${C_EVENTS.map(c => `<option ${p.clueEvent === c ? "selected" : ""}>${c}</option>`).join("")}
          </select></label>
        <label class="field grow"><span>단서 메모 (무엇을 알게 되는가)</span>
          <input value="${esc(p.clueNote)}" onchange="App.updPost('${p.id}','clueNote',this.value)"></label>
        <div class="field full">
          <div class="comment-head">
            <span class="muted fs-11" style="letter-spacing:.04em">단서 문구 — 드래그 판정 대상. 본문에 실제로 있는 문장이어야 합니다</span>
            <button class="btn sm dim" onclick="App.addClue('${p.id}')">+ 단서 추가</button>
          </div>
          ${(p.clues || []).map(c => {
            const owner = objectiveOfClue(c.id);
            const missing = (p.content || "").indexOf(c.phrase) === -1;
            return `<div class="clue-row">
              <input class="grow ${missing ? "bad" : ""}" placeholder="본문 속 단서 문구" value="${esc(c.phrase)}"
                onchange="App.updClue('${p.id}','${c.id}','phrase',this.value)">
              <input class="grow" placeholder="이 단서로 무엇을 알게 되는가" value="${esc(c.note)}"
                onchange="App.updClue('${p.id}','${c.id}','note',this.value)">
              <select class="w-170" onchange="App.assignClueTo('${c.id}',this.value)">
                <option value="">— 목표 미배정 —</option>
                ${S.objectives.map(o =>
                  `<option value="${o.id}" ${owner && owner.id === o.id ? "selected" : ""}>${esc(o.title.slice(0, 20))}</option>`).join("")}
              </select>
              <button class="btn sm red" onclick="App.delClue('${p.id}','${c.id}')">×</button>
            </div>${missing ? '<div class="err fs-11" style="padding-left:2px">⛔ 이 문구가 본문에 없습니다 — 드래그로 찾을 수 없습니다</div>' : ""}`;
          }).join("")}
          ${(p.clues || []).length ? "" : '<div class="muted fs-12" style="padding:6px 0">단서가 없습니다.</div>'}
        </div>` : ""}

        <label class="inline pad">
          <input type="radio" name="startPost" ${p.id === S.startPostId ? "checked" : ""}
            onchange="App.setStart('${p.id}')">
          <span style="color:${p.id === S.startPostId ? "var(--amber)" : "var(--muted)"}">시작 게시글로 지정</span></label>
      </div>

      <div>
        <div class="comment-head">
          <span class="muted fs-11" style="letter-spacing:.04em">댓글 (${(p.comments || []).length}) — 댓글 안에도 #태그를 쓸 수 있습니다</span>
          <button class="btn sm dim" onclick="App.addComment('${p.id}')">+ 댓글 추가</button>
        </div>
        ${(p.comments || []).map(c => `
          <div class="comment-row">
            <input class="w-130" placeholder="작성자 핸들" value="${esc(c.author)}"
              onchange="App.updComment('${p.id}','${c.id}','author',this.value)">
            <input class="grow" placeholder="댓글 내용 (#태그 가능)" value="${esc(c.text)}"
              onchange="App.updComment('${p.id}','${c.id}','text',this.value)">
            <input type="number" class="w-70" title="좋아요" value="${c.likes}"
              onchange="App.updComment('${p.id}','${c.id}','likes',this.value)">
            <button class="btn sm red" onclick="App.delComment('${p.id}','${c.id}')">×</button>
          </div>`).join("")}
      </div>

      <div class="post-foot">
        <span class="mono muted fs-11 push">${esc(p.id)}</span>
        <button class="btn sm" onclick="App.dupPost('${p.id}')">복제</button>
        <button class="btn sm red" onclick="App.delPost('${p.id}')">삭제</button>
      </div>

    </div>`;

    return `<div class="post-item ${p.isClue ? "clue" : ""}">${head}${body}</div>`;
  }).join("");

  if (filtered.length === 0) {
    h += `<div class="empty-note">조건에 맞는 게시글이 없습니다. 필터를 조정하거나 새 게시글을 추가하세요.</div>`;
  }
  return h;
}
