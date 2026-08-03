// ================================================================
// assets/js/app.js — 사후관리 AI · Ch.0 튜토리얼 시뮬레이터
// version: 1.0.0
// ================================================================

(function () {

  // ── 상태 변수 ──
  let step = 1;             // 현재 튜토리얼 진행 단계
  let selectedClue = null;  // 선택된 단서 텍스트

  // ── 탭 전환 ──
  function switchTab(tabName) {
    document.querySelectorAll('.tab-screen').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

    document.getElementById('tab-' + tabName).classList.add('active');
    document.getElementById('nav-' + tabName).classList.add('active');

    if (tabName === 'feed' && step === 1) {
      document.getElementById('feed-badge').style.display = 'none';
    }
  }

  // ── 피드 좋아요 버튼 처리 ──
  function handleLike() {
    if (step === 1) {
      const btn = document.getElementById('like-btn');
      btn.classList.add('liked');
      document.getElementById('like-heart').innerText = '❤️';
      document.getElementById('like-count').innerText = '13';

      step = 2;
      updateHUD('STEP 2: 답장 전송', '좋아요를 눌렀습니다. 메신저 탭으로 복귀하여 답장을 전송하세요.');

      const actionBtn = document.getElementById('action-btn');
      actionBtn.disabled = false;
      actionBtn.innerText = '메신저에 "누름" 답장 전송';
    }
  }

  // ── 텍스트 드래그(선택) 이벤트: 북마크 쿠폰 코드 수집 ──
  document.addEventListener('mouseup', () => {
    const selection = window.getSelection().toString().trim();
    if (selection === 'GAME-2026-HERO' && step === 3) {
      addClue('쿠폰 코드: GAME-2026-HERO');
      step = 4;
      updateHUD('STEP 4: 쿠폰 코드 전달', '수집된 단서를 클릭하여 조합한 후 메신저로 답장을 전송하세요.');
    }
  });

  // ── 단서함에 단서 추가 ──
  function addClue(text) {
    const clueList = document.getElementById('clue-list');
    document.getElementById('empty-clue-msg').style.display = 'none';

    const clueItem = document.createElement('div');
    clueItem.className = 'clue-item';
    clueItem.innerHTML = `<span>🔑 ${text}</span> <span>[선택]</span>`;
    clueItem.onclick = () => selectClue(clueItem, text);
    clueList.appendChild(clueItem);
  }

  // ── 단서 선택 ──
  function selectClue(element, text) {
    document.querySelectorAll('.clue-item').forEach(el => el.style.borderColor = 'var(--accent-cyan)');
    element.style.borderColor = '#f43f5e';
    selectedClue = text;

    const actionBtn = document.getElementById('action-btn');
    actionBtn.disabled = false;
    actionBtn.innerText = '선택한 단서로 답장 전송';
  }

  // ── 액션 버튼 처리 (단계별 분기) ──
  function handleAction() {
    if (step === 2) {
      // 2단계: 좋아요 완료 -> "누름" 전송
      switchTab('chat');
      appendMsg('ai', '누름');

      setTimeout(() => {
        appendMsg('sister', '역시 울 오빠 최고~ ㅋㅋㅋ<br>아 맞다!! 오빠, 이번 게임 이벤트 쿠폰 코드 뭐였지??');
        appendMsg('sister', '아 미친!! 지금 픽창 넘어가서 게임 잡힘 😱<br>나 화면 못 나가니까 빨리 복붙좀 해줘!!');

        step = 3;
        updateHUD('STEP 3: 북마크 단서 탐색', '여동생이 쿠폰 코드를 요청했습니다. [북마크] 탭에서 코드를 마우스로 드래그하여 수집하세요.');
        document.getElementById('action-btn').disabled = true;
        document.getElementById('action-btn').innerText = '단서를 드래그하여 수집하세요';
      }, 800);

    } else if (step === 4 && selectedClue) {
      // 4단계: 쿠폰 코드 전송
      switchTab('chat');
      appendMsg('ai', '이번 쿠폰 코드는 GAME-2026-HERO 야');

      setTimeout(() => {
        appendMsg('sister', '나이스ㅋㅋㅋ 고마워! 복붙 완료!! 🎮');
        appendMsg('sister', '근데 오빠... 오늘따라 답장이 약간 기계처럼 딱딱하다? 뭐 하느라 영혼이 없어? ㅋㅋㅋ');
      }, 800);

      setTimeout(() => {
        appendMsg('sister', '아 맞다, 요즘 인터넷 보니까 프로필 보관함에 유서 미리 써두는 게 유행이라며?<br>오빠도 예전에 나랑 약속했던 거 기억나지? 보관함에 써뒀을 텐데... 나중에 생각나면 한번 찾아봐.');
        appendMsg('msg-system', '📌 데이터 기록: 프로필 보관함 내 [유서] 단서 감지');

        step = 5;
        updateHUD('CHAPTER 0 COMPLETE', '튜토리얼이 완료되었습니다. 사후관리 AI 시스템 기본 가동 준비 완료.');
        document.getElementById('action-btn').disabled = true;
        document.getElementById('action-btn').innerText = '튜토리얼 완료';
      }, 2000);
    }
  }

  // ── 채팅 메시지 추가 ──
  function appendMsg(type, text) {
    const chatBox = document.getElementById('chat-box');
    const msg = document.createElement('div');
    if (type === 'msg-system') {
      msg.className = 'msg-system';
    } else {
      msg.className = `msg ${type}`;
    }
    msg.innerHTML = text;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // ── HUD 퀘스트 안내 갱신 ──
  function updateHUD(title, desc) {
    document.getElementById('quest-step').innerText = title;
    document.getElementById('quest-desc').innerText = desc;
  }

  // ── 전역 노출: index.html의 inline onclick 핸들러에서 호출 ──
  window.switchTab = switchTab;
  window.handleLike = handleLike;
  window.handleAction = handleAction;

})();
