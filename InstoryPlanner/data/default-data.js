/* ══════════════════════════════════════════════
   Instory Planner — data/default-data.js
   ⚠ 자동 생성 파일 — 직접 수정하지 마세요.

   기본 데이터는 data/default-data.json에서 수정하고,
   아래 명령으로 이 파일을 다시 만드세요.

     node scripts/sync-fallback.mjs

   이 파일은 index.html을 file://로 직접 열었을 때(fetch 불가)
   쓰이는 폴백입니다. HTTP로 열면 .json 쪽이 우선합니다.
   ══════════════════════════════════════════════ */

const FALLBACK_DATA = {
  "profiles": [
    {
      "id": "p_jihoon",
      "handle": "jihoon_p",
      "name": "박지훈",
      "relationship": "고인 (플레이어=AI)",
      "bio": "그냥, 기록.",
      "followers": 214,
      "following": 180,
      "color": "#0095f6"
    },
    {
      "id": "p_jiwon",
      "handle": "jiwon.p_",
      "name": "박지원",
      "relationship": "여동생 (18)",
      "bio": "고3 | 합격기원 🙏",
      "followers": 342,
      "following": 501,
      "color": "#c77400"
    },
    {
      "id": "p_gaeun",
      "handle": "ga.eun__",
      "name": "윤가은",
      "relationship": "친구",
      "bio": "필름 속에서 살기 📷",
      "followers": 1204,
      "following": 322,
      "color": "#ed4956"
    },
    {
      "id": "p_mother",
      "handle": "sunhwa_kim",
      "name": "어머니",
      "relationship": "어머니",
      "bio": "가족이 전부",
      "followers": 58,
      "following": 120,
      "color": "#1e9e57"
    }
  ],
  "posts": [
    {
      "id": "post_start",
      "authorId": "p_jihoon",
      "date": "2025-11-02",
      "content": "오랜만에 셋이서. 이 날씨, 이 골목. 다시 오긴 어렵겠지.",
      "imageDesc": "해질녘 골목, 세 명의 그림자",
      "hashtags": [
        "골목산책",
        "필름사진"
      ],
      "likes": 43,
      "isClue": true,
      "clueEvent": "C1",
      "clueNote": "시작 게시글. C1 대화의 앵커.",
      "clues": [
        {
          "id": "clue_last_day",
          "phrase": "다시 오긴 어렵겠지",
          "note": "이미 끝을 예감하고 있었다"
        }
      ],
      "comments": [
        {
          "id": "c_start_1",
          "author": "ga.eun__",
          "text": "이 사진 내가 찍은 거 잊지 마라",
          "likes": 5
        },
        {
          "id": "c_start_2",
          "author": "jiwon.p_",
          "text": "오빠 나만 빼고 갔네?",
          "likes": 2
        }
      ]
    },
    {
      "id": "post_g1",
      "authorId": "p_gaeun",
      "date": "2025-11-03",
      "content": "현상 맡긴 필름 찾아옴. 잘 나온 건 몇 장 없지만 #그날의빛 은 담겼다.",
      "imageDesc": "필름 스캔 4분할 컷",
      "hashtags": [
        "필름사진",
        "현상소"
      ],
      "likes": 87,
      "isClue": true,
      "clueEvent": "C1",
      "clueNote": "가은 계정 진입 지점. 홉 1.",
      "clues": [
        {
          "id": "clue_few_frames",
          "phrase": "잘 나온 건 몇 장 없지만",
          "note": "찍은 장수에 비해 남은 게 적다"
        }
      ],
      "comments": [
        {
          "id": "c_g1_1",
          "author": "jihoon_p",
          "text": "마지막 장, 나 눈 감았지 #흑역사",
          "likes": 9
        }
      ]
    },
    {
      "id": "post_j1",
      "authorId": "p_jiwon",
      "date": "2025-11-05",
      "content": "오빠가 알려준 골목. 혼자 와보니까 훨씬 길다. 새벽에 오면 왜 좋은지 알겠어.",
      "imageDesc": "새벽 골목, 가로등 하나",
      "hashtags": [
        "골목산책",
        "새벽"
      ],
      "likes": 61,
      "isClue": true,
      "clueEvent": "C2",
      "clueNote": "지원이 오빠의 동선을 따라가고 있다.",
      "clues": [
        {
          "id": "clue_alone_walk",
          "phrase": "혼자 와보니까 훨씬 길다",
          "note": "지원이 이미 혼자 다녀왔다"
        },
        {
          "id": "clue_dawn_habit",
          "phrase": "새벽에 오면 왜 좋은지 알겠어",
          "note": "새벽 시간대가 반복 키워드"
        }
      ],
      "comments": [
        {
          "id": "c_j1_1",
          "author": "ga.eun__",
          "text": "너 혼자 다니지 마. 그날도 오빠 혼자였어 #새벽",
          "likes": 12,
          "clues": [
            {
              "id": "clue_alone_that_day",
              "phrase": "그날도 오빠 혼자였어",
              "note": "가은은 그날 지훈이 혼자였다는 걸 알고 있다"
            }
          ]
        }
      ]
    },
    {
      "id": "post_g2",
      "authorId": "p_gaeun",
      "date": "2025-11-08",
      "content": "안 올릴 사진이 하나 있다. 지훈이가 지워달라고 했으니까 그냥 갖고만 있을게.",
      "imageDesc": "현상소 봉투, 사진 한 장이 뒤집혀 있음",
      "hashtags": [
        "현상소",
        "새벽"
      ],
      "likes": 34,
      "isClue": true,
      "clueEvent": "C3",
      "clueNote": "가은이 숨기고 있는 사진. C3 분기 트리거.",
      "clues": [
        {
          "id": "clue_hidden_photo",
          "phrase": "안 올릴 사진이 하나 있다",
          "note": "공개하지 않은 사진의 존재"
        },
        {
          "id": "clue_asked_delete",
          "phrase": "지훈이가 지워달라고 했으니까",
          "note": "지훈 본인이 삭제를 요청했다"
        }
      ],
      "comments": [
        {
          "id": "c_g2_1",
          "author": "sunhwa_kim",
          "text": "가은아 언제 한번 집에 와. 지훈이 방 아직 그대로야",
          "likes": 3,
          "clues": [
            {
              "id": "clue_room_intact",
              "phrase": "지훈이 방 아직 그대로야",
              "note": "어머니가 방을 정리하지 못하고 있다"
            }
          ]
        }
      ]
    },
    {
      "id": "post_m1",
      "authorId": "p_mother",
      "date": "2025-11-11",
      "content": "요즘도 새벽에 눈이 떠진다. 그 애 방 불이 켜져 있는 것 같아서.",
      "imageDesc": "새벽 거실, 복도 끝 방문",
      "hashtags": [
        "새벽",
        "기일"
      ],
      "likes": 18,
      "isClue": true,
      "clueEvent": "C4",
      "clueNote": "어머니의 수면 패턴. 새벽 키워드 수렴점.",
      "clues": [
        {
          "id": "clue_mother_dawn",
          "phrase": "그 애 방 불이 켜져 있는 것 같아서",
          "note": "지훈의 방이 아직 정리되지 않았다"
        }
      ],
      "comments": []
    }
  ],
  "objectives": [
    {
      "id": "obj_last_day",
      "title": "지훈의 마지막 하루를 재구성하라",
      "desc": "골목에서 찍힌 사진과 필름에 남은 흔적으로 그날의 시간대를 좁힌다.",
      "event": "C1",
      "clueIds": [
        "clue_last_day",
        "clue_few_frames"
      ]
    },
    {
      "id": "obj_dawn",
      "title": "'새벽'이라는 단어를 쫓아라",
      "desc": "세 사람이 각자 다른 맥락에서 새벽을 말하고 있다. 공통점을 찾는다.",
      "event": "C2",
      "clueIds": [
        "clue_alone_walk",
        "clue_dawn_habit",
        "clue_mother_dawn",
        "clue_alone_that_day"
      ]
    },
    {
      "id": "obj_hidden",
      "title": "가은이 올리지 않은 사진",
      "desc": "가은의 계정에서 삭제 요청의 흔적을 찾아낸다.",
      "event": "C3",
      "clueIds": [
        "clue_hidden_photo",
        "clue_asked_delete",
        "clue_room_intact"
      ]
    }
  ],
  "activeObjectiveId": "obj_last_day",
  "startPostId": "post_start"
};
