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
│       ├── view-posts.js       ← 게시글 탭 (저작 UI)
│       ├── view-analysis.js    ← 경로 분석 탭 (홉 맵 · 커버리지 · 검증)
│       ├── view-preview.js     ← 플레이 미리보기 탭 (인스타그램 UI)
│       ├── io.js               ← JSON 저장·불러오기 / 엑셀 내보내기
│       └── app.js              ← 진입점: App 액션 객체 · render() · 초기화
├── data/
│   └── default-data.json       ← 초기 로드되는 기획 데이터
├── scripts/
│   └── server.ps1              ← 로컬 개발 서버
└── archive/
    ├── single-file-v3.html         ← 분리 전 단일 파일 원본
    └── text-highlight-prototype.html ← 드래그 하이라이트 참고 원본
```

## 주요 기능

- **게시글 저작**: 본문·이미지 설명·좋아요·해시태그·댓글 편집, 복제/삭제, 작성자·단서 필터
- **인라인 해시태그**: 본문과 댓글에 `#태그`를 직접 쓰면 자동 인식되어 탐색 그래프에 반영
- **단서 마킹**: 게시글을 C1–C5 대화 이벤트에 연결하고 "단서 문구"를 지정
- **드래그 하이라이트**: 미리보기에서 본문을 드래그해 단서 문구와 겹치면 형광펜으로 표시
- **경로 분석**: 시작 게시글 기준 홉(BFS 최단거리) 자동 계산, 이벤트별 커버리지, 검증 경고
- **플레이 미리보기**: 인스타그램 UI 피드, 태그 이동 카운트, 방문 태그 회색 처리, 기획자 뷰 토글
- **입출력**: JSON 저장·불러오기, 엑셀 4시트(프로필·게시글·댓글·해시태그) 내보내기

## 코딩 규칙

### 1. 파일 분리
- HTML, CSS, JavaScript는 **반드시 별도 파일**로 유지한다. 인라인 `<style>`/`<script>` 금지.
- JS는 기능 단위로 분리한다. 새 탭을 추가하면 `view-*.js`를 새로 만들고 `index.html`에 로드한다.
- **로드 순서를 지킨다**: `state.js → clue-highlight.js → view-*.js → io.js → app.js`.
  뒤 파일이 앞 파일의 전역 함수를 사용하므로 순서를 바꾸지 않는다.
- 기본 데이터 변경은 `data/default-data.json`만 수정하면 된다.
- `state.js`의 `FALLBACK_DATA`는 `file://` 직접 실행용 폴백 — JSON을 바꾸면 함께 갱신한다.

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
    "cluePhrases": [""],
    "comments": [{ "id": "c_*", "author": "", "text": "", "likes": 0 }]
  }],
  "startPostId": "post_*"
}
```
- `cluePhrases`는 **본문에 실제로 존재하는 문자열**이어야 한다. 없으면 드래그로 찾을 수 없고,
  경로 분석 탭이 ⛔ 경고를 띄운다.
- `applyData()`가 누락 필드를 기본값으로 채우므로 구버전 JSON도 로드된다.

### 3. 렌더링 구조
- `render()`(app.js)가 현재 탭 전체를 다시 그린다. 상태 변경 후에는 `render()` 호출이 원칙.
- **스크롤 보존이 기본값**: `render()`는 `.phone-feed`의 스크롤 위치를 유지한다.
  댓글 열기/접기, 단서 발견, 기획자 뷰 토글은 제자리 갱신이어야 하므로 그대로 두면 된다.
  화면이 바뀌는 동작(탭 전환, 태그 이동, 프로필 진입, 뒤로가기, 리셋)에서만
  `requestFeedScrollReset()`을 먼저 호출한다.
- 사용자 입력값은 `onchange`로 받는다. `oninput`을 쓰면 매 타자마다 `render()`가 돌아
  포커스가 끊기므로 주의.
- 사용자 입력 문자열은 **반드시 `esc()`** 를 거쳐 삽입한다.

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

## 로컬 실행

`data/default-data.json`을 `fetch`로 읽으므로 HTTP 서버로 여는 것을 권장한다.

```powershell
.\scripts\server.ps1          # http://localhost:3000
```

`file://`로 직접 열어도 `FALLBACK_DATA`로 동작하지만, JSON 수정이 반영되지 않는다.
