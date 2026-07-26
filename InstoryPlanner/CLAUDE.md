# Instory Planner — Claude 규칙

사후관리 AI 프로젝트용 SNS 피드 기획 툴.
프로필·게시글·댓글·해시태그를 저작하고, 단서 탐색 경로를 검증하고, 인스타그램 UI로 플레이테스트한다.

배포 URL: https://juan13428.github.io/InstoryPlanner/index.html

## 폴더 구조

```
InstoryPlanner/
├── CLAUDE.md                   ← Claude 규칙 파일 (이 파일)
├── index.html                  ← 진입점 HTML (마크업 전용)
├── assets/
│   ├── css/
│   │   └── style.css           ← 스타일 전용 (인스타그램 라이트 팔레트)
│   └── js/
│       ├── state.js            ← 전역 상태 · 공용 유틸 · 데이터 로드
│       ├── clue-highlight.js   ← 드래그 단서 판정 · 형광펜 · 인라인 태그 렌더
│       ├── view-profiles.js    ← 프로필 탭
│       ├── view-posts.js       ← 게시글 탭 (저작 UI · 단서 편집)
│       ├── view-objectives.js  ← 목표 탭 (목표 작성 · 단서 배정)
│       ├── view-analysis.js    ← 경로 분석 탭 (홉 맵 · 커버리지 · 검증)
│       ├── view-preview.js     ← 플레이 미리보기 탭 (인스타그램 UI)
│       ├── io.js               ← JSON 저장·불러오기 / 엑셀 내보내기
│       ├── keyboard.js         ← 미리보기 키보드 단축키 (A/D/W/S)
│       └── app.js              ← 진입점: App 액션 객체 · render() · 초기화
├── data/
│   ├── default-data.json       ← 초기 로드되는 기획 데이터 (여기를 수정한다)
│   └── default-data.js         ← ⚠ 자동 생성. file:// 실행용 폴백
├── scripts/
│   ├── server.ps1              ← 로컬 개발 서버
│   ├── sync-fallback.mjs       ← default-data.json → .js 재생성
│   └── smoke-test.mjs          ← 헤드리스 스모크 테스트 (jsdom)
└── archive/
    ├── single-file-v3.html         ← 분리 전 단일 파일 원본
    └── text-highlight-prototype.html ← 드래그 하이라이트 참고 원본
```

## 주요 기능

- **게시글 저작**: 본문·이미지 설명·좋아요·해시태그·댓글 편집, 복제/삭제, 작성자·단서 필터
- **인라인 해시태그**: 본문과 댓글에 `#태그`를 직접 쓰면 자동 인식되어 탐색 그래프에 반영
- **단서 마킹**: 게시글 본문 속 문장을 단서로 등록 (id·문구·메모)
- **목표(Objective)**: 기획자가 직접 작성. 클리어에 필요한 단서를 배정하고 순서를 정한다
- **목표 기반 잠금**: 단서는 **활성 목표에 속할 때만** 드래그로 찾을 수 있다
- **드래그 하이라이트**: 본문을 드래그해 단서 문구와 겹치면 형광펜으로 표시
- **목표 HUD**: 미리보기 상단에 현재 목표·설명·진행도가 항상 고정 표시
- **키보드 조작**: 미리보기에서 `A` 뒤로 · `D` 앞으로 · `W` 맨 위 · `S` 맨 아래
- **경로 분석**: 시작 게시글 기준 홉(BFS 최단거리) 자동 계산, 이벤트별 커버리지, 검증 경고
- **플레이 미리보기**: 인스타그램 UI 피드, 태그 이동 카운트, 방문 태그 회색 처리, 기획자 뷰 토글
- **입출력**: JSON 저장·불러오기, 엑셀 4시트(프로필·게시글·댓글·해시태그) 내보내기

## 코딩 규칙

### 0. 변경 후 반드시 실행할 것
```bash
node scripts/sync-fallback.mjs     # 기본 데이터를 고쳤다면
node scripts/smoke-test.mjs        # 항상 (npm i -D jsdom 필요)
```
`smoke-test.mjs`는 index.html의 `<script>` 순서를 그대로 읽어 앱을 띄운다.
새 JS 파일을 만들고 index.html 등록을 빠뜨리면 여기서 잡힌다.

### 1. 파일 분리
- HTML, CSS, JavaScript는 **반드시 별도 파일**로 유지한다. 인라인 `<style>`/`<script>` 금지.
- JS는 기능 단위로 분리한다. 새 탭을 추가하면 `view-*.js`를 새로 만들고 `index.html`에 로드한다.
- **로드 순서를 지킨다**: `state.js → clue-highlight.js → view-*.js → io.js → keyboard.js → app.js`.
  뒤 파일이 앞 파일의 전역 함수를 사용하므로 순서를 바꾸지 않는다.
