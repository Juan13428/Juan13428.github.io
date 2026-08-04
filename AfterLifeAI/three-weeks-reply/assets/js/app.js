// ================================================================
// assets/js/app.js — 사후관리 AI · 0챕터: 3주만의 답장
// version: 1.0.0
// ================================================================

(function () {

  // ── 상태 변수 ──
  let suspicionLevel = 0; // 의심도 (0~100)
  let currentStep = 0;    // 현재 대화 단계 인덱스

  // ── 대화 흐름 데이터 ──
  const dialogueFlow = [
    {
      type: 'incoming_batch',
      messages: [
        "지훈아 미안해ㅠㅠ project 마무리 작업이 생각보다 너무 길어져서 이제야 폰 확인했어..",
        "진짜 정신이 없어서 연락도 못 하고.. 기다리게 해서 너무 미안해 🥺",
        "많이 기다렸지? 일은 잘 끝났어! 이번 주부터 연차 써서 푹 쉴 수 있을 것 같아."
      ],
      systemNote: "[System / AI 내부 데이터]: '윤가은' - 데이터베이스 내 미등록/관계성 불명확 인물. 대화 톤 및 서사 맥락 분석 불가.",
      choices: [
        {
          text: "1. 네, 괜찮습니다. 프로젝트 수고하셨습니다.",
          response: "네. 프로젝트 수고하셨습니다. 연락 주셔서 감사합니다.",
          suspicionDelta: 0
        },
        {
          text: "2. 누구신지 확인이 어렵습니다.",
          response: "죄송하지만, 등록된 데이터에 없어 누구신지 확인이 어렵습니다.",
          suspicionDelta: 0
        }
      ]
    },
    {
      type: 'incoming_batch',
      messages: [
        "...??",
        "뭐야 지훈아 말투 왜 그래?",
        "'네'라니? 수고하셨습니다?? 😂",
        "너 진짜 많이 화났구나...",
        "내가 아무리 바빠도 중간에 문자 하나는 남겼어야 했는데, 너 이렇게 차갑게 대하는 거 진짜 오랜만이다."
      ],
      choices: [
        {
          text: "1. 특별히 화난 것은 아닙니다.",
          response: "특별히 화난 것은 아닙니다. 질문이나 하실 말씀이 있으시면 전달 부탁드립니다.",
          suspicionDelta: 0
        },
        {
          text: "2. 별다른 뜻은 없습니다. 정해진 양식대로 답할 뿐입니다.",
          response: "별다른 뜻은 없습니다. 정해진 시스템 양식대로 응답하고 있을 뿐입니다.",
          suspicionDelta: 0
        }
      ]
    },
    {
      type: 'incoming_batch',
      messages: [
        "지훈아, 나 지금 장난치는 거 아니야...",
        "'전달 부탁드립니다'라니 너 사람 소름 돋게 왜 그래?",
        "3주 동안 연락 못 한 건 내가 정말 미안한데, 이렇게 서운한 티 내면서 남처럼 대하면 나도 좀 당황스러워.",
        "...하긴, 오랫동안 혼자 기다리게 만들었으니 네가 삐질 만도 하지.",
        "지금 말해봤자 서로 감정만 상할 것 같네. 일단 너 마음 좀 풀리면 다시 연락해. 나 나중에 다시 톡 할게."
      ],
      choices: [
        {
          text: "[상황 종료] 윤가은 메시지 수신 대기 전환 및 여동생 대화 연결 준비",
          response: null,
          suspicionDelta: 0,
          isFinalStep: true
        }
      ]
    }
  ];

  // ── DOM 렌더링 함수 ──
  function updateSuspicion(delta) {
    const suspicionFill = document.getElementById('suspicion-fill');
    const suspicionText = document.getElementById('suspicion-text');
    suspicionLevel = Math.min(100, suspicionLevel + delta);
    suspicionFill.style.width = suspicionLevel + '%';
    suspicionText.innerText = suspicionLevel + '%';

    if (suspicionLevel >= 100) {
      triggerEnding('bad');
    }
  }

  function appendMessage(text, type) {
    const chatArea = document.getElementById('chat-area');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.innerText = text;
    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function appendSystemNote(text) {
    const chatArea = document.getElementById('chat-area');
    const noteDiv = document.createElement('div');
    noteDiv.className = 'system-msg';
    noteDiv.innerText = text;
    chatArea.appendChild(noteDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  // ── 단계 진행 ──
  function renderStep() {
    if (currentStep >= dialogueFlow.length) return;

    const stepData = dialogueFlow[currentStep];

    let delay = 300;
    stepData.messages.forEach((msg, idx) => {
      setTimeout(() => {
        appendMessage(msg, 'received');

        if (idx === 0 && stepData.systemNote) {
          appendSystemNote(stepData.systemNote);
        }

        if (idx === stepData.messages.length - 1) {
          renderChoices(stepData.choices);
        }
      }, delay);
      delay += 800;
    });
  }

  function renderChoices(choices) {
    const choicesArea = document.getElementById('choices-area');
    choicesArea.innerHTML = '';
    choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerText = choice.text;
      btn.onclick = () => selectChoice(choice);
      choicesArea.appendChild(btn);
    });
  }

  function selectChoice(choice) {
    const choicesArea = document.getElementById('choices-area');
    choicesArea.innerHTML = '';

    if (choice.response) {
      appendMessage(choice.response, 'sent');
    }

    updateSuspicion(choice.suspicionDelta);

    if (suspicionLevel >= 100) return;

    if (choice.isFinalStep) {
      triggerEnding('chapter_clear');
      return;
    }

    currentStep++;
    setTimeout(() => {
      renderStep();
    }, 1000);
  }

  // ── 엔딩 처리 ──
  function triggerEnding(type) {
    const choicesArea = document.getElementById('choices-area');
    const endingOverlay = document.getElementById('ending-overlay');
    choicesArea.innerHTML = '';

    if (type === 'bad') {
      document.getElementById('ending-title').innerText = '❌ BAD ENDING: 정체 발각';
      document.getElementById('ending-title').style.color = '#ef4444';
      document.getElementById('ending-desc').innerText = '윤가은이 감정적/말투의 극심한 위화감을 감지하고 당신이 박지훈이 아님을 확실하게 의심합니다.\nAI라는 정체가 발각될 위기에 직면했습니다.';
    } else if (type === 'chapter_clear') {
      document.getElementById('ending-title').innerText = '✅ 0챕터 [3주만의 답장] 완료';
      document.getElementById('ending-title').style.color = '#10b981';
      document.getElementById('ending-desc').innerText = '윤가은은 당신의 어색한 말투를 단순한 "삐침/서운함"으로 오해한 채 대화를 종료했습니다.\n곧이어 윤가은이 여동생에게 연락을 시도하며, 여동생과의 대화 및 위장극 이벤트로 연결됩니다.';
    }
    endingOverlay.classList.add('active');
  }

  // ── 시뮬레이터 초기화 ──
  function resetGame() {
    const chatArea = document.getElementById('chat-area');
    const suspicionFill = document.getElementById('suspicion-fill');
    const suspicionText = document.getElementById('suspicion-text');
    const endingOverlay = document.getElementById('ending-overlay');

    suspicionLevel = 0;
    currentStep = 0;
    suspicionFill.style.width = '0%';
    suspicionText.innerText = '0%';
    endingOverlay.classList.remove('active');

    chatArea.innerHTML = `
      <div class="chat-divider">3주 전 대화 기록</div>
      <div class="message sent">이번 프로젝트 끝나면 일주일 정도 쉬는 거 맞지? 다 끝나고 연락줘.</div>
      <div class="chat-divider">3주 간의 공백 후 현재</div>
    `;

    renderStep();
  }

  // ── 전역 노출: index.html의 inline onclick 핸들러에서 호출 ──
  window.resetGame = resetGame;

  // ── 로드 시 대화 시작 ──
  document.addEventListener("DOMContentLoaded", () => {
    renderStep();
  });

})();
