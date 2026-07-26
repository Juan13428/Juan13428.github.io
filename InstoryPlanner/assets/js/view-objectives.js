/* ══════════════════════════════════════════════
   Instory Planner — view-objectives.js
   버전: 1.5.0
   목표 탭 — 단서 찾기 목표 작성 · 필요 단서 지정

   규칙: 한 단서는 최대 하나의 목표에만 속한다.
        다른 목표가 이미 가져간 단서는 소속 목표를 함께 표시한다.
   ══════════════════════════════════════════════ */

function renderObjectives() {
  const hops = computeHops();
  const clues = allClues();
  const unassigned = clues.filter(c => !objectiveOfClue(c.id));

  /* ── 헤더 ── */
  let h = `<div class="section-head">
    <h2 style="margin:0">단서 찾기 목표
      <span class="muted" style="font-weight:400">(${S.objectives.length})</span></h2>
    <button class="btn sm blue" onclick="App.addObjective()">+ 목표 추가</button>
  </div>

  <div class="card">
    <div class="muted fs-12" style="line-height:1.7">
      목표는 위에서부터 순서대로 진행됩니다. 플레이 미리보기에서는
      <b>활성 목표에 속한 단서만</b> 드래그로 찾을 수 있고, 나머지는 잠깁니다.
      단서는 게시글 탭에서 만들고, 여기서 목표에 배정합니다.
    </div>
  </div>`;

  if (!S.objectives.length) {
    h += `<div class="empty-note">아직 목표가 없습니다. 목표를 추가하고 필요한 단서를 배정하세요.</div>`;
  }

  /* ── 목표 카드 ── */
  h += S.objectives.map((obj, i) => {
    const maxHop = objectiveMaxHop(obj, hops);
    const isDefault = S.activeObjectiveId === obj.id;

    /* 이 목표가 요구하는 단서 목록 */
    const owned = obj.clueIds.map(id => clueById(id)).filter(Boolean);

    const ownedRows = owned.length ? owned.map(c => {
      const hop = (c.post.id in hops) ? hops[c.post.id] : null;
      const missing = (c.host.text || "").indexOf(c.phrase) === -1;
      return `<div class="clue-pick owned">
        <span class="clue-phrase ${missing ? "err" : ""}">"${esc(c.phrase)}"${missing ? " ⛔ 원문에 없음" : ""}</span>
        <span class="muted fs-12">${esc((profById(c.post.authorId) || {}).name || "?")} · ${esc(clueLocation(c))}</span>
        <span class="mono fs-11 ${hop === null ? "warn" : ""}">${hop === null ? "도달불가" : "hop " + hop}</span>
        <button class="btn sm red" onclick="App.unassignClue('${escJs(obj.id)}','${escJs(c.id)}')">해제</button>
      </div>`;
    }).join("") : `<div class="muted fs-12" style="padding:6px 0">배정된 단서가 없습니다.</div>`;

    /* 배정 가능한 단서 (미배정분만) */
    const options = unassigned.map(c =>
      `<option value="${c.id}">${esc((profById(c.post.authorId) || {}).name || "?")}` +
      ` · ${esc(clueLocation(c))} · "${esc(c.phrase.slice(0, 24))}"</option>`
    ).join("");

    return `<div class="card obj-card ${isDefault ? "default" : ""}">

      <div class="row">
        <label class="field grow"><span>목표 ${i + 1} 제목</span>
          <input value="${esc(obj.title)}" placeholder="예) 지훈의 마지막 하루를 재구성하라"
            onchange="App.updObjective('${escJs(obj.id)}','title',this.value)"></label>
        <label class="field"><span>연결 대화 이벤트</span>
          <select class="w-100" onchange="App.updObjective('${escJs(obj.id)}','event',this.value)">
            ${C_EVENTS.map(c => `<option ${obj.event === c ? "selected" : ""}>${c}</option>`).join("")}
          </select></label>
        <label class="field"><span>필요 단서</span>
          <input class="w-90 mono" readonly value="${obj.clueIds.length}개"></label>
        <label class="field"><span>최대 홉</span>
          <input class="w-90 mono" readonly value="${maxHop === null ? "—" : maxHop}"></label>
      </div>

      <label class="field" style="margin-top:10px"><span>목표 설명 (플레이어에게 보이는 안내문)</span>
        <input value="${esc(obj.desc)}" placeholder="이 목표에서 무엇을 알아내야 하는가"
          onchange="App.updObjective('${escJs(obj.id)}','desc',this.value)"></label>

      <div class="obj-clues">
        <div class="comment-head">
          <span class="muted fs-11" style="letter-spacing:.04em">클리어에 필요한 단서</span>
          ${options
            ? `<select class="w-320" onchange="App.assignClue('${escJs(obj.id)}',this.value); this.value=''">
                 <option value="">+ 단서 배정…</option>${options}
               </select>`
            : `<span class="muted fs-11">배정 가능한 미배정 단서 없음</span>`}
        </div>
        ${ownedRows}
      </div>

      <div class="post-foot" style="margin-top:12px">
        <span class="mono muted fs-11 push">${esc(obj.id)}</span>
        <label class="inline">
          <input type="radio" name="defaultObjective" ${isDefault ? "checked" : ""}
            onchange="App.setDefaultObjective('${escJs(obj.id)}')">
          <span style="color:${isDefault ? "var(--amber)" : "var(--muted)"}">시작 목표</span></label>
        <button class="btn sm" onclick="App.moveObjective('${escJs(obj.id)}',-1)" ${i === 0 ? "disabled" : ""} aria-label="목표 순서 위로" title="위로">↑</button>
        <button class="btn sm" onclick="App.moveObjective('${escJs(obj.id)}',1)" ${i === S.objectives.length - 1 ? "disabled" : ""} aria-label="목표 순서 아래로" title="아래로">↓</button>
        <button class="btn sm red" onclick="App.delObjective('${escJs(obj.id)}')">삭제</button>
      </div>

    </div>`;
  }).join("");

  /* ── 미배정 단서 목록 ── */
  h += `<div class="card">
    <h2>미배정 단서 (${unassigned.length})</h2>
    <div class="muted fs-12" style="margin-bottom:8px">
      어떤 목표에도 속하지 않은 단서는 플레이 중 <b>영영 잠긴 상태</b>로 남습니다.
    </div>
    ${unassigned.length ? unassigned.map(c => {
      const hop = (c.post.id in hops) ? hops[c.post.id] : null;
      return `<div class="clue-pick">
        <span class="clue-phrase">"${esc(c.phrase)}"</span>
        <span class="muted fs-12">${esc((profById(c.post.authorId) || {}).name || "?")} · ${esc(clueLocation(c))}</span>
        <span class="mono fs-11 ${hop === null ? "warn" : ""}">${hop === null ? "도달불가" : "hop " + hop}</span>
      </div>`;
    }).join("") : '<div class="ok fs-13">✓ 모든 단서가 목표에 배정되었습니다.</div>'}
  </div>`;

  return h;
}