- 기본 데이터는 **`data/default-data.json`만** 수정하고, `node scripts/sync-fallback.mjs`를 실행한다.
  `data/default-data.js`는 자동 생성물이므로 직접 편집하지 말 것 (`file://` 실행용 폴백).

### 2. 데이터 스키마 (JSON 저장/불러오기 공용)
```json
{
  "profiles": [{
    "id": "p_*", "handle": "", "name": "", "relationship": "",
    "bio": "", "followers": 0, "following": 0, "color": "#rrggbb"
  }],
  "posts": [{
    "id": "post_*", "authorId": "p_*", "date": "YYYY-MM-DD",
    "content": "", "imageDesc": "", "hashtags": [""], "likes": 0,
    "isClue": false, "clueEvent": "C1", "clueNote": "",
    "clues": [{ "id": "clue_*", "phrase": "본문 속 문장", "note": "무엇을 알게 되는가" }],
    "comments": [{
      "id": "c_*", "author": "핸들", "text": "", "likes": 0,
      "clues": [{ "id": "clue_*", "phrase": "댓글 속 문장", "note": "" }]
    }]
  }],
  "objectives": [{
    "id": "obj_*", "title": "", "desc": "", "event": "C1",
    "clueIds": ["clue_*"]
  }],
  "activeObjectiveId": "obj_*",
  "startPostId": "post_*"
}
```
- `clues[].phrase`는 **본문에 실제로 존재하는 문자열**이어야 한다. 없으면 드래그로 찾을 수 없고,
  경로 분석 탭이 ⛔ 경고를 띄운다.
- **한 단서는 최대 하나의 목표에만 속한다.** 어느 쪽에서 배정하든(`App.assignClueTo` /
  `App.assignClue`) 다른 목표에서 자동으로 해제된다. 이 불변식을 깨지 말 것.
- `objectives` 배열 **순서 = 진행 순서**. `nextOpenObjective()`가 이 순서로 다음 목표를 찾는다.
- `applyData()`가 마이그레이션과 정합화를 담당한다:
  구버전 `cluePhrases: string[]` → `clues[]` 변환, 유령 `clueIds` 참조 제거,
  중복 소속 정리, 누락 필드 기본값 채움.

### 2-0. 단서 호스트 — 본문과 댓글
단서는 **게시글 본문과 댓글 양쪽**에 붙는다. 둘을 갈라서 다루지 말 것.
- `clueHosts(post)` → `[본문 호스트, ...댓글 호스트]`. 각 호스트는 `{kind, id, text, clues}`.
  `kind`는 `"content"` 또는 `"comment"`, `id`는 본문이면 빈 문자열, 댓글이면 댓글 id.
- `hostOf(postId, commentId)`로 조회한다. `allClues()` / `clueById()`는 `host`를 함께 돌려준다.
- 미리보기에서 판정 대상 텍스트는 `.clue-text[data-post][data-comment]` 하나로 통일했다.
  `bodiesInRange()`가 이 클래스를 찾으므로, 새 텍스트에 단서를 붙이려면
  `clueTextSpan(post, host)`으로 렌더하기만 하면 된다.
- 새 검증·집계를 추가할 때 `post.clues`만 훑으면 댓글 단서가 누락된다.
  `allClues()` 또는 `clueHosts(p).flatMap(h => h.clues)`를 쓸 것.
- 댓글 작성자 핸들이 프로필과 일치하면(`profByHandle`) 눌러서 프로필로 이동한다.
  일치하는 프로필이 없으면 링크로 만들지 않는다.

### 2-1. 목표 잠금 규칙 (핵심 게임 규칙)
- `isClueUnlocked(clueId)` — 활성 목표(`P.activeObjectiveId`)의 `clueIds`에 있어야 `true`.
- 잠긴 단서를 드래그하면 **아무 반응도 하지 않는다** (오답과 동일하게 처리).
- 목표의 단서를 전부 찾으면 `advanceObjectiveIfCleared()`가 완료를 기록하고,
  `P.autoAdvance`가 켜져 있으면 다음 미완료 목표로 전환한다.
- 어떤 목표에도 배정되지 않은 단서는 **영영 잠긴다**. 분석 탭이 ⛔ 오류로 잡는다.

### 3. 렌더링 구조
- `render()`(app.js)가 현재 탭 전체를 다시 그린다. 상태 변경 후에는 `render()` 호출이 원칙.
- **스크롤 보존이 기본값**: `render()`는 `.phone-feed`의 스크롤 위치를 유지한다.
  댓글 열기/접기, 단서 발견, 기획자 뷰 토글은 제자리 갱신이어야 하므로 그대로 두면 된다.
  화면이 바뀌는 동작(탭 전환, 태그 이동, 프로필 진입, 뒤로가기, 리셋)에서만
  `requestFeedScrollReset()`을 먼저 호출한다.
