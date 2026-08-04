// ================================================================
// assets/js/app.js — 사후관리 AI · 0챕터 [갑작스러운 중재_1] 메신저 시뮬레이터
// version: 1.0.0
// ================================================================

(function () {

  // ── 상태 변수 ──
  let state = { suspicion: 15 }; // 의심 수치 (0~100)
  let currentIdx = 0;            // 현재 대사 인덱스

  // ── 대화 스크립트 데이터 ──
  const script = [
    {
      sender: "left",
      text: "오빠 가은이 언니한테 연락 왔는데?",
      delay: 800
    },
    {
      sender: "left",
      text: "언니가 오빠 혹시 자기한테 뭐 삐친 거 있냐고 물어보잖아 ㅋㅋㅋ 답장 왜 그따구로 보냈어?",
      delay: 1000,
      choices: [
        { text: "1. 무슨 소리야?", suspicionDelta: 0 }
      ]
    },
    {
      sender: "left",
      text: "아까 언니랑 연락했다며. 말투 존나 딱딱하고 낯설어서 자기한테 화난 줄 알았대.",
      delay: 1000
    },
    {
      sender: "left",
      text: "아무리 가은이 언니가 장기 프로젝트 때문에 오랫동안 연락 끊겼었다지만, 그래도 오빠 연인이잖아. 연인 사이에 좀 잘 좀 해라.",
      delay: 1200,
      systemLog: "💡 <strong>AI 데이터 갱신:</strong> '윤가은' - 박지훈의 연인 / 최근 장기 프로젝트로 연락 두절되었음"
    },
    {
      sender: "left",
      text: "오랫동안 연락 안 돼서 오빠 서운했던 건 알겠는데, 그렇다고 그렇게 차갑게 굴 일이야? 언니도 일 때문에 어쩔 수 없었던 건데.",
      delay: 1000
    },
    {
      sender: "left",
      text: "대충 \"연락 오랫동안 안 돼서 좀 삐쳤었다, 미안하다\" 식으로 둘러대고 답장 다시 예쁘게 보내.",
      delay: 1000
    },
    {
      sender: "left",
      text: "언니 지금 오빠 변한 것 같다고 진지하게 의심하고 있으니까 분위기 잘 풀어봐. 알았지?",
      delay: 1200,
      choices: [
        { text: "2. 뭐라고 답장해야 하지?", suspicionDelta: 10 }
      ]
    },
    {
      sender: "left",
      text: "아 휴가 나와서 머리 리셋됐냐?",
      delay: 900
    },
    {
      sender: "left",
      text: "오빠 피드 옛날 거 좀 찾아보든가, 언니 계정(<span class='interactive-tag'>@gaeun_y</span>) 가서 둘이 같이 찍은 사진이나 커플 태그 같은 거 보고 분위기 맞추라고.",
      delay: 1400,
      systemLog: "🎯 <strong>튜토리얼 완료:</strong> 피드 검색 및 프로필 이동 기능 안내 받음",
      isEnd: true
    }
  ];

  // ── 의심 수치 갱신 ──
  function updateSuspicion(delta) {
    state.suspicion = Math.max(0, Math.min(100, state.suspicion + delta));
    document.getElementById('suspicion-bar').style.width = state.suspicion + '%';
    document.getElementById('suspicion-text').innerText = state.suspicion + '%';

    if (state.suspicion >= 100) {
      triggerGameOver();
    }
  }

  // ── 메시지 렌더링 ──
  function appendMessage(sender, text, systemLog) {
    const chatArea = document.getElementById('chat-area');

    if (systemLog) {
      const sysDiv = document.createElement('div');
      sysDiv.className = 'system-log';
      sysDiv.innerHTML = systemLog;
      chatArea.appendChild(sysDiv);
    }

    if (text) {
      const msgDiv = document.createElement('div');
      msgDiv.className = `message-bubble ${sender}`;
      msgDiv.innerHTML = text;
      chatArea.appendChild(msgDiv);
    }

    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function showTypingIndicator(callback) {
    const chatArea = document.getElementById('chat-area');
    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.id = 'temp-typing';
    typing.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatArea.appendChild(typing);
    chatArea.scrollTop = chatArea.scrollHeight;

    setTimeout(() => {
      const temp = document.getElementById('temp-typing');
      if (temp) temp.remove();
      callback();
    }, 600);
  }

  // ── 시나리오 진행 ──
  function stepGame() {
    if (currentIdx >= script.length) return;

    const currentMsg = script[currentIdx];

    if (currentMsg.sender === "left") {
      showTypingIndicator(() => {
        appendMessage(currentMsg.sender, currentMsg.text, currentMsg.systemLog);

        if (currentMsg.choices) {
          renderChoices(currentMsg.choices);
        } else if (currentMsg.isEnd) {
          setTimeout(triggerChapterClear, 1000);
        } else {
          currentIdx++;
          setTimeout(stepGame, currentMsg.delay || 800);
        }
      });
    }
  }

  function renderChoices(choices) {
    const choiceContainer = document.getElementById('choice-container');
    choiceContainer.innerHTML = '';

    choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `<span>${choice.text}</span> <span style="font-size:11px; color:var(--accent-cyan);">전송 💬</span>`;
      btn.onclick = () => {
        choiceContainer.innerHTML = '<div class="bottom-status-msg">상대방이 메시지를 입력 중입니다...</div>';
        appendMessage('right', choice.text);
        updateSuspicion(choice.suspicionDelta);
        currentIdx++;
        setTimeout(stepGame, 600);
      };
      choiceContainer.appendChild(btn);
    });
  }

  // ── 엔딩 처리 ──
  function triggerGameOver() {
    const chatArea = document.getElementById('chat-area');
    const card = document.createElement('div');
    card.className = 'chat-result-card gameover';
    card.innerHTML = `
      <div class="result-title">🚨 GAME OVER - 정체 발각</div>
      <div class="result-desc">의심 수치가 100%에 도달했습니다. 어색한 반응으로 인해 정체가 발각되었습니다.</div>
      <button class="inline-restart-btn" onclick="resetGame()">🔄 시뮬레이터 다시 시작</button>
    `;
    chatArea.appendChild(card);
    chatArea.scrollTop = chatArea.scrollHeight;

    document.getElementById('choice-container').innerHTML = `<div class="bottom-status-msg">대화가 종료되었습니다. 상단 또는 위의 [다시 시작] 버튼을 누르세요.</div>`;
  }

  function triggerChapterClear() {
    const chatArea = document.getElementById('chat-area');
    const card = document.createElement('div');
    card.className = 'chat-result-card';
    card.innerHTML = `
      <div class="result-title">🎉 CHAPTER 0 CLEARED</div>
      <div class="result-desc">지원의 조언으로 윤가은의 의심을 모면할 구실("서운해서 삐침")을 마련했습니다.</div>
      <button class="inline-restart-btn" onclick="resetGame()">🔄 시뮬레이터 다시 시작</button>
    `;
    chatArea.appendChild(card);
    chatArea.scrollTop = chatArea.scrollHeight;

    document.getElementById('choice-container').innerHTML = `<div class="bottom-status-msg">대화가 종료되었습니다. 상단 또는 위의 [다시 시작] 버튼을 누르세요.</div>`;
  }

  // ── 시뮬레이터 초기화 ──
  function resetGame() {
    location.reload();
  }

  // ── 전역 노출: index.html의 inline onclick 핸들러에서 호출 ──
  window.resetGame = resetGame;

  // ── 로드 시 대화 시작 ──
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(stepGame, 300);
  });

})();
