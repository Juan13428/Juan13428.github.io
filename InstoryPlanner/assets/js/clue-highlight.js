/* ══════════════════════════════════════════════
   Instory Planner — clue-highlight.js
   버전: 1.5.0
   본문 드래그 단서 판정 · 형광펜 하이라이트 · 인라인 해시태그 렌더

   판정 규칙
   - 단서는 **활성 목표에 속할 때만** 드래그로 찾을 수 있다 (isClueUnlocked).
   - 선택 영역이 단서 문구와 1글자 이상 겹치면 정답.
   - 선택이 본문 밖으로 삐져나가도 본문 경계로 **잘라서(clamp)** 판정한다.
     사용자는 사용자명이나 아랫줄까지 걸쳐 드래그하는 일이 잦다.
   - 여러 게시글에 걸친 선택(전체 선택 등)은 무시한다.
   - 선택이 지나치게 넓으면(CLUE_SELECTION_SLACK 초과) 정답으로 치지 않는다.
   - 빈 클릭 / 이미 찾은 단서 / 잠긴 단서는 무반응.

   참고 원본: archive/text-highlight-prototype.html
   ══════════════════════════════════════════════ */

/* ── 텍스트 세그먼트 계산 ──
   발견된 단서와 인라인 #태그의 위치를 겹치지 않게 정리해 반환한다.
   게시글 본문과 댓글이 같은 함수를 쓴다. */
function buildMarks(text, clues) {
  const src = text || "";
  const marks = [];

  (clues || []).forEach(clue => {
    if (!P.foundClues.has(clue.id)) return;          // 아직 못 찾은 단서는 표시하지 않음
    const start = src.indexOf(clue.phrase);
    if (start === -1) return;                        // 텍스트에서 사라진 문구는 무시
    marks.push({ start, end: start + clue.phrase.length, type: "clue", id: clue.id });
  });

  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(src))) {
    marks.push({ start: m.index, end: m.index + m[0].length, type: "tag", tag: m[1] });
  }

  /* 시작 위치순 정렬(같은 위치면 단서 우선), 겹치는 뒤쪽 마크는 버린다 */
  marks.sort((a, b) => a.start - b.start || (a.type === "clue" ? -1 : 1));
  const out = [];
  let last = 0;
  marks.forEach(mk => { if (mk.start >= last) { out.push(mk); last = mk.end; } });
  return out;
}

/* ── 해시태그 span ──
   방문한 태그는 회색, 현재 보고 있는 태그는 파란 밑줄 */
function tagSpan(tag) {
  const visited = P.visited[tag] ? "visited" : "";
  const active = (P.view.mode === "tag" && P.view.tag === tag) ? "active" : "";
  return `<span class="fp-tag ${visited} ${active}" onclick="App.pvGoTag('${escJs(tag)}')">#${esc(tag)}</span>`;
}

/* ── 단서 하이라이트 + 인라인 태그가 적용된 HTML ── */
function markedHtml(text, clues) {
  const src = text || "";
  const just = (P._justFound && P._justFound.ids) || new Set();
  const marks = buildMarks(src, clues);

  let html = "";
  let cur = 0;
  marks.forEach(mk => {
    if (mk.start > cur) html += esc(src.slice(cur, mk.start));
    if (mk.type === "clue") {
      const anim = just.has(mk.id) ? "sweep" : "static";
      html += `<span class="clue-highlight ${anim}">${esc(src.slice(mk.start, mk.end))}</span>`;
    } else {
      html += tagSpan(mk.tag);
    }
    cur = mk.end;
  });
  if (cur < src.length) html += esc(src.slice(cur));
  return html;
}

/* ── 드래그 판정 대상 텍스트 영역 ──
   data-post / data-comment 로 어느 호스트인지 식별한다.
   댓글 단서도 본문과 똑같이 여기서 처리된다. */
function clueTextSpan(post, host) {
  return `<span class="clue-text" data-post="${esc(post.id)}" data-comment="${esc(host.id)}">`
    + `${markedHtml(host.text, host.clues)}</span>`;
}


/* ── 선택 경계 -> 문자 오프셋 ──
   Range로 "본문 시작 ~ 경계" 구간을 만들어 그 길이를 센다.

   주의: 텍스트 노드만 훑는 TreeWalker 방식으로 구현하면 안 된다.
   브라우저는 선택 경계의 컨테이너로 **요소 노드**를 자주 준다
   (예: 하이라이트 span 바로 뒤에서 시작하면 (본문 span, 1)).
   그때 TreeWalker는 일치하는 노드를 못 찾아 전체 길이를 반환했고,
   그 결과 한 게시글의 두 번째 단서가 영영 판정되지 않았다.
   Range 방식은 텍스트·요소 컨테이너를 동일하게 처리한다. */
function getCharOffset(root, node, nodeOffset) {
  const r = document.createRange();
  r.selectNodeContents(root);
  try {
    r.setEnd(node, nodeOffset);
  } catch (e) {
    return root.textContent.length;   // 경계가 본문 밖 → 끝으로 간주
  }
  return r.toString().length;
}