- 사용자 입력값은 `onchange`로 받는다. `oninput`을 쓰면 매 타자마다 `render()`가 돌아
  포커스가 끊기므로 주의.
- 사용자 입력 문자열은 **반드시 `esc()`** 를 거쳐 삽입한다.

### 2-2. 출력 이스케이프 — 빠뜨리면 임의 코드 실행
템플릿 문자열로 HTML을 만들기 때문에 삽입 위치에 맞는 함수를 써야 한다.

| 위치 | 함수 | 예 |
|---|---|---|
| 텍스트·속성값 | `esc()` | `<span>${esc(v)}</span>` |
| 인라인 핸들러의 JS 문자열 | `escJs()` | `onclick="App.f('${escJs(v)}')"` |

`esc()`는 작은따옴표를 처리하지 않는다. 인라인 핸들러에 `esc()`를 쓰면
값에 `'`가 들어올 때 문자열을 탈출해 임의 코드가 실행된다.
**해시태그 입력값과 import한 JSON의 id가 실제로 이 경로를 탄다** — 생성된 id라고 방심하지 말 것.
`scripts/smoke-test.mjs`의 "보안" 그룹이 이를 검사한다.

### 3-1. 상태 분리
- `S` = 저장되는 기획 데이터 (profiles / posts / objectives / startPostId / activeObjectiveId)
- `U` = 편집 UI 상태 (열린 탭, 펼친 게시글, 필터) — 저장하지 않음
- `P` = 플레이 미리보기 상태 (활성 목표, 발견 단서, 방문 태그, 이동 기록) — 저장하지 않음
- `S.activeObjectiveId`는 **플레이 시작 시 활성화될 목표**(기획 값),
  `P.activeObjectiveId`는 **지금 진행 중인 목표**(런타임 값). 둘을 혼동하지 말 것.
- `resetPlayState()`가 `P`를 초기화하며 `S.activeObjectiveId`를 다시 읽어온다.

### 3-2. 화면 이동 스택 (미리보기)
- `P.history` = 뒤로 갈 화면, `P.forward` = 앞으로 갈 화면. 브라우저와 같은 규칙:
  - `pvGo()` (태그·프로필 진입) → history에 push하고 **forward는 비운다**
  - `pvBack()` (A) → 현재 화면을 forward에 push
  - `pvForward()` (D) → 현재 화면을 history에 push
- **뒤로/앞으로는 `P.tagJumps`를 증가시키지 않는다.** 이동 횟수는 새로운 탐색의 지표이지
  되짚어 가기의 지표가 아니다. 이 규칙을 바꾸면 홉 설계 검증이 오염된다.

### 3-2-1. 드래그 판정 범위 (clue-highlight.js) — 되돌리지 말 것
- 선택 범위가 `.fp-body` 안에 **포함**되는지 보면 안 된다.
  `commonAncestorContainer` + `closest()` 방식은 선택이 본문 밖으로 한 글자만 벗어나도
  부모(`.fp-caption`, `article`)를 가리켜 `null`이 되고 판정이 통째로 건너뛰어진다.
  특히 **본문 맨 앞 단서**는 굵은 사용자명 바로 옆에서 시작하므로 거의 항상 여기에 걸렸다.
- 대신 `bodiesInRange()`로 **교차**하는 본문을 찾고, `clampSelection()`으로 본문 경계에
  맞춰 잘라서 오프셋을 계산한다.
- `getCharOffset()`은 **Range로 길이를 재야 한다.** 텍스트 노드만 훑는 TreeWalker 방식은
  경계 컨테이너가 **요소 노드**일 때(브라우저가 자주 그렇게 준다) 일치하는 노드를 못 찾아
  전체 길이를 반환한다. 특히 첫 단서가 하이라이트 span으로 바뀐 뒤 그 뒤에서 시작하는 선택은
  `(fp-body, 1)` 같은 요소 경계가 되며, 이 때문에 **한 게시글의 두 번째 단서가 영영 안 잡혔다.**
  `smoke-test.mjs`의 "선택 경계 형태" 그룹이 8가지 경계 조합을 검사한다.
- 여러 게시글에 걸친 선택은 무시한다(`bodies.length !== 1`) — 전체 선택 치트 방지.
- **선택과 겹치는 활성 단서는 전부 수집한다.** 하나만 잡고 끝내지 말 것 —
  단서 2개를 한 번에 드래그하면 둘 다 수집되어야 한다.
