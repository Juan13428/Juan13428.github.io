# 사후관리 AI HTML 프로젝트 — Claude 규칙

## 폴더 구조

```
사후관리AI_HTML/
├── CLAUDE.md               ← Claude 규칙 파일 (이 파일)
├── index.html              ← 진입점 HTML (루트에 위치 — 정적 사이트 표준)
├── assets/
│   ├── css/
│   │   └── style.css       ← 스타일 전용
│   └── js/
│       └── app.js          ← 로직 전용
├── scripts/
│   └── server.ps1          ← 로컬 개발 서버
└── archive/
    └── *.html              ← 참고용 원본 파일 보존
```

## 코딩 규칙

### 1. 파일 분리
- HTML, CSS, JavaScript는 **반드시 별도 파일**로 작성한다.
- `<style>` 태그나 `<script>` 태그를 HTML 내부에 인라인으로 넣지 않는다.
- CSS는 `assets/css/`, JS는 `assets/js/` 아래에 배치한다.
- 개발 도구·스크립트는 `scripts/`에 배치한다.

### 2. 주석
- **기능 단위**로 주석을 달아 역할을 명확히 한다.
- 주석 형식:
  - CSS: `/* ── 섹션명 ── */`
  - JS: `// ── 섹션명 ──` 또는 인라인 설명

### 3. 버전 관리
- 파일 상단에 버전 주석을 명시한다.
- 버전 형식: `MAJOR.MINOR.PATCH`
  - `MAJOR`: 전체 구조 또는 기능 대규모 변경
  - `MINOR`: 새 기능 추가
  - `PATCH`: 버그 수정 또는 소규모 개선
- 업데이트할 때마다 `index.html`, `style.css`, `app.js` **모두** 버전을 갱신한다.

### 4. 네이밍
- CSS 클래스: `kebab-case` (예: `bubble-row`, `panel-title`)
- JS 변수·함수: `camelCase` (예: `activeIndex`, `buildWheel`)
- 데이터 속성: `data-*` 접두사 유지 (예: `data-bi`, `data-idx`)

### 5. 기타
- 한국어 문자열은 HTML 또는 JS 데이터 객체에서 관리한다.
- 전역 변수를 줄이기 위해 JS는 **즉시 실행 함수(IIFE)** 로 감싼다.
- 외부 의존성은 CDN 링크를 `index.html` `<head>`에서 로드한다.
- 원본·레퍼런스 파일은 `archive/`에 보존하고 수정하지 않는다.
