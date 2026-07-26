/* ══════════════════════════════════════════════
   Instory Planner — io.js
   버전: 1.2.0
   JSON 저장·불러오기 / 엑셀(XLSX) 내보내기
   ══════════════════════════════════════════════ */

/* ── 현재 기획 데이터 스냅샷 ── */
function currentData() {
  return {
    profiles: S.profiles,
    posts: S.posts,
    objectives: S.objectives,
    startPostId: S.startPostId,
    activeObjectiveId: S.activeObjectiveId,
  };
}

/* ── JSON 저장 ── */
function exportJson() {
  const blob = new Blob([JSON.stringify(currentData(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "instory-planner-data.json";
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus("JSON 저장 완료");
}

/* ── JSON 불러오기 ── */
function importJson(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      applyData(JSON.parse(reader.result));
      U.openId = null;
      requestFeedScrollReset();
      render();
      setStatus("불러옴: " + file.name);
    } catch (e) {
      alert("JSON 파일을 읽을 수 없습니다.\n" + e.message);
    }
  };
  reader.readAsText(file);
  ev.target.value = "";
}

/* ── 엑셀 내보내기 (프로필 / 게시글 / 댓글 / 해시태그 4시트) ── */
function exportXlsx() {
  if (typeof XLSX === "undefined") {
    alert("엑셀 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.");
    return;
  }

  const hops = computeHops();
  const wb = XLSX.utils.book_new();

  /* 프로필 시트 */
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(S.profiles.map(p => ({
    ID: p.id,
    핸들: "@" + p.handle,
    이름: p.name,
    관계: p.relationship,
    소개: p.bio,
    팔로워: p.followers,
    팔로잉: p.following,
    게시글수: S.posts.filter(x => x.authorId === p.id).length,
  }))), "프로필");

  /* 게시글 시트 */
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(S.posts.map(p => ({
    ID: p.id,
    작성자: (profById(p.authorId) || {}).name || p.authorId,
    날짜: p.date,
    본문: p.content,
    이미지설명: p.imageDesc,
    해시태그: effTags(p).map(t => "#" + t).join(" "),
    좋아요: p.likes,
    댓글수: (p.comments || []).length,
    단서여부: p.isClue ? "Y" : "",
    연결이벤트: p.isClue ? p.clueEvent : "",
    단서메모: p.isClue ? p.clueNote : "",
    단서문구: (p.clues || []).map(c => c.phrase).join(" | "),
    홉: (p.id in hops) ? hops[p.id] : "도달불가",
    시작게시글: (p.id === S.startPostId) ? "★" : "",
  }))), "게시글");

  /* 목표 시트 */
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    S.objectives.length ? S.objectives.map((o, i) => ({
      순서: i + 1,
      ID: o.id,
      제목: o.title,
      설명: o.desc,
      대화이벤트: o.event,
      필요단서수: o.clueIds.length,
      최대홉: objectiveMaxHop(o, hops) ?? "—",
      시작목표: (o.id === S.activeObjectiveId) ? "★" : "",
    })) : [{ 순서: "", ID: "", 제목: "", 설명: "", 대화이벤트: "", 필요단서수: "", 최대홉: "" }]
  ), "목표");

  /* 단서 시트 */
  const clueRows = allClues().map(c => {
    const owner = objectiveOfClue(c.id);
    return {
      단서ID: c.id,
      문구: c.phrase,
      메모: c.note,
      게시글ID: c.post.id,
      작성자: (profById(c.post.authorId) || {}).name || "",
      홉: (c.post.id in hops) ? hops[c.post.id] : "도달불가",
      소속목표: owner ? owner.title : "(미배정)",
      본문일치: (c.post.content || "").indexOf(c.phrase) !== -1 ? "Y" : "N",
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    clueRows.length ? clueRows : [{ 단서ID: "", 문구: "", 소속목표: "" }]
  ), "단서");

  /* 댓글 시트 */
  const commentRows = [];
  S.posts.forEach(p => (p.comments || []).forEach(c => commentRows.push({
    게시글ID: p.id,
    게시글작성자: (profById(p.authorId) || {}).name || "",
    댓글작성자: c.author,
    내용: c.text,
    좋아요: c.likes,
  })));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    commentRows.length ? commentRows : [{ 게시글ID: "", 댓글작성자: "", 내용: "", 좋아요: "" }]
  ), "댓글");

  /* 해시태그 시트 */
  const tm = tagMapAll();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(Object.entries(tm).map(([t, ps]) => ({
    해시태그: "#" + t,
    게시글수: ps.length,
    연결게시글: ps.map(p => p.id).join(", "),
    단서포함: ps.some(p => p.isClue) ? "Y" : "",
  }))), "해시태그");

  XLSX.writeFile(wb, "instory-planner.xlsx");
  setStatus("엑셀 내보내기 완료");
}
