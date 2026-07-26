/* ══════════════════════════════════════════════
   Instory Planner — view-analysis.js
   버전: 1.5.0
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

  /* 단서 문구 검증: 비어 있음 / 원문에 없음 / 같은 위치 내 중복
     본문과 댓글을 같은 규칙으로 검사한다. */
  S.posts.forEach(p => {
    clueHosts(p).forEach(host => {
      const seen = new Map();
      const label = host.kind === "comment" ? `댓글 @${host.comment.author || "?"}` : "본문";
      const where = `「${esc((p.content || p.id).slice(0, 14))}…」의 ${label}`;

      host.clues.forEach(c => {
        if (!c.phrase || !c.phrase.trim()) {
          warnings.push({ lv: "err", msg: `${where}에 문구가 비어 있는 단서가 있습니다. 드래그로 찾을 수 없습니다.` });
          return;
        }
        if ((host.text || "").indexOf(c.phrase) === -1) {
          warnings.push({
            lv: "err",
            msg: `단서 문구 「${esc(c.phrase.slice(0, 20))}」가 ${where}에 없습니다. 드래그로 찾을 수 없습니다.`,
          });
          return;
        }
        if (seen.has(c.phrase)) {
          warnings.push({
            lv: "err",
            msg: `${where}에 「${esc(c.phrase.slice(0, 20))}」 단서가 중복 등록되어 있습니다. 같은 위치를 가리키므로 하나만 찾힙니다.`,
          });
        }
        seen.set(c.phrase, c.id);
      });
    });
  });

  /* 목표에 배정되지 않은 단서 — 플레이 중 영영 잠긴다 */
  allClues().filter(c => !objectiveOfClue(c.id)).forEach(c => warnings.push({
    lv: "err",
    msg: `단서 「${esc((c.phrase || c.id).slice(0, 20))}」가 어떤 목표에도 배정되지 않았습니다. 활성화될 수 없어 영영 잠깁니다.`,
  }));

  /* 단서가 없는 목표 — 시작하자마자 완료 처리된다 */
  S.objectives.filter(o => !o.clueIds.length).forEach(o => warnings.push({
    lv: "warn",
    msg: `목표 「${esc(o.title.slice(0, 20))}」에 배정된 단서가 없습니다. 시작 즉시 완료 처리됩니다.`,
  }));

  /* 목표가 요구하는 단서가 도달 불가한 게시글에 있음 */
  S.objectives.forEach(o => {
    if (objectiveMaxHop(o, hops) === "도달불가") warnings.push({
      lv: "err",
      msg: `목표 「${esc(o.title.slice(0, 20))}」의 단서 중 시작 게시글에서 도달할 수 없는 것이 있습니다. 클리어 불가능합니다.`,
    });
  });

  /* 목표 자체가 없음 */
  if (!S.objectives.length) warnings.push({
    lv: "err",
    msg: "목표가 하나도 없습니다. 모든 단서가 잠긴 상태이므로 플레이가 진행되지 않습니다.",
  });

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

  /* ── 총괄 지표 ── */
  const clues = allClues();
  const reachable = S.posts.filter(p => p.id in hops).length;
  const hopList = Object.values(hops);
  const avgHop = hopList.length ? (hopList.reduce((a, b) => a + b, 0) / hopList.length).toFixed(1) : "—";
  const errCount = warnings.filter(w => w.lv === "err").length;
  const warnCount = warnings.length - errCount;

  const stat = (label, value, tone) =>
    `<div class="stat ${tone || ""}"><span class="stat-value">${value}</span><span class="stat-label">${label}</span></div>`;

  let h = `<div class="card">
    <div class="stat-grid">
      ${stat("게시글", S.posts.length)}
      ${stat("등장인물", S.profiles.length)}
      ${stat("해시태그", Object.keys(tm).length)}
      ${stat("단서", clues.length)}
      ${stat("목표", S.objectives.length, S.objectives.length ? "" : "bad")}
      ${stat("도달 가능", `${reachable}/${S.posts.length}`, reachable === S.posts.length ? "good" : "bad")}
      ${stat("평균 홉", avgHop)}
      ${stat("오류", errCount, errCount ? "bad" : "good")}
      ${stat("주의", warnCount, warnCount ? "warn" : "good")}
    </div>
  </div>

  <div class="card">
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

  /* ── 목표별 탐색 난이도 ── */
  h += `<div class="card"><h2>목표별 탐색 난이도 (${S.objectives.length})</h2>
    <div class="muted fs-12" style="margin-bottom:10px">
      "최대 홉"은 그 목표를 클리어하려면 시작 게시글에서 몇 단계까지 태그를 타고 들어가야 하는지를 뜻합니다.
      목표 순서대로 홉이 완만하게 증가하는 것이 이상적입니다.
    </div>
    ${S.objectives.length ? S.objectives.map((o, i) => {
      const maxHop = objectiveMaxHop(o, hops);
      const bad = maxHop === "도달불가";
      const clues = o.clueIds.map(id => clueById(id)).filter(Boolean);
      const posts = Array.from(new Set(clues.map(c => c.post.id)));
      return `<div class="obj-diff ${bad ? "bad" : ""}">
        <span class="obj-diff-idx mono">${i + 1}</span>
        <span class="obj-diff-title">${esc(o.title)}</span>
        <span class="tag">${esc(o.event)}</span>
        <span class="mono fs-12">단서 ${o.clueIds.length}개</span>
        <span class="mono fs-12">게시글 ${posts.length}곳</span>
        <span class="mono fs-12 ${bad ? "err bold" : ""}">최대 ${maxHop === null ? "—" : (bad ? maxHop : "hop " + maxHop)}</span>
      </div>`;
    }).join("") : '<div class="warn fs-13">목표가 없습니다. 목표 탭에서 추가하세요.</div>'}
  </div>`;

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
          const n = clueHosts(p).reduce((a, h) => a + h.clues.length, 0);
          const phraseInfo = n ? " · 단서 " + n : "";
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
