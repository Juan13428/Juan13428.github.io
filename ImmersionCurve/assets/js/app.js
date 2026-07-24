/* ────────────────────────────────────────────
   몰입 곡선 에디터 — app.js
   버전: 1.0.0
   기본 데이터는 data/default-data.json에서 로드
   ──────────────────────────────────────────── */
"use strict";

/* ── 상태 ── */
const SLOTS = 5;
const state = { curves: [], activeCurve: 0, events: [], flow: { on: true, y0: 20, y1: 75, w: 26 } };
let eventMode = false;

/* 내장 폴백 데이터 (data/default-data.json 로드 실패 시 — 예: file:// 직접 실행) */
const FALLBACK_DATA = {
  curves: [
    { name: "메인 플로우", slot: 0, visible: true,
      points: [ {x:0,y:20,name:"튜토리얼",link:""},{x:15,y:45,name:"첫 전투",link:""},{x:28,y:35,name:"",link:""},{x:45,y:62,name:"중간 보스",link:""},{x:58,y:48,name:"",link:""},{x:75,y:72,name:"신규 메카닉 해금",link:""},{x:90,y:58,name:"",link:""},{x:100,y:88,name:"최종 보스",link:""} ] },
  ],
  activeCurve: 0,
  events: [ {x:45, label:"중간 보스"}, {x:100, label:"최종 보스"} ],
  flow: { on: true, y0: 20, y1: 75, w: 26 },
};

/* ── 데이터 적용 (초기 로드 + JSON 불러오기 공용) ── */
function applyData(d) {
  if (!d || !Array.isArray(d.curves)) return false;
  state.curves = d.curves.map((c, i) => ({
    name: String(c.name || "곡선"), slot: Number.isInteger(c.slot) ? c.slot : i,
    visible: c.visible !== false,
    points: (c.points || []).map(p => ({ x: +p.x || 0, y: +p.y || 0,
      name: String(p.name || ""), link: String(p.link || "") })),
  }));
  state.events = (d.events || []).map(ev => ({ x: +ev.x || 0, label: String(ev.label || "") }));
  if (d.flow) {
    if (d.flow.min != null && d.flow.max != null && d.flow.y0 == null) {
      /* 구버전(수평 밴드) JSON 호환 */
      const mid = ((+d.flow.min || 35) + (+d.flow.max || 75)) / 2;
      state.flow = { on: d.flow.on !== false, y0: mid, y1: mid, w: (+d.flow.max || 75) - (+d.flow.min || 35) };
    } else {
      state.flow = { on: d.flow.on !== false, y0: +d.flow.y0 || 0, y1: +d.flow.y1 || 0, w: Math.max(4, +d.flow.w || 26) };
    }
  }
  state.activeCurve = Math.max(0, Math.min(d.activeCurve || 0, state.curves.length - 1));
  render();
  return true;
}

/* ---------- 차트 지오메트리 ---------- */
const VB = { w: 900, h: 480 };
const M = { l: 52, r: 20, t: 34, b: 44 };
const PW = VB.w - M.l - M.r, PH = VB.h - M.t - M.b;
const X = x => M.l + (x / 100) * PW;
const Y = y => M.t + (1 - y / 100) * PH;
const invX = px => Math.max(0, Math.min(100, (px - M.l) / PW * 100));
const invY = py => Math.max(0, Math.min(100, (1 - (py - M.t) / PH) * 100));

const svg = document.getElementById("chart");
const NS = "http://www.w3.org/2000/svg";
const tooltip = document.getElementById("tooltip");

function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function seriesColor(slot) { return css("--series-" + (slot % SLOTS + 1)); }

function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