/* ── 선택 범위와 겹치는 본문 영역 찾기 ──
   commonAncestorContainer + closest()는 선택이 텍스트 영역 밖으로 한 글자만 벗어나도
   부모 요소(.fp-caption, article)를 가리켜 null이 된다.
   특히 본문 맨 앞 단서는 굵은 사용자명 바로 옆에서 시작하므로 거의 항상 여기에 걸렸다.
   그래서 "포함"이 아니라 "교차"로 판정한다. */
function bodiesInRange(range) {
  return Array.from(document.querySelectorAll(".clue-text")).filter(el => {
    const full = document.createRange();
    full.selectNodeContents(el);
    const endsBeforeBody = range.compareBoundaryPoints(Range.START_TO_END, full) <= 0;
    const startsAfterBody = range.compareBoundaryPoints(Range.END_TO_START, full) >= 0;
    return !endsBeforeBody && !startsAfterBody;
  });
}

/* ── 선택 범위를 본문 경계로 잘라 문자 오프셋으로 변환 ──
   본문보다 앞에서 시작했으면 0, 본문보다 뒤에서 끝났으면 본문 끝으로 맞춘다. */
function clampSelection(bodyEl, range) {
  const full = document.createRange();
  full.selectNodeContents(bodyEl);

  const start = (range.compareBoundaryPoints(Range.START_TO_START, full) <= 0)
    ? 0
    : getCharOffset(bodyEl, range.startContainer, range.startOffset);

  const end = (range.compareBoundaryPoints(Range.END_TO_END, full) >= 0)
    ? bodyEl.textContent.length
    : getCharOffset(bodyEl, range.endContainer, range.endOffset);

  return { start: Math.min(start, end), end: Math.max(start, end) };
}

/* ── 드래그 종료 시 단서 판정 ──
   선택과 겹치는 활성 단서를 **전부** 수집한다.
   과대선택 판정은 '선택 길이 vs 단서 하나'가 아니라
   '단서가 아닌 부분의 총량'으로 한다. 그래야
     - 해시태그·조사가 함께 잡혀도 통과하고
     - 단서 2개 이상을 한 번에 드래그하면 모두 수집되며
     - 본문을 통째로 긁는 것은 여전히 걸러진다. */
function handleClueSelection() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  if (range.collapsed) return;                  // 클릭만 한 경우

  const bodies = bodiesInRange(range);
  if (bodies.length !== 1) return;              // 텍스트와 안 겹치거나, 여러 영역에 걸침
  const bodyEl = bodies[0];

  const host = hostOf(bodyEl.dataset.post, bodyEl.dataset.comment);
  if (!host || !host.clues.length) return;

  const { start: selStart, end: selEnd } = clampSelection(bodyEl, range);
  if (selEnd <= selStart) return;
  const selLen = selEnd - selStart;

  const text = host.text;

  /* 1단계 — 선택과 겹치는 후보를 모으고, 단서가 차지하는 길이를 센다 */
  const hits = [];
  let clueLen = 0;
  host.clues.forEach(clue => {
    if (P.foundClues.has(clue.id)) return;      // 이미 찾음
    if (!isClueUnlocked(clue.id)) return;       // 활성 목표에 속하지 않으면 잠김

    const start = text.indexOf(clue.phrase);
    if (start === -1) return;                   // 본문에 없는 문구
    const end = start + clue.phrase.length;
    if (selStart >= end || selEnd <= start) return;   // 안 겹침

    hits.push(clue);
    clueLen += Math.min(selEnd, end) - Math.max(selStart, start);   // 실제 겹친 길이
  });

  if (!hits.length) return;                     // 오답·잠김: 무반응

  /* 2단계 — 단서가 아닌 부분이 예산을 넘으면 과대선택으로 본다 */
  if (selLen - clueLen > CLUE_SELECTION_SLACK) {
    noteHint("선택이 너무 넓습니다 — 단서 문장에 가깝게 드래그하세요");
    return;
  }

  const just = new Set(hits.map(c => c.id));
  hits.forEach(c => P.foundClues.add(c.id));

  sel.removeAllRanges();
  P._justFound = { ids: just };
  P.hint = null;
  advanceObjectiveIfCleared();                  // 목표 완료 처리 (자동 진행)
  render();
  P._justFound = null;
}

/* 기획자 뷰에서만 보이는 안내. 조용한 실패를 진단 가능하게 만든다. */
function noteHint(msg) {
  if (!P.showClues) return;
  P.hint = msg;
  render();
}

/* ── 목표 완료 판정 ──
   활성 목표의 단서를 모두 찾으면 완료 기록. autoAdvance면 다음 미완료 목표로 전환. */
function advanceObjectiveIfCleared() {
  const obj = activeObjective();
  if (!obj) return;
  if (!objectiveProgress(obj).done) return;

  if (!P.clearedObjectives.includes(obj.id)) P.clearedObjectives.push(obj.id);

  if (P.autoAdvance) {
    const next = nextOpenObjective(obj.id);
    P.activeObjectiveId = next ? next.id : "";   // 남은 목표가 없으면 전체 완료
  }
}

document.addEventListener("mouseup", handleClueSelection);
document.addEventListener("touchend", () => setTimeout(handleClueSelection, 10));
