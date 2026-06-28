// ================================================================
// assets/js/app.js — 사후관리 AI · 답장 합성 프로토타입
// version: 1.1.0
// ================================================================

(function () {

  // ── 상수 ──
  const ROW_H = 46;                              // 휠 한 행 높이(px)
  const VISIBLE_ROWS = Math.round(240 / ROW_H);  // 보이는 행 수 (~5)

  // ── 빈칸 데이터: 각 슬롯의 앞/뒤 텍스트와 후보 단어 목록 ──
  const blanks = [
    {
      key: 'b1',
      prefix: '당연히 기억하지, 그때 한강에서 ',
      suffix: ' 보면서',
      candidates: [
        { word: '불꽃놀이', pct: 72 },
        { word: '노을',     pct: 14 },
        { word: '야경',     pct:  8 },
        { word: '영화',     pct:  4 },
        { word: '비둘기',   pct:  2 },
      ]
    },
    {
      key: 'b2',
      prefix: ' ',
      suffix: ' 먹고',
      candidates: [
        { word: '치킨',   pct: 58 },
        { word: '라면',   pct: 21 },
        { word: '떡볶이', pct: 12 },
        { word: '맥주',   pct:  7 },
        { word: '김밥',   pct:  2 },
      ]
    },
    {
      key: 'b3',
      prefix: ' ',
      suffix: '까지 있었잖아',
      candidates: [
        { word: '새벽 3시', pct: 49 },
        { word: '자정',     pct: 27 },
        { word: '막차',     pct: 16 },
        { word: '해뜰 때', pct:  8 },
      ]
    }
  ];

  // ── 상태 변수 ──
  let current     = 0;               // 현재 편집 중인 빈칸 인덱스
  let picked      = [null, null, null]; // 각 빈칸에 선택된 단어 정보
  let activeIndex = 0;               // 휠 내 현재 강조 행 인덱스
  let scrollRaf   = null;            // scroll 이벤트 RAF 핸들
  let isStepping  = false;           // 한 칸 이동 애니메이션 진행 중 여부 (입력 잠금)
  let isSent      = false;           // 메시지 전송 후 편집 잠금 여부

  // ── DOM 참조 ──
  const wheelEl       = document.getElementById('wheel');
  const sentenceEl    = document.getElementById('sentence');
  const progressLabel = document.getElementById('progressLabel');
  const panelTitle    = document.getElementById('panelTitle');
  const confirmBtn    = document.getElementById('confirmBtn');
  const panel         = document.getElementById('panel');
  const sendPanel     = document.getElementById('sendPanel');
  const chatEl        = document.getElementById('chat');
  const postReply     = document.getElementById('postReply');


  // ════════════════════════════════════════════════════
  // 빈칸 열기 / 슬롯 클릭
  // ════════════════════════════════════════════════════

  // 특정 빈칸을 편집 대상으로 설정하고 피커 패널을 열기
  function openBlank(i) {
    if (isSent) return;
    current = i;
    panel.style.display = 'block';
    sendPanel.style.display = 'none';
    buildWheel(i);
    renderSentence();
    updateProgress();
  }

  // 말풍선 내 단어(또는 빈칸) 클릭 시 해당 슬롯의 피커로 이동
  sentenceEl.addEventListener('click', (e) => {
    const slot = e.target.closest('.slot');
    if (!slot) return;
    openBlank(parseInt(slot.dataset.bi, 10));
  });


  // ════════════════════════════════════════════════════
  // 휠 렌더링 및 스크롤 제어
  // ════════════════════════════════════════════════════

  // 현재 빈칸의 후보 개수를 반환
  function stepCount() {
    return blanks[current].candidates.length;
  }

  // targetIndex 행으로 부드럽게(ease-out cubic) 스크롤 이동
  function animateToIndex(targetIndex) {
    const max      = stepCount() - 1;
    const clamped  = Math.max(0, Math.min(max, targetIndex));
    const startTop = wheelEl.scrollTop;
    const endTop   = clamped * ROW_H;
    if (startTop === endTop) { isStepping = false; return; }

    isStepping = true;
    const duration  = 190;
    const startTime = performance.now();

    function frame(now) {
      const t     = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);  // ease-out cubic
      wheelEl.scrollTop = startTop + (endTop - startTop) * eased;
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        wheelEl.scrollTop = endTop;
        updateActiveRow();
        isStepping = false;
      }
    }
    requestAnimationFrame(frame);
  }

  // 스크롤 위치를 기준으로 현재 중앙 행을 계산하고 .active 클래스 갱신
  function updateActiveRow() {
    const rows = wheelEl.querySelectorAll('.row');
    const raw  = wheelEl.scrollTop / ROW_H;
    const idx  = Math.max(0, Math.min(rows.length - 1, Math.round(raw)));
    activeIndex = idx;
    rows.forEach((r, i) => r.classList.toggle('active', i === idx));
  }

  // 스크롤 이벤트: RAF로 throttle하여 activeRow 갱신
  wheelEl.addEventListener('scroll', () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      updateActiveRow();
      scrollRaf = null;
    });
  });

  // 마우스 휠/트랙패드: 네이티브 스냅 대신 한 칸씩 이동하도록 인터셉트
  // (snap 컨테이너를 네이티브로 두면 2-3행씩 튀기 때문에 직접 제어)
  wheelEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (isStepping) return;
    const direction = e.deltaY > 0 ? 1 : -1;
    animateToIndex(activeIndex + direction);
  }, { passive: false });

  // 위/아래 넛지 버튼
  document.getElementById('nudgeUp').addEventListener('click', () => {
    if (isStepping) return;
    animateToIndex(activeIndex - 1);
  });
  document.getElementById('nudgeDown').addEventListener('click', () => {
    if (isStepping) return;
    animateToIndex(activeIndex + 1);
  });

  // blankIndex에 해당하는 후보 목록으로 휠 DOM을 새로 구성
  function buildWheel(blankIndex) {
    const cands  = blanks[blankIndex].candidates;
    const maxPct = Math.max(...cands.map(c => c.pct));
    wheelEl.innerHTML = '';

    // 상단 스페이서 (중앙 정렬을 위해 빈 공간 추가)
    const topSpacer = document.createElement('div');
    topSpacer.className    = 'spacer';
    topSpacer.style.height = (ROW_H * 2) + 'px';
    wheelEl.appendChild(topSpacer);

    // 후보 행 생성
    cands.forEach((c, idx) => {
      const row = document.createElement('div');
      row.className   = 'row';
      row.dataset.idx = idx;
      row.innerHTML = `
        <div class="word">${escapeHtml(c.word)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(c.pct / maxPct * 100).toFixed(0)}%;"></div></div>
        <div class="pct">${c.pct}%</div>
      `;
      // 행 클릭 시 해당 인덱스로 이동
      row.addEventListener('click', () => animateToIndex(idx));
      wheelEl.appendChild(row);
    });

    // 하단 스페이서
    const bottomSpacer = document.createElement('div');
    bottomSpacer.className    = 'spacer';
    bottomSpacer.style.height = (ROW_H * 2) + 'px';
    wheelEl.appendChild(bottomSpacer);

    // 이미 선택한 단어가 있으면 그 위치로 초기 스크롤 복원
    const existing = picked[blankIndex];
    let initIdx = 0;
    if (existing) {
      const foundIdx = cands.findIndex(c => c.word === existing.word);
      if (foundIdx !== -1) initIdx = foundIdx;
    }
    wheelEl.scrollTop = initIdx * ROW_H;
    activeIndex = initIdx;
    updateActiveRow();
  }


  // ════════════════════════════════════════════════════
  // 말풍선(문장) 렌더링
  // ════════════════════════════════════════════════════

  // 현재 picked 상태를 반영하여 draft 말풍선 HTML 갱신
  function renderSentence() {
    let html = '';
    blanks.forEach((b, i) => {
      html += escapeHtml(b.prefix);
      const isCurrent = (!isSent && i === current);
      if (picked[i]) {
        // 선택된 단어: 현재 편집 중이면 editing 클래스 추가
        html += `<span class="slot filled${isCurrent ? ' editing' : ''}" data-bi="${i}">${escapeHtml(picked[i].word)}</span>`;
      } else if (isCurrent) {
        // 현재 선택 중인 빈칸: 깜빡이는 밑줄
        html += `<span class="slot blank active" data-bi="${i}">＿＿＿</span>`;
      } else {
        // 아직 선택 안 된 빈칸
        html += `<span class="slot blank" data-bi="${i}">＿＿＿</span>`;
      }
      html += escapeHtml(b.suffix);
    });
    sentenceEl.innerHTML = html;
  }

  // XSS 방지용 HTML 이스케이프
  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }


  // ════════════════════════════════════════════════════
  // 진행 상태 바 업데이트
  // ════════════════════════════════════════════════════

  function updateProgress() {
    document.querySelectorAll('#progress .step').forEach((el, i) => {
      el.classList.remove('done', 'live');
      if (i === current)  el.classList.add('live');
      else if (picked[i]) el.classList.add('done');
    });

    // 레이블: 해당 빈칸이 이미 채워져 있으면 "다시 선택" 문구 표시
    progressLabel.textContent = picked[current]
      ? `BLANK ${current + 1} / ${blanks.length} · 다시 선택 중`
      : `BLANK ${current + 1} / ${blanks.length} · 후보 단어 예측 중`;

    panelTitle.textContent = picked[current]
      ? `빈칸 ${current + 1}의 단어를 다시 선택하세요`
      : `빈칸 ${current + 1}에 들어갈 단어를 선택하세요`;
  }


  // ════════════════════════════════════════════════════
  // 단어 확정 흐름
  // ════════════════════════════════════════════════════

  // "이 단어로 확정" 버튼 클릭
  confirmBtn.addEventListener('click', () => {
    const cands  = blanks[current].candidates;
    const chosen = cands[activeIndex];
    const top    = cands.reduce((a, b) => a.pct > b.pct ? a : b); // 최고 확률 후보

    picked[current] = {
      word:    chosen.word,
      pct:     chosen.pct,
      isTop:   chosen.word === top.word, // AI 최우선 추천과 일치 여부
      topWord: top.word,
      topPct:  top.pct,
    };

    renderSentence();
    afterConfirm();
  });

  // 확정 후 다음 미완성 빈칸으로 이동하거나 전송 버튼 표시
  function afterConfirm() {
    const nextUnfilled = picked.findIndex(p => p === null);

    if (nextUnfilled === -1) {
      // 모든 빈칸이 채워짐 → 전송 버튼 표시
      panel.style.display     = 'none';
      sendPanel.style.display = 'block';
      document.querySelectorAll('#progress .step').forEach(el => {
        el.classList.remove('live');
        el.classList.add('done');
      });
      progressLabel.textContent = `BLANK ${blanks.length} / ${blanks.length} · 합성 완료`;
    } else {
      // 남은 빈칸으로 이동
      current = nextUnfilled;
      buildWheel(current);
      panel.style.display     = 'block';
      sendPanel.style.display = 'none';
      updateProgress();
    }
  }


  // ════════════════════════════════════════════════════
  // 전송 및 상대방 답장 시뮬레이션
  // ════════════════════════════════════════════════════

  // "전송" 버튼: 말풍선 잠금 후 상대방 답장 시뮬레이션 시작
  document.getElementById('sendBtn').addEventListener('click', () => {
    isSent = true;
    sentenceEl.classList.add('locked');
    renderSentence();
    sendPanel.style.display = 'none';
    simulateReply();
  });

  // 빈칸별 정답(최우선 후보) 정정 문구 템플릿
  // — 후보 수가 늘어도 이 배열만 유지하면 됨
  const correctionLine = [
    (w) => `${w} 본 거잖아`,
    (w) => `${w} 먹었잖아`,
    (w) => `${w}까지 있었잖아`,
  ];

  // 틀린 빈칸 수에 따라 상대방 답장 텍스트 생성
  // (여러 개 틀려도 메시지 하나로 묶어서 자연스럽게 표현)
  function buildReply() {
    const wrongIdx = picked
      .map((p, i) => ({ p, i }))
      .filter(o => !o.p.isTop)
      .map(o => o.i);

    if (wrongIdx.length === 0) return '너 기억력 좋아졌다?ㅋㅋ';

    const lines  = wrongIdx.map(i => correctionLine[i](picked[i].topWord));
    const joined = lines.join(', ');

    if (wrongIdx.length === 1) return `ㅋㅋ 그게 아니라 ${joined}`;
    if (wrongIdx.length === 2) return `ㅋㅋㅋ 그게 다 아니지~ ${joined}`;
    return `야... 하나도 못 맞췄네ㅋㅋ ${joined}`;
  }

  // 채팅창에 말풍선 동적 추가
  function appendBubble(kind, text) {
    const row = document.createElement('div');
    row.className = `bubble-row ${kind} dyn-row`;
    const b = document.createElement('div');
    b.className   = `bubble ${kind}`;
    b.textContent = text;
    row.appendChild(b);
    chatEl.appendChild(row);
    return row;
  }

  // 타이핑 인디케이터 표시 후 1초 뒤 실제 답장으로 교체
  function simulateReply() {
    const typingRow = document.createElement('div');
    typingRow.className = 'bubble-row in dyn-row';
    typingRow.innerHTML = `<div class="bubble in typing"><span></span><span></span><span></span></div>`;
    chatEl.appendChild(typingRow);

    setTimeout(() => {
      typingRow.remove();
      appendBubble('in', buildReply());
      postReply.style.display = 'block';
    }, 1000);
  }


  // ════════════════════════════════════════════════════
  // 게임 초기화 (다시 합성하기)
  // ════════════════════════════════════════════════════

  function resetGame() {
    current = 0;
    picked  = [null, null, null];
    isSent  = false;

    sentenceEl.classList.remove('locked');

    // 동적으로 추가된 답장 말풍선 제거
    document.querySelectorAll('.dyn-row').forEach(el => el.remove());

    postReply.style.display = 'none';
    sendPanel.style.display = 'none';
    panel.style.display     = 'block';

    renderSentence();
    buildWheel(0);
    updateProgress();
  }

  document.getElementById('restartBtn').addEventListener('click', resetGame);


  // ── 초기 실행 ──
  renderSentence();
  buildWheel(0);
  updateProgress();

})();
