/* ══════════════════════════════════════════════
   Instory Planner — view-profiles.js
   버전: 1.5.0
   프로필 탭 렌더링
   ══════════════════════════════════════════════ */

function renderProfiles() {
  let h = `<div class="section-head">
    <h2 style="margin:0">프로필 <span class="muted" style="font-weight:400">(${S.profiles.length})</span></h2>
    <button class="btn sm blue" onclick="App.addProfile()">+ 프로필 추가</button>
  </div>`;

  if (!S.profiles.length) {
    h += `<div class="empty-note">등장인물이 없습니다. 프로필을 추가해야 게시글을 작성할 수 있습니다.</div>`;
  }

  h += S.profiles.map(p => `
    <div class="card profile-card">
      ${avatarHtml(p, 46)}
      <div class="profile-fields">

        <div class="row">
          <label class="field grow"><span>이름</span>
            <input value="${esc(p.name)}" onchange="App.updProfile('${escJs(p.id)}','name',this.value)"></label>
          <label class="field grow"><span>핸들 (@)</span>
            <input value="${esc(p.handle)}" onchange="App.updProfile('${escJs(p.id)}','handle',this.value)"></label>
          <label class="field grow"><span>관계 (기획 메모)</span>
            <input value="${esc(p.relationship)}" onchange="App.updProfile('${escJs(p.id)}','relationship',this.value)"></label>
        </div>

        <div class="row">
          <label class="field" style="flex:2"><span>소개글</span>
            <input value="${esc(p.bio)}" onchange="App.updProfile('${escJs(p.id)}','bio',this.value)"></label>
          <label class="field"><span>팔로워</span>
            <input type="number" class="w-90" value="${p.followers}"
              onchange="App.updProfile('${escJs(p.id)}','followers',this.value)"></label>
          <label class="field"><span>팔로잉</span>
            <input type="number" class="w-90" value="${p.following}"
              onchange="App.updProfile('${escJs(p.id)}','following',this.value)"></label>
          <label class="field"><span>색상</span>
            <input type="color" value="${esc(p.color)}"
              onchange="App.updProfile('${escJs(p.id)}','color',this.value)"></label>
        </div>

        <div class="profile-foot">
          <span class="mono muted fs-11">${esc(p.id)} · 게시글 ${S.posts.filter(x => x.authorId === p.id).length}개</span>
          <button class="btn sm red" onclick="App.delProfile('${escJs(p.id)}')">삭제</button>
        </div>

      </div>
    </div>`).join("");

  return h;
}