/* Catmull-Rom → cubic bezier path (단조 x 정렬 가정) */
function curvePath(pts) {
  if (pts.length === 0) return "";
  if (pts.length === 1) { const p = pts[0]; return `M ${X(p.x)} ${Y(p.y)}`; }
  const P = pts.map(p => ({ x: X(p.x), y: Y(p.y) }));
  let d = `M ${P[0].x} ${P[0].y}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/* 곡선의 x 위치 보간값 (툴팁용) */
function curveValueAt(curve, x) {
  const pts = curve.points;
  if (!pts.length) return null;
  if (x <= pts[0].x) return pts[0].y;
  if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
  for (let i = 0; i < pts.length - 1; i++) {
    if (x >= pts[i].x && x <= pts[i + 1].x) {
      const t = (x - pts[i].x) / (pts[i + 1].x - pts[i].x || 1);
      const tt = t * t * (3 - 2 * t); // smoothstep 근사
      return pts[i].y + (pts[i + 1].y - pts[i].y) * tt;
    }
  }
  return null;
}

/* ---------- 렌더링 ---------- */
function render() {
  svg.innerHTML = "";
  const gridC = css("--grid"), axisC = css("--axis"), mutedC = css("--text-muted"),
        secC = css("--text-secondary"), surfC = css("--surface-1");

  /* 플로우 채널 밴드 (사선 평행 밴드) */
  if (state.flow.on) {
    const f = state.flow;
    const cAt = x => f.y0 + (f.y1 - f.y0) * x / 100;
    const half = f.w / 2;
    /* 플롯 영역 클리핑 */
    const defs = el("defs", {}, svg);
    const clip = el("clipPath", { id: "plotClip" }, defs);
    el("rect", { x: M.l, y: M.t, width: PW, height: PH }, clip);
    const fg = el("g", { "clip-path": "url(#plotClip)" }, svg);
    /* 밴드 폴리곤 */
    const pts = [
      [X(0), Y(cAt(0) + half)], [X(100), Y(cAt(100) + half)],
      [X(100), Y(cAt(100) - half)], [X(0), Y(cAt(0) - half)],
    ].map(p => p.join(",")).join(" ");
    el("polygon", { points: pts, fill: css("--flow-band"), class: "deco" }, fg);
    /* 평행 점선 2개 + 드래그 히트 영역 */
    for (const [off, edge] of [[+half, "upper"], [-half, "lower"]]) {
      el("line", { x1: X(0), y1: Y(f.y0 + off), x2: X(100), y2: Y(f.y1 + off),
        stroke: css("--flow-edge"), "stroke-width": 1.5, "stroke-dasharray": "5 4", class: "deco" }, fg);
      const h = el("line", { x1: X(0), y1: Y(f.y0 + off), x2: X(100), y2: Y(f.y1 + off),
        stroke: "transparent", "stroke-width": 14, class: "flow-handle" }, fg);
      h.dataset.flowEdge = edge;
    }
    /* FLOW 라벨 (사선 각도에 맞춰 회전) */
    const cx = X(50), cy = Y(cAt(50));
    const angle = Math.atan2(Y(cAt(100)) - Y(cAt(0)), X(100) - X(0)) * 180 / Math.PI;
    const fl = el("text", { x: cx, y: cy + 4, "text-anchor": "middle", "font-size": 15,
      "font-weight": 700, "letter-spacing": "4", fill: css("--flow-edge"),
      transform: `rotate(${angle} ${cx} ${cy})` }, fg);
    fl.textContent = "F L O W";
    /* 영역 라벨 (고정 코너) */
    const t1 = el("text", { x: M.l + 12, y: M.t + 20, "font-size": 11, fill: mutedC }, svg);
    t1.textContent = "과부하 (불안)";
    const t2 = el("text", { x: M.l + PW - 10, y: M.t + PH - 10, "text-anchor": "end",
      "font-size": 11, fill: mutedC }, svg);
    t2.textContent = "지루함";
  }

  /* 그리드 + 축 */
  for (let v = 0; v <= 100; v += 20) {
    el("line", { x1: M.l, x2: M.l + PW, y1: Y(v), y2: Y(v), stroke: gridC, "stroke-width": 1 }, svg);
    const t = el("text", { x: M.l - 8, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, fill: mutedC }, svg);
    t.textContent = v;
  }
  for (let v = 0; v <= 100; v += 10) {
    if (v % 20 !== 0) continue;
    const t = el("text", { x: X(v), y: M.t + PH + 18, "text-anchor": "middle", "font-size": 11, fill: mutedC }, svg);
    t.textContent = v + "%";
  }
  el("line", { x1: M.l, x2: M.l + PW, y1: Y(0), y2: Y(0), stroke: axisC, "stroke-width": 1 }, svg);
  el("line", { x1: M.l, x2: M.l, y1: M.t, y2: M.t + PH, stroke: axisC, "stroke-width": 1 }, svg);
  const yl = el("text", { x: 14, y: M.t - 14, "font-size": 11, fill: secC }, svg);
  yl.textContent = "몰입 강도";
  const xl = el("text", { x: M.l + PW, y: M.t + PH + 36, "text-anchor": "end", "font-size": 11, fill: secC }, svg);
  xl.textContent = "게임 진행도 →";

  /* 이벤트 마커 */
  state.events.forEach((ev, i) => {
    const x = X(ev.x);
    el("line", { x1: x, x2: x, y1: M.t + 10, y2: M.t + PH, stroke: secC,
      "stroke-width": 1, "stroke-dasharray": "2 3", opacity: 0.7, class: "deco" }, svg);
    const label = ev.label || "이벤트";
    const tw = Math.max(30, label.length * 11 + 14);
    const g = el("g", { class: "ev-hit" }, svg);
    g.dataset.evIndex = i;
    const bx = Math.min(Math.max(x - tw / 2, M.l), M.l + PW - tw);
    el("rect", { x: bx, y: M.t - 4, width: tw, height: 18, rx: 5,
      fill: surfC, stroke: secC, "stroke-width": 1 }, g);
    const t = el("text", { x: bx + tw / 2, y: M.t + 9, "text-anchor": "middle",
      "font-size": 11, fill: secC }, g);
    t.textContent = label;
    el("circle", { cx: x, cy: M.t + 14, r: 2.5, fill: secC }, g);
  });

  /* 곡선 */
  state.curves.forEach((c, ci) => {
    if (!c.visible) return;
    const col = seriesColor(c.slot);
    const active = ci === state.activeCurve;
    const pts = [...c.points].sort((a, b) => a.x - b.x);
    el("path", { d: curvePath(pts), fill: "none", stroke: col,
      "stroke-width": active ? 2.5 : 2, "stroke-linecap": "round",
      opacity: active ? 1 : 0.55 }, svg);
    /* 직접 라벨 (마지막 포인트 옆) — 포인트 이름과 겹치면 위로 회피 */
    if (pts.length) {
      const last = pts[pts.length - 1];
      const dy = (active && last.name) ? -26 : -8;
      const lt = el("text", { x: Math.min(X(last.x) + 6, M.l + PW - 2), y: Y(last.y) + dy,
        "font-size": 11, "font-weight": active ? 700 : 400, fill: secC,
        "text-anchor": X(last.x) > M.l + PW - 70 ? "end" : "start" }, svg);
      lt.textContent = c.name;
    }
    /* 포인트 (활성 곡선만 편집 핸들) */
    if (active) {
      pts.forEach(p => {
        const idx = c.points.indexOf(p);
        const hl = hlPoint && hlPoint.ci === ci && hlPoint.pi === idx;
        if (hl) el("circle", { cx: X(p.x), cy: Y(p.y), r: 11, fill: "none",
          stroke: col, "stroke-width": 2, opacity: 0.45, class: "deco hl-ring" }, svg);
        const cir = el("circle", { cx: X(p.x), cy: Y(p.y), r: hl ? 7 : 6, fill: col,
          stroke: surfC, "stroke-width": 2, class: "pt" }, svg);
        cir.dataset.ptIndex = idx;
        cir.dataset.curveIndex = ci;
        /* 포인트 이름 라벨 (리스트와 실시간 연동) */
        const tw = (p.name || "").length * 11;
        const lx = Math.max(M.l + tw / 2 + 2, Math.min(M.l + PW - tw / 2 - 2, X(p.x)));
        const above = Y(p.y) - 14 > M.t + 10;
        const lbl = el("text", { x: lx, y: above ? Y(p.y) - 14 : Y(p.y) + 24,
          "text-anchor": "middle", "font-size": 11, fill: secC }, svg);
        lbl.dataset.ptLabel = ci + "-" + idx;
        lbl.textContent = p.name || "";
      });
    }
  });

  /* 플로우 채널 각도 조절 핸들 (양 끝 ◆) — 최상단 레이어 */
  if (state.flow.on) {
    for (const [xv, yv, end] of [[0, state.flow.y0, "y0"], [100, state.flow.y1, "y1"]]) {
      const hx = X(xv), hy = Y(Math.max(0, Math.min(100, yv)));
      el("rect", { x: hx - 5, y: hy - 5, width: 10, height: 10, rx: 2,
        transform: `rotate(45 ${hx} ${hy})`, fill: surfC,
        stroke: css("--flow-edge"), "stroke-width": 2, class: "flow-rot" }, svg)
        .dataset.flowEnd = end;
    }
  }

  renderCurveList();
  renderEventList();
  renderPointList();
  syncFlowInputs();
}

/* ---------- 포인트 리스트 (활성 곡선) ---------- */
let hlPoint = null;

/* 호버 하이라이트: 리스트를 다시 그리지 않고 차트만 직접 갱신 (편집 포커스 보존) */
function setPointHighlight(ci, pi, on) {
  hlPoint = on ? { ci, pi } : null;
  const old = svg.querySelector("circle.hl-ring");
  if (old) old.remove();
  const cir = svg.querySelector(`circle.pt[data-curve-index="${ci}"][data-pt-index="${pi}"]`);
  if (!cir) return;
  cir.setAttribute("r", on ? 7 : 6);
  if (on) {
    const ring = el("circle", { cx: cir.getAttribute("cx"), cy: cir.getAttribute("cy"),
      r: 11, fill: "none", stroke: cir.getAttribute("fill"), "stroke-width": 2,
      opacity: 0.45, class: "deco hl-ring" });
    svg.insertBefore(ring, cir);
  }
}
function renderPointList() {
  const box = document.getElementById("point-list");
  const title = document.getElementById("pt-list-title");
  box.innerHTML = "";
  const ci = state.activeCurve;
  const c = state.curves[ci];
  if (!c) { title.textContent = "포인트"; box.innerHTML = '<div class="empty-note">곡선을 선택하면 포인트 목록이 표시됩니다.</div>'; return; }
  title.textContent = `포인트 — ${c.name}`;
  const sorted = c.points.map((p, pi) => ({ p, pi })).sort((a, b) => a.p.x - b.p.x);
  const col = seriesColor(c.slot);
  sorted.forEach(({ p, pi }, order) => {
    const row = document.createElement("div");
    row.className = "pt-row";
    row.addEventListener("mouseenter", () => setPointHighlight(ci, pi, true));
    row.addEventListener("mouseleave", () => setPointHighlight(ci, pi, false));

    const num = document.createElement("span");
    num.className = "pt-num"; num.style.background = col;
    num.textContent = order + 1;
    row.appendChild(num);

    const coord = document.createElement("span");
    coord.className = "pt-coord";
    coord.textContent = `${Math.round(p.x)}% · ${Math.round(p.y)}`;
    coord.title = "진행도 · 몰입 강도";
    row.appendChild(coord);

    const name = document.createElement("input");
    name.className = "pt-name"; name.value = p.name || "";
    name.placeholder = "포인트 이름";
    name.addEventListener("input", () => {
      p.name = name.value;
      /* 차트 라벨 실시간 연동 (위치 클램프 포함) */
      const lbl = svg.querySelector(`text[data-pt-label="${ci}-${pi}"]`);
      if (lbl) {
        lbl.textContent = p.name;
        const tw = p.name.length * 11;
        lbl.setAttribute("x", Math.max(M.l + tw / 2 + 2, Math.min(M.l + PW - tw / 2 - 2, X(p.x))));
      }
    });
    row.appendChild(name);

    const go = document.createElement("a");
    go.className = "pt-go" + (p.link ? "" : " off");
    go.textContent = "↗"; go.target = "_blank"; go.rel = "noopener";
    go.title = "링크 열기";
    if (p.link) go.href = /^https?:\/\//i.test(p.link) ? p.link : "https://" + p.link;

    const link = document.createElement("input");
    link.className = "pt-link"; link.value = p.link || "";
    link.placeholder = "링크 (문서 URL 등)";
    link.addEventListener("input", () => {
      p.link = link.value.trim();
      go.classList.toggle("off", !p.link);
      if (p.link) go.href = /^https?:\/\//i.test(p.link) ? p.link : "https://" + p.link;
      else go.removeAttribute("href");
    });
    row.appendChild(link);
    row.appendChild(go);

    box.appendChild(row);
  });
  if (!sorted.length) box.innerHTML = '<div class="empty-note">차트를 클릭해 포인트를 추가하세요.</div>';
}

/* ---------- 사이드 패널 ---------- */
function renderCurveList() {
  const box = document.getElementById("curve-list");
  box.innerHTML = "";
  state.curves.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "curve-row" + (i === state.activeCurve ? " active" : "");
    row.addEventListener("click", e => {
      if (e.target.closest("button") || e.target.tagName === "INPUT") return;
      state.activeCurve = i; render();
    });

    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = seriesColor(c.slot);
    row.appendChild(sw);

    const name = document.createElement("input");
    name.className = "curve-name"; name.value = c.name;
    name.title = "곡선 이름 (클릭해서 수정)";
    name.addEventListener("focus", () => { state.activeCurve = i; });
    name.addEventListener("change", () => { c.name = name.value || "곡선"; render(); });
    row.appendChild(name);

    const vis = document.createElement("button");
    vis.className = "icon-btn vis"; vis.textContent = c.visible ? "표시" : "숨김";
    vis.title = "표시/숨김";
    vis.addEventListener("click", () => { c.visible = !c.visible; render(); });
    row.appendChild(vis);

    const del = document.createElement("button");
    del.className = "icon-btn del"; del.textContent = "✕"; del.title = "곡선 삭제";
    del.addEventListener("click", () => {
      state.curves.splice(i, 1);
      if (state.activeCurve >= state.curves.length) state.activeCurve = state.curves.length - 1;
      render();
    });
    row.appendChild(del);
    box.appendChild(row);
  });
  if (!state.curves.length) {
    box.innerHTML = '<div class="empty-note">곡선 추가 버튼으로 새 곡선을 만드세요.</div>';
  }
}

function renderEventList() {
  const box = document.getElementById("event-list");
  box.innerHTML = "";
  const sorted = [...state.events].map((ev, i) => ({ ev, i })).sort((a, b) => a.ev.x - b.ev.x);
  sorted.forEach(({ ev, i }) => {
    const row = document.createElement("div");
    row.className = "ev-row";
    const x = document.createElement("span");
    x.className = "ev-x"; x.textContent = Math.round(ev.x) + "%";
    row.appendChild(x);
    const label = document.createElement("input");
    label.className = "ev-label"; label.value = ev.label;
    label.placeholder = "이벤트 이름";
    label.addEventListener("change", () => { ev.label = label.value; render(); });
    row.appendChild(label);
    const del = document.createElement("button");
    del.className = "icon-btn del"; del.textContent = "✕"; del.title = "이벤트 삭제";
    del.addEventListener("click", () => { state.events.splice(i, 1); render(); });
    row.appendChild(del);
    box.appendChild(row);
  });
  if (!state.events.length) {
    box.innerHTML = '<div class="empty-note">이벤트 배치 모드를 켜고 차트를 클릭하세요.</div>';
  }
}

function syncFlowInputs() {
  document.getElementById("flow-on").checked = state.flow.on;
  document.getElementById("flow-y0").value = Math.round(state.flow.y0);
  document.getElementById("flow-y1").value = Math.round(state.flow.y1);
  document.getElementById("flow-w").value = Math.round(state.flow.w);
}

/* ---------- 포인터 인터랙션 ---------- */
function svgPoint(e) {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

let drag = null; // {type:'point'|'flow'|'event', ...}

svg.addEventListener("pointerdown", e => {
  const p = svgPoint(e);
  const ptEl = e.target.closest(".pt");
  const flowEl = e.target.closest(".flow-handle");
  const rotEl = e.target.closest(".flow-rot");
  const evEl = e.target.closest(".ev-hit");
  if (ptEl) {
    drag = { type: "point", ci: +ptEl.dataset.curveIndex, pi: +ptEl.dataset.ptIndex, moved: false };
  } else if (evEl) {
    drag = { type: "event", i: +evEl.dataset.evIndex, moved: false };
  } else if (rotEl) {
    drag = { type: "flowEnd", end: rotEl.dataset.flowEnd };
  } else if (flowEl) {
    drag = { type: "flowWidth", edge: flowEl.dataset.flowEdge };
  } else if (p.x >= M.l && p.x <= M.l + PW && p.y >= M.t && p.y <= M.t + PH) {
    if (eventMode) {
      state.events.push({ x: Math.round(invX(p.x)), label: "" });
      render();
      const inputs = document.querySelectorAll(".ev-label");
      if (inputs.length) inputs[inputs.length - 1].focus();
    } else if (state.curves[state.activeCurve]) {
      const c = state.curves[state.activeCurve];
      c.points.push({ x: Math.round(invX(p.x)), y: Math.round(invY(p.y)), name: "", link: "" });
      c.points.sort((a, b) => a.x - b.x);
      render();
    }
    return;
  }
  if (drag) svg.setPointerCapture(e.pointerId);
});

svg.addEventListener("pointermove", e => {
  const p = svgPoint(e);
  if (drag) {
    if (drag.type === "point") {
      const c = state.curves[drag.ci];
      if (c && c.points[drag.pi]) {
        c.points[drag.pi].x = Math.round(invX(p.x));
        c.points[drag.pi].y = Math.round(invY(p.y));
        drag.moved = true;
        render();
      }
    } else if (drag.type === "flowEnd") {
      /* 양 끝 핸들: 사선의 각도·위치 조절 */
      const v = Math.round(invY(p.y));
      state.flow[drag.end] = v;
      render();
    } else if (drag.type === "flowWidth") {
      /* 점선 드래그: 중심선 기준 대칭으로 폭 조절 */
      const f = state.flow;
      const xv = invX(p.x), yv = (1 - (p.y - M.t) / PH) * 100; /* 클램프 없는 y값 */
      const c = f.y0 + (f.y1 - f.y0) * xv / 100;
      const halfNew = drag.edge === "upper" ? yv - c : c - yv;
      f.w = Math.round(Math.max(4, Math.min(100, halfNew * 2)));
      render();
    } else if (drag.type === "event") {
      const ev = state.events[drag.i];
      if (ev) { ev.x = Math.round(invX(p.x)); drag.moved = true; render(); }
    }
    hideTooltip();
    return;
  }
  updateTooltip(e, p);
});

svg.addEventListener("pointerup", () => { drag = null; });
svg.addEventListener("pointerleave", () => { hideTooltip(); });

svg.addEventListener("dblclick", e => {
  const ptEl = e.target.closest(".pt");
  if (ptEl) {
    const c = state.curves[+ptEl.dataset.curveIndex];
    if (c && c.points.length > 1) { c.points.splice(+ptEl.dataset.ptIndex, 1); render(); }
  }
});

/* ---------- 툴팁 ---------- */
function updateTooltip(e, p) {
  if (p.x < M.l || p.x > M.l + PW || p.y < M.t || p.y > M.t + PH) { hideTooltip(); return; }
  const x = invX(p.x);
  const rows = state.curves.filter(c => c.visible && c.points.length).map(c => {
    const v = curveValueAt({ points: [...c.points].sort((a, b) => a.x - b.x) }, x);
    return { name: c.name, col: seriesColor(c.slot), v };
  });
  if (!rows.length) { hideTooltip(); return; }
  const near = state.events.filter(ev => Math.abs(ev.x - x) < 2.5);
  let html = `<div class="tt-x">진행도 ${Math.round(x)}%</div>`;
  for (const r of rows) {
    html += `<div class="tt-row"><span class="swatch" style="background:${r.col}"></span>` +
            `<span>${escapeHtml(r.name)}</span><span class="tt-val">${r.v == null ? "-" : Math.round(r.v)}</span></div>`;
  }
  for (const ev of near) html += `<div class="tt-ev">🚩 ${escapeHtml(ev.label || "이벤트")}</div>`;
  tooltip.innerHTML = html;
  tooltip.style.display = "block";
  const card = svg.parentElement.getBoundingClientRect();
  let tx = e.clientX - card.left + 16, ty = e.clientY - card.top + 12;
  if (tx + tooltip.offsetWidth > card.width - 8) tx = e.clientX - card.left - tooltip.offsetWidth - 12;
  tooltip.style.left = tx + "px";
  tooltip.style.top = ty + "px";
}
function hideTooltip() { tooltip.style.display = "none"; }
function escapeHtml(s) { return s.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }

/* ---------- 툴바 ---------- */
document.getElementById("btn-add-curve").addEventListener("click", () => {
  const slot = state.curves.length % SLOTS;
  state.curves.push({ name: "곡선 " + (state.curves.length + 1), slot, visible: true,
    points: [{ x: 0, y: 20 }, { x: 50, y: 50 }, { x: 100, y: 70 }] });
  state.activeCurve = state.curves.length - 1;
  render();
});

const evBtn = document.getElementById("btn-event-mode");
evBtn.addEventListener("click", () => {
  eventMode = !eventMode;
  evBtn.classList.toggle("mode-active", eventMode);
});

document.getElementById("flow-on").addEventListener("change", e => { state.flow.on = e.target.checked; render(); });
document.getElementById("flow-y0").addEventListener("change", e => {
  state.flow.y0 = Math.max(0, Math.min(100, +e.target.value || 0)); render();
});
document.getElementById("flow-y1").addEventListener("change", e => {
  state.flow.y1 = Math.max(0, Math.min(100, +e.target.value || 0)); render();
});
document.getElementById("flow-w").addEventListener("change", e => {
  state.flow.w = Math.max(4, Math.min(100, +e.target.value || 4)); render();
});

/* 저장 / 불러오기 / PNG */
document.getElementById("btn-save").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  downloadBlob(blob, "immersion-curve.json");
});
document.getElementById("file-load").addEventListener("change", e => {
  const f = e.target.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      if (!applyData(JSON.parse(rd.result))) alert("올바른 몰입 곡선 JSON 파일이 아닙니다.");
    } catch { alert("JSON 파싱에 실패했습니다."); }
  };
  rd.readAsText(f);
  e.target.value = "";
});
document.getElementById("btn-png").addEventListener("click", () => {
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", NS);
  clone.setAttribute("width", VB.w * 2);
  clone.setAttribute("height", VB.h * 2);
  const bg = document.createElementNS(NS, "rect");
  bg.setAttribute("x", 0); bg.setAttribute("y", 0);
  bg.setAttribute("width", VB.w); bg.setAttribute("height", VB.h);
  bg.setAttribute("fill", css("--surface-1"));
  clone.insertBefore(bg, clone.firstChild);
  clone.querySelectorAll("text").forEach(t =>
    t.setAttribute("font-family", 'system-ui, -apple-system, "Segoe UI", sans-serif'));
  const data = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([data], { type: "image/svg+xml;charset=utf-8" }));
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement("canvas");
    cv.width = VB.w * 2; cv.height = VB.h * 2;
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    URL.revokeObjectURL(url);
    cv.toBlob(b => downloadBlob(b, "immersion-curve.png"), "image/png");
  };
  img.src = url;
});
function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* 테마 토글 */
document.getElementById("btn-theme").addEventListener("click", () => {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  render();
});
if (matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.dataset.theme = "dark";

/* ── 초기화: 기본 데이터 로드 ── */
render();
fetch("data/default-data.json")
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(d => { if (!applyData(d)) applyData(FALLBACK_DATA); })
  .catch(() => { applyData(FALLBACK_DATA); });
