# 몰입 곡선 에디터 — Claude 규칙

게임 진행도에 따른 몰입·긴장 강도를 설계하는 인터랙티브 에디터.
배포 URL: https://juan13428.github.io/ImmersionCurve/index.html

## 폴더 구조

```
ImmersionCurve/
├── CLAUDE.md               ← Claude 규칙 파일 (이 파일)
├── index.html              ← 진입점 HTML (마크업 전용)
├── assets/
│   ├── css/
│   │   └── style.css       ← 스타일 전용 (라이트/다크 테마 CSS 변수 포함)
│   └── js/
│       └── app.js          ← 로직 전용 (SVG 렌더링·인터랙션·저장/내보내기)
└── data/
    └── default-data.json   ← 초기 로드되는 기본 곡선 데이터
```

## 주요 기능

- **곡선 편집**: 차트 빈 곳 클릭 = 포인트 추가, 드래그 = 이동, 더블클릭 = 삭제
- **다중 곡선**: 곡선 추가/삭제/이름 변경/표시 토글, 활성 곡선만 편집 핸들 표시
- **포인트 이름·링크**: 차트 하단 리스트에서 편집, 이름은 차트 라벨과 실시간 연동
- **이벤트 마커**: 이벤트 배치 모드에서 클릭으로 추가, 깃발 드래그로 이동
- **플로우 채널**: 사선 평행 밴드. ◆ 핸들 드래그 = 각도(y0/y1), 점선 드래그 = 폭(w)
- **저장/내보내기**: JSON 저장·불러오기, PNG 내보내기, 라이트/다크 테마

## 코딩 규칙

### 1. 파일 분리
- HTML, CSS, JavaScript는 **반드시 별도 파일**로 유지한다. 인라인 `<style>`/`<script>` 금지.
- 기본 데이터 변경은 `data/default-data.json`만 수정하면 된다 (앱 로직과 분리됨).
- `app.js`의 `FALLBACK_DATA`는 file:// 직접 실행용 폴백 — JSON을 바꾸면 함께 갱신한다.

### 2. 데이터 스키마 (JSON 저장/불러오기 공용)
```json
{
  "curves": [{ "name": "", "slot": 0, "visible": true,
               "points": [{ "x": 0-100, "y": 0-100, "name": "", "link": "" }] }],
  "activeCurve": 0,
  "events": [{ "x": 0-100, "label": "" }],
  "flow": { "on": true, "y0": 0-100, "y1": 0-100, "w": 4-100 }
}
```
- 구버전 수평 밴드 스키마(`flow.min`/`flow.max`)는 `applyData()`가 자동 변환한다.

### 3. 렌더링 구조 (app.js)
- `render()`가 SVG 전체를 다시 그린다. 상태 변경 후에는 `render()` 호출이 원칙.
- **예외 — 편집 포커스 보존**: 포인트 리스트의 이름/링크 입력, 행 호버 하이라이트는
  전체 재렌더 대신 대상 DOM만 직접 갱신한다 (`setPointHighlight()`, input 리스너).
  리스트 입력 중 `render()`를 호출하면 포커스가 끊기므로 주의.
- 색상은 CSS 변수(`--series-1`~`--series-5`, `--flow-band` 등)에서 읽는다.
  색을 바꿀 때는 style.css의 라이트/다크 두 블록을 모두 갱신한다.

### 4. 주석
- CSS: `/* ── 섹션명 ── */`, JS: `/* ── 섹션명 ── */` 형식의 기능 단위 주석.

### 5. 버전 관리
- 파일 상단 버전 주석 (`MAJOR.MINOR.PATCH`).
- 업데이트 시 `index.html`, `style.css`, `app.js` 버전을 함께 갱신한다.

### 6. 저장소 제약
- localStorage/sessionStorage 사용 금지 (인메모리 상태 + JSON 파일 저장으로 대체).
