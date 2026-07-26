/* ══════════════════════════════════════════════
   Instory Planner — view-analysis.js
   버전: 1.0.0
   경로 분석 탭 — 홉 맵 · 이벤트 커버리지 · 태그 그래프 · 검증 경고
   ══════════════════════════════════════════════ */

/* ── 기획 구멍 검증 ── */
function collectWarnings(hops, tm) {
  const warnings = [];

  /* 도달 불가한 단서 게시글 */
  S.posts.filter(p => !(p.id in hops) && p.isClue).forEach(p => warnings.push({
    lv: "err",
    msg: `단서 게시글 「${esc((p.content || p.id).slice(0, 20))}…」(${esc(p.clueEvent)})이 시작점에서 도달 불가합니다. 해시태그 연결을 추가하세요.`,
  }));

  /* 본문에 존재하지 않는 단서 문구 (드래그로 찾을 수 없는 상태) */
  S.posts.forEach(p => (p.cluePhrases || []).forEach(phrase => {
    if ((p.content || "").indexOf(phrase) === -1) warnings.push({
      lv: "err",
      msg: `단서 문구 「${esc(phrase.slice(0, 20))}」가 게시글 「${esc((p.content || p.id).slice(0, 14))}…」 본문에 없습니다. 드래그로 찾을 수 없습니다.`,
    });
  }));

  /* 이동 경로로 기능하지 못하는 태그 */
  Object.entries(tm).filter(([, ps]) => ps.length === 1).forEach(([t]) => warnings.push({
    lv: "warn",
    msg: `#${esc(t)} 는 게시글 1개에만 달려 있어 이동 경로로 기능하지 않습니다.`,
  }));

  /* 태그가 하나도 없는 게시글 */
  S.posts.filter(p => effTags(p).length === 0).forEach(p => warnings.push({
    lv: "warn",
    msg: `「${esc((p.content || p.id).slice(0, 20))}…」에 해시태그가 없어 탐색 그래프에서 고립됩니다.`,
  }));

  return warnings;
}

function renderAnalysis() {
  const hops = computeHops();
  const tm = tagMapAll();
  const hopVals = Object.values(hops);
  const maxHop = hopVals.length ? Math.max(...hopVals) : 0;
  const unreachable = S.posts.filter(p => !(p.id in hops));
  const warnings = collectWarnings(hops, tm);

  /* ── 시작 게시글 선택 ── */
  let h = `<div class="card">
    <div class="row" style="align-items:center">
      <h2 style="margin:0">시작 게시글</h2>
      <select class="w-320" onchange="App.setStart(this.value)">
        <option value="">— 선택 —</option>
        ${S.posts.map(p => `<option value="${p.id}" ${p.id === S.startPostId ? "selected" : ""}>` +
          `${esc((profById(p.authorId) || {}).name || "?")} · ${esc((p.content || "").slice(0, 24))}</option>`).join("")}
      </select>
      <span class="muted fs-12">홉 수는 해시태그(태그 필드 + 본문·댓글 인라인 태그)를 공유하는 게시글 간 이동으로 계산됩니다 (BFS 최단거리).</span>
    </div>
  </div>`;

  /* ── 단서 경로 맵 ── */
  let levels = "";
  for (let lv = 0; lv <= maxHop; lv++) {
    const ps = S.posts.filter(p => hops[p.id] === lv);
    levels += `<div class="hop-row">
      <div class="hop-label">hop ${lv}</div>
      <div class="hop-chips">
        ${ps.length ? ps.map(p => `
          <div class="hop-chip ${p.isClue ? "clue" : ""}">
            <span class="bold" style="color:${(profById(p.authorId) || {}).color || "var(--muted)"}">${esc((profById(p.authorId) || {}).name || "?")}</span>
            <span>${esc((p.content || p.id).slice(0, 16))}${(p.content || "").length > 16 ? "…" : ""}</span>
            ${p.isClue ? `<span class="mono bold fs-11" style="color:var(--red)">${esc(p.clueEvent)}</span>` : ""}
          </div>`).join("") : '<span class="muted fs-12">없음</span>'}
      </div>
    </div>`;
  }
  if (unreachable.length) {
    levels += `<div class="hop-row">
      <div class="hop-label iso">고립</div>
      <div class="hop-chips">
        ${unreachable.map(p => `<div class="hop-chip iso">` +
          `${esc((profById(p.authorId) || {}).name || "?")} · ${esc((p.content || p.id).slice(0, 16))}</div>`).join("")}
      </div>
    </div>`;
  }
  h += `<div class="card"><h2>단서 경로 맵</h2>${levels}</div>`;

  /* ── 대화 이벤트별 커버리지 ── */
  h += `<div class="card"><h2>대화 이벤트별 단서 커버리지 (C1–C5)</h2><div class="cov-grid">
    ${C_EVENTS.map(ev => {
      const list = S.posts.filter(p => p.isClue && p.clueEvent === ev);
      return `<div class="cov-card ${list.length ? "" : "empty"}">
        <div class="cov-head">
          <span class="mono bold" style="color:${list.length ? "var(--blue)" : "var(--amber)"}">${ev}</span>
          <span class="muted fs-12">단서 ${list.length}개</span>
        </div>
        ${list.map(p => {
          const phraseInfo = (p.cluePhrases || []).length ? " · 문구 " + p.cluePhrases.length : "";
          return `<div class="fs-12" style="margin-bottom:3px">· ${esc(p.clueNote || (p.content || "").slice(0, 20))}
            <span class="mono muted">(hop ${(p.id in hops) ? hops[p.id] : "×"}${phraseInfo})</span></div>`;
        }).join("")}
        ${list.length ? "" : '<div class="warn fs-12">연결된 단서 없음</div>'}
      </div>`;
    }).join("")}
  </div></div>`;

  /* ── 해시태그 그래프 ── */
  h += `<div class="card"><h2>해시태그 그래프 (${Object.keys(tm).length})</h2>
    ${Object.entries(tm).sort((a, b) => b[1].length - a[1].length).map(([t, ps]) => `
      <div class="tag-row">
        <span class="tag">#${esc(t)}</span>
        <span class="mono bold fs-12" style="color:${ps.length > 1 ? "var(--green)" : "var(--amber)"}">${ps.length}개 연결</span>
        <span class="muted fs-12">${ps.map(p =>
          esc((profById(p.authorId) || {}).name || "?") + "·" + esc((p.content || p.id).slice(0, 10))).join("  /  ")}</span>
      </div>`).join("") || '<span class="muted fs-13">해시태그가 아직 없습니다.</span>'}
  </div>`;

  /* ── 검증 경고 ── */
  h += `<div class="card"><h2>검증 경고 (${warnings.length})</h2>
    ${warnings.length
      ? warnings.map(w => `<div class="${w.lv} warn-row">${w.lv === "err" ? "⛔" : "⚠"} ${w.msg}</div>`).join("")
      : '<div class="ok fs-13">✓ 모든 단서가 도달 가능하고, 고립된 태그가 없습니다.</div>'}
  </div>`;

  return h;
}