- `CLUE_SELECTION_SLACK`(state.js, 기본 40)은 **'단서가 아닌 부분'의 허용 길이**다.
  `선택 길이 − 겹친 단서 길이 합 > SLACK`이면 과대선택으로 보고 거부한다.
  선택 길이를 단서 *하나*와 비교하면 안 된다 — 해시태그가 함께 잡히거나
  단서를 여러 개 걸치는 순간 전부 거부되어 "수집이 안 된다"가 된다. (v1.4.0에서 고친 문제)
  이 규칙이면 짧은 게시글은 캡션 전체를 긁어도 통과한다. 의도된 완화다.
  막는 대상은 (a) 긴 본문을 통째로 긁기, (b) 여러 게시글에 걸친 선택 두 가지다.
- 과대선택으로 거부할 때는 `noteHint()`로 기획자 뷰에 이유를 띄운다.
  조용히 실패하면 원인을 찾을 수 없다.
- `App.pvGoTag()`는 선택이 남아 있으면 무시한다. 본문을 드래그하다 해시태그 위에서
  손을 떼면 브라우저가 click도 쏘는데, 그때 태그 페이지로 튀면
  단서를 수집하고도 화면이 바뀌어 실패로 보인다.

### 3-3. 키보드 단축키 (keyboard.js)
- **`event.code`로 판정한다.** `event.key`를 쓰면 한글 IME가 켜져 있을 때 'ㅁ'/'ㅇ'가 들어와
  동작하지 않는다. `code`는 물리 키 위치라 자판 배열·IME와 무관하다. 이 부분을 바꾸지 말 것.
- 가로채지 않는 경우: 미리보기 탭이 아닐 때 / input·textarea·select·contentEditable 포커스 /
  Ctrl·Alt·Meta 조합 / IME 조합 중(`isComposing`).
- 새 단축키는 `PREVIEW_KEYS` 맵에 `KeyX: () => App.xxx()` 형태로만 추가한다.
- `W`/`S`는 `scrollFeedTo()`로 `.phone-feed`만 직접 움직인다 — **`render()`를 호출하지 않는다.**
  재렌더하면 스크롤이 되감기고 애니메이션이 끊긴다.

### 4. 탐색 그래프
- 게시글의 유효 태그 = `hashtags` 필드 + 본문 인라인 태그 + 댓글 인라인 태그 (`effTags()`).
- 같은 태그를 가진 게시글끼리 연결하고, `startPostId`에서 BFS로 최단 홉을 구한다(`computeHops()`).
- 태그 인식 패턴은 `TAG_RE` (영문·숫자·밑줄·한글). 패턴을 바꾸면 저작·미리보기·분석에 모두 영향.

### 5. 주석
- CSS: `/* ── 섹션명 ── */`, JS: `/* ── 섹션명 ── */` 형식의 기능 단위 주석.

### 6. 네이밍
- CSS 클래스: `kebab-case` (예: `feed-post`, `clue-highlight`)
- JS 변수·함수: `camelCase` (예: `effTags`, `renderPreview`)
- 데이터 속성: `data-*` 접두사 유지 (예: `data-post`)
- 전역 상태 객체: `S`(기획 데이터) / `U`(UI 상태) / `P`(플레이 미리보기 상태)

### 7. 버전 관리
- 파일 상단 버전 주석 (`MAJOR.MINOR.PATCH`).
- 업데이트 시 `index.html`, `style.css`, `state.js`의 `APP_VERSION`, 변경한 JS 파일의 버전을 함께 갱신한다.

### 8. 저장소 제약
- localStorage/sessionStorage 사용 금지 (인메모리 상태 + JSON 파일 저장으로 대체).
- 외부 의존성은 CDN 링크를 `index.html` `<head>`에서 로드한다 (현재: SheetJS).
- 원본·레퍼런스 파일은 `archive/`에 보존하고 수정하지 않는다.

## 검증 도구

경로 분석 탭이 다음을 자동으로 잡는다.

| 등급 | 조건 |
|---|---|
| ⛔ | 단서 문구가 본문에 없음 (드래그 불가) |
| ⛔ | 단서가 어떤 목표에도 배정되지 않음 (영영 잠김) |
| ⛔ | 목표의 단서가 시작 게시글에서 도달 불가 (클리어 불가) |
| ⛔ | 목표가 하나도 없음 |
| ⛔ | 단서 게시글이 시작점에서 도달 불가 |
| ⚠ | 목표에 배정된 단서가 없음 (즉시 완료 처리) |
| ⚠ | 게시글 1개에만 달린 해시태그 (이동 경로로 기능 못 함) |
| ⚠ | 해시태그가 없어 그래프에서 고립된 게시글 |

## 로컬 실행

`data/default-data.json`을 `fetch`로 읽으므로 HTTP 서버로 여는 것을 권장한다.

```powershell
.\scripts\server.ps1          # http://localhost:3000
```

`file://`로 직접 열면 `data/default-data.js`(폴백)가 쓰인다.
JSON을 고친 뒤 `node scripts/sync-fallback.mjs`를 돌리지 않으면 폴백이 옛 데이터로 남는다.
