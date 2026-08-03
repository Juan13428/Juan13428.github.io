// ================================================================
// assets/js/app.js — 사후관리 AI · 엄마 대화 시뮬레이터 (Ch.0)
// version: 1.0.0
// ================================================================

(function () {

  // ── 상태 변수 ──
  let suspicion = 0; // 의심 수치 (0~100)

  // ── DOM 참조 ──
  const chatArea = document.getElementById('chat-area');
  const controlArea = document.getElementById('control-area');
  const suspicionBar = document.getElementById('suspicion-bar');
  const suspicionText = document.getElementById('suspicion-text');

  // ── 의심 수치 갱신 ──
  function updateSuspicion(amount) {
    suspicion = Math.min(100, Math.max(0, suspicion + amount));
    suspicionText.innerText = suspicion + '%';
    suspicionBar.style.width = suspicion + '%';
    if (suspicion > 60) {
      suspicionBar.style.backgroundColor = 'var(--accent-red)';
    } else if (suspicion > 30) {
      suspicionBar.style.backgroundColor = 'var(--accent-amber)';
    } else {
      suspicionBar.style.backgroundColor = 'var(--accent-green)';
    }
  }

  // ── 메시지 렌더링 ──
  function addMomMsg(text, delay = 0) {
    return new Promise((resolve) => {
      showTyping();
      setTimeout(() => {
        removeTyping();
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble mom';
        bubble.innerHTML = `
          <div class="sender-name">엄마</div>
          <div class="message-text">${text}</div>
        `;
        chatArea.appendChild(bubble);
        chatArea.scrollTop = chatArea.scrollHeight;
        resolve();
      }, delay);
    });
  }

  function addAiMsg(text) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ai';
    bubble.innerHTML = `
      <div class="sender-name">박지훈 (AI)</div>
      <div class="message-text">${text}</div>
    `;
    chatArea.appendChild(bubble);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function addNotice(text, type = '') {
    const notice = document.createElement('div');
    notice.className = `sys-notice ${type}`;
    notice.innerHTML = text;
    chatArea.appendChild(notice);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function showTyping() {
    removeTyping();
    const typing = document.createElement('div');
    typing.className = 'typing';
    typing.id = 'typing-indicator';
    typing.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatArea.appendChild(typing);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function removeTyping() {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
  }

  // ── 시나리오 진행 단계 ──

  async function startScenario() {
    chatArea.innerHTML = '<div class="sys-notice">🔔 새로운 메신저 메시지가 도착했습니다: <strong>엄마</strong></div>';
    suspicion = 0;
    updateSuspicion(0);

    await addMomMsg('지훈아~ 자니?', 800);
    await addMomMsg('오늘따라 너 어릴 때 생각이 많이 나네…', 1200);

    renderStage1();
  }

  function renderStage1() {
    controlArea.innerHTML = `
      <div class="choice-title">💡 [1단계: 안부 메시지 선택]</div>
      <button class="choice-btn" onclick="selectStage1(1)">1. 안 자고 있었어요 엄마, 무슨 일 있으세요?</button>
      <button class="choice-btn" onclick="selectStage1(2)">2. 피곤해서 쉬고 있었어요. 감기 조심하세요.</button>
    `;
  }

  async function selectStage1(option) {
    controlArea.innerHTML = '';
    if (option === 1) {
      addAiMsg('안 자고 있었어요 엄마, 무슨 일 있으세요?');
    } else {
      addAiMsg('피곤해서 쉬고 있었어요. 감기 조심하세요.');
    }

    await addMomMsg('아니~ 그냥 앨범 정리하다가 너 초등학교 때 사진을 봤거든 ^^', 1000);
    await addMomMsg('생각나니? 너 그때 매일 밖에서 놀다 들어와서 저녁마다 그것만 해달라고 떼썼잖아~', 1200);
    await addMomMsg('엄마가 네 계정 프로필 상단에도 그 사진 올려뒀었는데, 네가 제일 좋아하던 그 시절 추억 생각나서 물어봤어~', 1500);

    renderStage2();
  }

  function renderStage2() {
    controlArea.innerHTML = `
      <div class="choice-title">💡 [2단계: 추억 단서 선택 미션]</div>
      <button class="choice-btn" onclick="selectBranch('A')"><strong>[선택지 A]</strong> 몽주 (반려견 사진)</button>
      <button class="choice-btn" onclick="selectBranch('B')"><strong>[선택지 B]</strong> 불고기 (어머니가 해주신 요리)</button>
      <button class="choice-btn" onclick="selectBranch('C')"><strong>[선택지 C]</strong> 놀이공원 (동생과 간 놀이공원)</button>
    `;
  }

  async function selectBranch(type) {
    controlArea.innerHTML = '';

    if (type === 'A') {
      addAiMsg('그때 몽주랑 밤산책 나가는 거 정말 좋아했었죠.');
      await addMomMsg('…몽주?', 1000);
      await addMomMsg('몽주는 네가 대학생 때 처음 데려온 아이잖아, 지훈아. 초등학생 때는 몽주가 없었어…', 1500);
    } else if (type === 'B') {
      addAiMsg('어릴 때 엄마가 자주 해주셨던 불고기 먹고 싶어요.');
      await addMomMsg('…불고기?', 1000);
      await addMomMsg('지훈이 너 어릴 때 고기 비리다고 불고기는 쳐다보지도 않았잖아~ 동생이 불고기 먹을 때 너는 된장찌개만 달라고 떼썼으면서.', 1500);
    } else if (type === 'C') {
      addAiMsg('주말마다 다 같이 놀이공원 가자고 떼썼던 거 기억나요.');
      await addMomMsg('놀이공원…?', 1000);
      await addMomMsg('네가 놀이공원 기구 타는 거 무서워해서 어릴 때도 몇 번 안 갔는데… 웬일이래?', 1500);
    }

    // 시스템 경고
    updateSuspicion(35);
    addNotice('⚠️ <strong>[시스템 경고] 위화감 발생!</strong><br>잘못된 데이터 조합으로 상대방이 이상함을 감지했습니다.<br>📈 [의심 수치 +35%]', 'alert');

    // 공통 종료 대화
    await addMomMsg('요즘 피곤해서 어릴 때 기억이랑 헷갈렸나 보다.', 1500);
    addAiMsg('…아, 요즘 정신이 없어서 착각했나 봐요. 죄송해요.');
    await addMomMsg('미안하긴 뭘~ 늦었는데 엄마가 괜히 옛날 이야기로 오래 잡고 있었네.', 1200);
    await addMomMsg('밤 깊었으니까 딴 생각 말고 얼른 자~ 밥 잘 챙겨 먹고. 사랑한다 우리 아들~', 1500);
    addAiMsg('네, 엄마도 편안한 밤 보내세요.');

    // 최종 로그
    setTimeout(() => {
      addNotice('📌 <strong>[시스템 기록 완료] 학습 완료:</strong><br>고인의 과거 데이터를 맥락에 맞지 않게 선택하여 [의심 수치]가 누적되었습니다.', 'success');
      renderResetControl();
    }, 1000);
  }

  function renderResetControl() {
    controlArea.innerHTML = `
      <div class="choice-title" style="color:var(--accent-green)">✅ 시뮬레이션 완료</div>
      <button class="reset-btn" onclick="startScenario()">🔄 다시 시도하기 (다시 시작)</button>
    `;
  }

  // ── 전역 노출: index.html의 inline onclick 핸들러에서 호출 ──
  window.selectStage1 = selectStage1;
  window.selectBranch = selectBranch;
  window.startScenario = startScenario;

  // ── 로드 시 시나리오 시작 ──
  startScenario();

})();
