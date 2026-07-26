/* ══════════════════════════════════════════════
   Instory Planner — clue-highlight.js
   버전: 1.0.0
   본문 드래그 단서 판정 · 형광펜 하이라이트 · 인라인 해시태그 렌더
   (참고 원본: archive/text-highlight-prototype.html)
   ══════════════════════════════════════════════ */

/* ── 본문 세그먼트 계산 ──
   발견된 단서 문구와 인라인 #태그의 위치를 겹치지 않게 정리해 반환한다. */
function buildMarks(post, foundSet) {
  const text = post.content || "";
  const marks = [];

  (post.cluePhrases || []).forEach((phrase, i) => {
    if (!foundSet.has(i)) return;
    const start = text.indexOf(phrase);
    if (start === -1) return;                       // 본문에서 사라진 문구는 무시
    marks.push({ start, end: start + phrase.length, type: "clue", idx: i });
  });

  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(text))) {
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
  return `<span class="fp-tag ${visited} ${active}" onclick="App.pvGoTag('${esc(tag)}')">#${esc(tag)}</span>`;
}

/* ── 게시글 본문 HTML ── */
function captionHtml(post) {
  const text = post.content || "";
  const found = P.foundClues[post.id] || new Set();
  const just = (P._justFound && P._justFound.postId === post.id) ? P._justFound.ids : new Set();
  const marks = buildMarks(post, found);

  let html = "";
  let cur = 0;
  marks.forEach(mk => {
    if (mk.start > cur) html += esc(text.slice(cur, mk.start));
    if (mk.type === "clue") {
      const anim = just.has(mk.idx) ? "sweep" : "static";
      html += `<span class="clue-highlight ${anim}">${esc(text.slice(mk.start, mk.end))}</span>`;
    } else {
      html += tagSpan(mk.tag);
    }
    cur = mk.end;
  });
  if (cur < text.length) html += esc(text.slice(cur));
  return html;
}

/* ── 댓글 HTML (인라인 #태그만 링크화) ── */
function commentHtml(text) {
  const t = String(text || "");
  let html = "";
  let cur = 0;
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(t))) {
    if (m.index > cur) html += esc(t.slice(cur, m.index));
    html += tagSpan(m[1]);
    cur = m.index + m[0].length;
  }
  return html + esc(t.slice(cur));
}

/* ── 선택 영역 -> 문자 오프셋 ──
   하이라이트·태그 span이 섞여 있어도 텍스트 노드를 순회해 정확히 계산한다. */
function getCharOffset(root, node, nodeOffset) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let count = 0;
  let current;
  while ((current = walker.nextNode())) {
    if (current === node) return count + nodeOffset;
    count += current.textContent.length;
  }
  return count;
}

/* ── 드래그 종료 시 단서 판정 ──
   판정 규칙: 선택 영역이 단서 문구와 1글자 이상 겹치면 정답.
   빈 클릭·본문 밖 드래그·이미 찾은 단서는 판정하지 않는다. 오답은 무반응. */
function handleClueSelection() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  let node = range.commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
  const bodyEl = (node && node.closest) ? node.closest(".fp-body") : null;
  if (!bodyEl) return;

  const post = postById(bodyEl.dataset.post);
  if (!post || !(post.cluePhrases || []).length) return;

  const rawStart = getCharOffset(bodyEl, range.startContainer, range.startOffset);
  const rawEnd = getCharOffset(bodyEl, range.endContainer, range.endOffset);
  const selStart = Math.min(rawStart, rawEnd);
  const selEnd = Math.max(rawStart, rawEnd);

  const text = post.content || "";
  const found = P.foundClues[post.id] = P.foundClues[post.id] || new Set();
  const just = new Set();

  (post.cluePhrases || []).forEach((phrase, i) => {
    if (found.has(i)) return;
    const start = text.indexOf(phrase);
    if (start === -1) return;
    if (selStart < start + phrase.length && selEnd > start) { found.add(i); just.add(i); }
  });

  if (just.size) {
    sel.removeAllRanges();
    P._justFound = { postId: post.id, ids: just };
    render();
    P._justFound = null;
  }
}

document.addEventListener("mouseup", handleClueSelection);
document.addEventListener("touchend", () => setTimeout(handleClueSelection, 10));
