// หน้าเช็คชื่อสำหรับครูที่ปรึกษา / หัวหน้าชุมนุม
const S = {
  info: null,     // ข้อมูลหน้าแรก
  club: null,     // ชุมนุมที่เลือก
  code: '',       // รหัสที่ใช้เข้า (เก็บในหน่วยความจำเท่านั้น)
  data: null,     // ข้อมูลจาก login
  marks: {},      // ค่าที่กำลังเลือก { id: '1' | 'ล' | '0' | 'ผ' | 'มผ' }
  mode: '',       // 'full' (ครบ) | 'part' (ไม่ครบ) | 'grade'
  filter: 'all',
  loadedAt: 0,
};

const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  go: '<svg class="go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
};

init();

async function init() {
  if (API.demo) $('#demoBar').hidden = false;
  bindStatic();
  try {
    S.info = await API.call('info');
    S.loadedAt = Date.now();
    renderHome();
    setInterval(renderStatus, 30000);
  } catch (err) {
    $('#clubGrid').innerHTML = '<div class="card empty">' + esc(err.message) +
      '<br><br><button class="btn" onclick="location.reload()">ลองใหม่</button></div>';
  }
}

function bindStatic() {
  $$('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.close)));
  $('#search').addEventListener('input', renderClubs);
  $('#formCode').addEventListener('submit', onLogin);
  $('#formConfirm').addEventListener('submit', onSend);
  $('#btnReview').addEventListener('click', openConfirm);
  window.addEventListener('popstate', () => { if (!$('#viewCheck').hidden) goHome(); });
}

/* ============================ หน้าแรก ============================ */

function renderHome() {
  const i = S.info;
  $('#school').textContent = i.school;
  $('#helloText').textContent = greeting() + ' คุณครู';
  $('#helloSub').textContent = 'ภาคเรียนที่ ' + i.term + '/' + i.year + ' · เลือกชุมนุมของท่าน แล้วใส่รหัสเพื่อเช็คชื่อ';
  const ann = $('#announce');
  ann.hidden = !i.announce;
  ann.textContent = i.announce || '';
  renderStatus();
  renderClubs();
}

// นาทีที่ผ่านไปตั้งแต่โหลดข้อมูล ใช้นับถอยหลังจากเวลาของเซิร์ฟเวอร์ (ไม่พึ่งนาฬิกาเครื่อง)
function serverMinutesNow(win) {
  const [h, m] = win.time.split(':').map(Number);
  return h * 60 + m + Math.floor((Date.now() - S.loadedAt) / 60000);
}

function minutesLeft(win) {
  const [ch, cm] = win.close.split(':').map(Number);
  return ch * 60 + cm - serverMinutesNow(win);
}

function renderStatus() {
  if (!S.info) return;
  const w = S.info.window;
  const el = $('#statusCard');
  const total = S.info.clubs.length;
  const sent = S.info.clubs.filter(c => c.submitted).length;
  const sentPct = total ? Math.round(sent / total * 100) : 0;
  if (w.isOpen) {
    const [oh, om] = w.open.split(':').map(Number), [ch, cm] = w.close.split(':').map(Number);
    const span = ch * 60 + cm - (oh * 60 + om);
    const always = w.mode === 'เปิดตลอด';
    const left = Math.max(0, minutesLeft(w));
    const timePct = always ? 100 : Math.max(0, Math.min(100, left / span * 100));
    const timeBig = always ? 'เปิดตลอด'
      : left >= 60 ? Math.floor(left / 60) + '<small> ชม. </small>' + (left % 60) + '<small> นาที</small>'
      : left + '<small> นาที</small>';
    el.className = 'card status open';
    el.innerHTML = '<div class="st-top"><span class="dot"></span><div class="body"><b>เปิดให้เช็คชื่อ · สัปดาห์ที่ ' + w.week +
      (w.week === S.info.weeks ? ' (ส่งผล)' : '') + '</b><div class="muted small">' + thDate(w.weekDate, true) + ' · ' + w.open + '–' + w.close + ' น.</div></div></div>' +
      '<div class="stat-grid">' +
      '<div class="stat"><small>เช็คชื่อแล้ว</small><b>' + sent + '<small> / ' + total + ' ชุมนุม</small></b>' +
      '<div class="timebar sent"><i style="width:' + sentPct + '%"></i></div></div>' +
      '<div class="stat' + (!always && left <= 15 ? ' hurry' : '') + '"><small>' + (always ? 'สถานะ' : 'เหลือเวลา') + '</small><b>' + timeBig + '</b>' +
      '<div class="timebar"><i style="width:' + timePct + '%"></i></div></div></div>';
  } else {
    el.className = 'card status closed';
    el.innerHTML = '<div class="st-top"><span class="dot"></span><div class="body"><b>ยังไม่เปิดให้เช็คชื่อ</b><div class="muted small">' + esc(w.reason) +
      (w.next ? '<br>ครั้งถัดไป <b style="font-size:inherit;color:var(--blue)">' + thDate(w.next, true) + ' ' + w.open + ' น.</b>' : '') + '</div></div></div>' +
      (w.week ? '<div class="muted small" style="margin-top:.5em">สัปดาห์ที่ ' + w.week + ' เช็คชื่อแล้ว <b>' + sent + '/' + total + '</b> ชุมนุม</div>' : '');
  }
}

// อัปเดตยอดส่งบนหน้าแรกทุก 1 นาทีขณะเปิดหน้าอยู่
setInterval(() => {
  if (!S.info || $('#viewClubs').hidden || document.hidden) return;
  API.call('info').then(i => { S.info = i; S.loadedAt = Date.now(); renderStatus(); renderClubs(); }).catch(() => {});
}, 60000);

function renderClubs() {
  if (!S.info) return;
  const q = $('#search').value.trim().toLowerCase();
  const mine = store('lastClub');
  const list = S.info.clubs
    .filter(c => !q || (c.name + ' ' + c.teachers.join(' ')).toLowerCase().includes(q))
    .sort((a, b) => (b.no === mine) - (a.no === mine) || a.no.localeCompare(b.no));
  const grid = $('#clubGrid');
  if (!list.length) { grid.innerHTML = '<div class="empty">ไม่พบชุมนุมที่ค้นหา</div>'; return; }
  grid.innerHTML = list.map((c, i) => '<button class="club c' + (Number(c.no) % 3) + (c.no === mine ? ' mine' : '') +
    '" style="animation-delay:' + Math.min(i, 12) * 30 + 'ms" data-no="' + c.no + '">' +
    '<span class="mono">' + esc(initials(c.name)) + '</span><span class="txt">' +
    '<span class="nm">' + Number(c.no) + '. ' + esc(c.name) + '</span>' +
    '<span class="tc">' + esc(c.teachers.join(', ')) + '</span>' +
    '<span class="meta"><span class="chip gray">' + c.count + ' รูป</span>' +
    (c.no === mine ? '<span class="chip pink">ชุมนุมของฉัน</span>' : '') +
    (c.submitted ? '<span class="chip ok">ส่งแล้ว</span>' : '') + '</span></span>' + ICON.go + '</button>').join('');
  $$('.club', grid).forEach(b => b.addEventListener('click', () => askCode(b.dataset.no)));
}

function askCode(no) {
  S.club = S.info.clubs.find(c => c.no === no);
  $('#mCodeIc').textContent = initials(S.club.name);
  $('#mCodeName').textContent = S.club.name;
  $('#mCodeTc').textContent = S.club.teachers.join(', ');
  $('#codeInput').value = '';
  $('#codeErr').textContent = '';
  openModal('#mCode');
  setTimeout(() => $('#codeInput').focus(), 60);
}

async function onLogin(e) {
  e.preventDefault();
  const code = $('#codeInput').value.trim();
  const btn = $('#btnLogin');
  busy(btn, true, 'กำลังตรวจสอบ…');
  $('#codeErr').textContent = '';
  try {
    const data = await API.call('login', { no: S.club.no, code });
    S.code = code;
    store('lastClub', S.club.no);
    closeModal('#mCode');
    showCheck(data);
    history.pushState({ v: 'check' }, '');
  } catch (err) {
    $('#codeErr').textContent = err.message;
    shake($('#codeInput'));
    $('#codeInput').select();
  } finally {
    busy(btn, false);
  }
}

function goHome() {
  S.data = null;
  S.code = '';
  $('#viewCheck').hidden = true;
  $('#bottomBar').hidden = true;
  document.documentElement.style.setProperty('--bar-h', '0px');
  $('#viewClubs').hidden = false;
  window.scrollTo(0, 0);
  API.call('info').then(i => { S.info = i; S.loadedAt = Date.now(); renderHome(); }).catch(() => {});
}

/* ============================ หน้าเช็คชื่อ ============================ */

function draftKey() { return 'draft:' + S.data.club.no + ':' + S.data.active.week; }
function canEdit() { const d = S.data; return !!(d && d.active && d.rights.canSubmit); }

// ลำดับการแตะชื่อ: ครบ = มา ↔ ลา, ไม่ครบ = มา → ขาด → ลา → มา, ส่งผล = ผ ↔ มผ
const CYCLE = { full: ['1', 'ล'], part: ['1', '0', 'ล'], grade: ['ผ', 'มผ'] };

function showCheck(data) {
  S.data = data;
  S.marks = {};
  S.mode = '';
  S.filter = 'all';
  const a = data.active;
  const wk = a ? a.week - 1 : -1;
  const prev = {};
  if (a) data.students.forEach(st => { const v = (data.marks[st.id] || [])[wk]; if (v) prev[st.id] = v; });
  const draft = a && canEditData(data) ? store(draftKey()) : null;
  if (a && data.mode === 'grade') {
    S.mode = 'grade';
    S.marks = Object.assign({}, prev, draft && draft.marks);
  } else if (draft && draft.mode) {
    S.mode = draft.mode;
    S.marks = draft.marks || {};
  } else if (Object.keys(prev).length) {
    S.marks = prev;
    S.mode = Object.values(prev).includes('0') ? 'part' : 'full';
  }
  $('#viewClubs').hidden = true;
  $('#viewCheck').hidden = false;
  renderCheck();
  window.scrollTo(0, 0);
}

function canEditData(d) { return !!(d.active && d.rights && d.rights.canSubmit); }

function renderCheck() {
  const d = S.data, c = d.club, a = d.active;
  const grade = S.mode === 'grade';
  const view = $('#viewCheck');
  const sub = a
    ? thDate(d.sessions[a.week - 1], true) + (a.special ? ' · เปิดพิเศษถึง ' + thStamp(a.until) : '')
    : c.teachers.join(', ');
  let html = '<div class="ck-head"><button class="icon-btn" id="btnBack" aria-label="กลับ">' + ICON.back + '</button>' +
    '<div class="ck-title"><b>' + esc(c.name) + '</b><span>' + esc(sub) + '</span></div>' +
    (a ? '<div class="wk"><small>สัปดาห์</small><b>' + a.week + '</b></div>' : '') + '</div>';

  if (!a) {
    html += noticeHtml(ICON.clock, '', 'ยังไม่เปิดให้เช็คชื่อ', esc(d.window.reason) +
      (d.window.next ? '<br>ครั้งถัดไป ' + thDate(d.window.next, true) + ' ' + d.window.open + '–' + d.window.close + ' น.' : ''));
  } else if (!d.rights.canSubmit) {
    html += heroHtml() + noticeHtml(ICON.lock, 'pink', 'ส่งและแก้ไขครบแล้ว', 'หากต้องการแก้ไขอีก กรุณาติดต่อหัวหน้ากิจกรรมพัฒนาผู้เรียน');
  } else {
    html += heroHtml();
    if (grade) {
      html += '<div class="quick"><button class="btn sm" id="btnAllPass">ผ ทุกรูป</button><button class="btn sm" id="btnByPct">ผ เฉพาะที่มาเรียน ≥ 80%</button></div>' +
        '<div class="tip">แตะชื่อเพื่อสลับ <b>ผ</b> / <b>มผ</b></div>';
    } else {
      html += '<div class="switch' + (S.mode ? '' : ' attn') + '" id="switch" data-mode="' + S.mode + '"><span class="pill"></span>' +
        '<button data-mode="full">ครบ<small>มาครบทุกรูป</small></button><button data-mode="part">ไม่ครบ<small>มีคนไม่มา</small></button></div>' +
        '<div class="tip" id="tip">' + tipText() + '</div>';
    }
    if (S.mode) html += filtersHtml() + '<ul class="slist" id="slist">' + listHtml() + '</ul>';
  }

  html += '<details class="card" id="histBox"><summary>ประวัติการเช็คชื่อทุกสัปดาห์' + ICON.down + '</summary><div style="margin-top:.7em">' + historyHtml() + '</div></details>';
  view.innerHTML = html;

  $('#btnBack').addEventListener('click', () => history.back());
  // เปิดประวัติแล้วเลื่อนให้เห็นตาราง ไม่ให้อยู่ใต้แถบปุ่มส่ง
  $('#histBox').addEventListener('toggle', e => { if (e.target.open) setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); });
  $$('#switch button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  if ($('#btnAllPass')) $('#btnAllPass').addEventListener('click', () => { d.students.forEach(s => { S.marks[s.id] = 'ผ'; }); refresh(true); });
  if ($('#btnByPct')) $('#btnByPct').addEventListener('click', () => {
    d.students.forEach(s => { const p = attendance(s.id).pct; S.marks[s.id] = p === null || p >= 80 ? 'ผ' : 'มผ'; });
    refresh(true);
  });
  bindList();
  updateTotals();
}

function noticeHtml(icon, kind, title, body) {
  return '<div class="card notice"><div class="big-ic ' + kind + '">' + icon + '</div><b>' + title + '</b><div class="muted small">' + body + '</div></div>';
}

function tipText() {
  if (S.mode === 'full') return 'ทุกรูปถูกตั้งเป็น <b>มา</b> แล้ว · แตะชื่อรูปที่ <b>ลา</b>';
  if (S.mode === 'part') return 'แตะชื่อเพื่อเปลี่ยน <b>มา → ขาด → ลา</b>';
  return 'เลือก <b>ครบ</b> หรือ <b>ไม่ครบ</b> เพื่อเริ่มเช็คชื่อ';
}

function heroHtml() {
  const r = S.data.rights;
  const rights = r.count === 0 ? '<span class="chip warn">ยังไม่ส่ง</span>' : '<span class="chip ok">ส่งแล้ว · แก้ได้อีก ' + r.editsLeft + ' ครั้ง</span>';
  const grade = S.mode === 'grade';
  const rows = grade
    ? [['ผ', 'ผ่าน', 'var(--blue)'], ['มผ', 'ไม่ผ่าน', 'var(--pink)']]
    : [['1', 'มา', 'var(--blue)'], ['ล', 'ลา', 'var(--yellow)'], ['0', 'ขาด', 'var(--pink)']];
  return '<div class="card hero"><div class="ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" stroke="var(--line)"/>' +
    rows.map(x => '<circle class="seg-' + x[0] + '" cx="50" cy="50" r="42" stroke="' + x[2] + '" stroke-dasharray="0 264"/>').join('') +
    '</svg><div class="c"><b id="ringNum">0</b><small id="ringLbl">' + (grade ? 'ผ่าน' : 'มาเรียน') + '</small></div></div>' +
    '<div class="hero-side"><div class="legend">' + rows.map(x => '<span><i style="background:' + x[2] + '"></i>' + x[1] + '<b id="lg-' + x[0] + '">0</b></span>').join('') +
    '</div><div class="rights">' + rights + '</div></div></div>';
}

function filtersHtml() {
  const opts = S.mode === 'grade' ? [['all', 'ทั้งหมด'], ['ผ', 'ผ'], ['มผ', 'มผ']]
    : [['all', 'ทั้งหมด'], ['1', 'มา'], ['ล', 'ลา'], ['0', 'ขาด']];
  return '<div class="filters" id="filters">' + opts.map(o => '<button data-f="' + o[0] + '" class="' + (S.filter === o[0] ? 'on' : '') + '">' +
    o[1] + ' <b data-fc="' + o[0] + '">0</b></button>').join('') + '</div>';
}

function attendance(id) {
  const m = S.data.marks[id] || [];
  let p = 0, l = 0, a = 0;
  for (let i = 0; i < S.data.weeks - 1; i++) { if (m[i] === '1') p++; else if (m[i] === 'ล') l++; else if (m[i] === '0') a++; }
  const held = p + l + a;
  return { p, l, a, held, pct: held ? Math.round(p / held * 100) : null };
}

const AV_COLORS = ['#2f80ed', '#ec4899', '#e0a800', '#56ccf2', '#7b6cf6', '#f472b6'];
const AV_MARK = { 'ล': 'ล', '0': '✕', 'มผ': '✕' };

function listHtml() {
  return S.data.students.map((s, i) => {
    const v = S.marks[s.id] || '';
    let sub = esc(s.cls);
    if (S.mode === 'grade') {
      const at = attendance(s.id);
      sub += ' · มา ' + at.p + '/' + at.held + (at.pct !== null ? ' (' + at.pct + '%)<span class="minibar' + (at.pct < 80 ? ' low' : '') + '"><i style="width:' + at.pct + '%"></i></span>' : '');
    }
    return '<li class="srow is-' + v + '" role="button" tabindex="0" data-id="' + esc(s.id) + '" style="animation-delay:' + Math.min(i, 15) * 18 + 'ms">' +
      '<span class="av" style="background:' + AV_COLORS[i % AV_COLORS.length] + '">' + esc(AV_MARK[v] || initials(s.name)) + '</span>' +
      '<span class="who"><b>' + esc(s.name) + '</b><small>' + sub + '</small></span>' +
      '<span class="st">' + MARK_LABEL[v] + '</span></li>';
  }).join('');
}

function bindList() {
  $$('#filters button').forEach(b => b.addEventListener('click', () => {
    S.filter = b.dataset.f;
    $$('#filters button').forEach(x => x.classList.toggle('on', x === b));
    applyFilter();
  }));
  $$('#slist .srow').forEach(li => {
    const tap = () => {
      const cyc = CYCLE[S.mode];
      const cur = S.marks[li.dataset.id];
      const v = cyc[(cyc.indexOf(cur) + 1) % cyc.length];
      S.marks[li.dataset.id] = v;
      paintRow(li, v);
      buzz();
      saveDraft();
      updateTotals();
    };
    li.addEventListener('click', tap);
    li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });
  });
  applyFilter();
}

function paintRow(li, v) {
  const s = S.data.students.find(x => x.id === li.dataset.id);
  li.className = 'srow is-' + v;
  void li.offsetWidth;
  li.classList.add('bump');
  $('.av', li).textContent = AV_MARK[v] || initials(s.name);
  $('.st', li).textContent = MARK_LABEL[v];
}

function applyFilter() {
  $$('#slist .srow').forEach(li => { li.hidden = S.filter !== 'all' && (S.marks[li.dataset.id] || '') !== S.filter; });
}

function refresh(rerenderList) {
  const ul = $('#slist');
  if (ul && rerenderList) { ul.innerHTML = listHtml(); bindList(); }
  saveDraft();
  updateTotals();
}

function setMode(mode) {
  if (mode === S.mode) return;
  if (mode === 'full') {
    // ครบ: ทุกรูปมา ยกเว้นรูปที่เลือกลาไว้แล้ว
    S.data.students.forEach(s => { S.marks[s.id] = S.marks[s.id] === 'ล' ? 'ล' : '1'; });
  } else {
    S.data.students.forEach(s => { if (!S.marks[s.id]) S.marks[s.id] = '1'; });
  }
  const first = !S.mode;
  S.mode = mode;
  S.filter = 'all';
  buzz();
  saveDraft();
  if (first) { renderCheck(); return; }
  // สลับโหมดแบบไม่วาดใหม่ทั้งหน้า เพื่อให้แถบเลื่อนเคลื่อนไหวลื่น
  $('#switch').dataset.mode = mode;
  $('#tip').innerHTML = tipText();
  $('#filters').outerHTML = filtersHtml();
  $('#slist').innerHTML = listHtml();
  bindList();
  updateTotals();
}

function saveDraft() {
  if (canEdit()) store(draftKey(), { mode: S.mode, marks: S.marks });
}

function tally() {
  const t = { '1': 0, 'ล': 0, '0': 0, 'ผ': 0, 'มผ': 0, '': 0, missing: 0 };
  const opts = CYCLE[S.mode] || [];
  S.data.students.forEach(s => { const v = S.marks[s.id]; if (v && opts.includes(v)) t[v]++; else t.missing++; });
  t[''] = t.missing;
  return t;
}

function updateTotals() {
  const d = S.data;
  const show = canEdit() && !!S.mode;
  const bar = $('#bottomBar');
  bar.hidden = !show;
  document.documentElement.style.setProperty('--bar-h', show ? bar.offsetHeight + 'px' : '0px');
  if (!d.active) return;
  const t = tally(), total = d.students.length || 1;
  // วงแหวนสรุป
  const C = 2 * Math.PI * 42;
  let off = 0;
  (S.mode === 'grade' ? ['ผ', 'มผ'] : ['1', 'ล', '0']).forEach(k => {
    const el = $('.seg-' + k);
    if (!el) return;
    const len = t[k] / total * C;
    el.setAttribute('stroke-dasharray', len + ' ' + (C - len));
    el.setAttribute('stroke-dashoffset', -off);
    off += len;
    const lg = $('#lg-' + k);
    if (lg) lg.textContent = t[k];
  });
  const main = S.mode === 'grade' ? t['ผ'] : t['1'];
  if ($('#ringNum')) $('#ringNum').innerHTML = (S.mode ? main : '–') + '<span class="muted" style="font-size:.5em">/' + d.students.length + '</span>';
  $$('[data-fc]').forEach(el => { el.textContent = el.dataset.fc === 'all' ? d.students.length : t[el.dataset.fc]; });
  if (!show) return;
  $('#progBar').style.width = ((total - t.missing) / total * 100) + '%';
  $('#btnReview').disabled = t.missing > 0;
  $('#btnReviewText').textContent = t.missing ? 'ยังไม่ได้เลือกอีก ' + t.missing + ' รูป' : 'ตรวจสอบและส่ง';
}

function historyHtml() {
  const d = S.data;
  if (!d.students.length) return '<div class="empty">ยังไม่มีรายชื่อนักเรียน</div>';
  let h = '<div class="hist-wrap"><table class="hist"><thead><tr><th>ชื่อ</th>';
  for (let w = 1; w <= d.weeks; w++) h += '<th title="' + thDate(d.sessions[w - 1]) + '">' + (w === d.weeks ? 'ผล' : w) + '</th>';
  h += '</tr></thead><tbody>';
  d.students.forEach(s => {
    h += '<tr><td>' + esc(s.name) + '</td>';
    const m = d.marks[s.id] || [];
    for (let w = 0; w < d.weeks; w++) { const v = m[w] || ''; h += '<td class="m-' + v + '">' + MARK_LABEL[v] + '</td>'; }
    h += '</tr>';
  });
  return h + '</tbody></table></div><div class="muted small" style="margin-top:.4em">ตัวเลขหัวตาราง = สัปดาห์ที่ · ผล = ผ/มผ</div>';
}

/* ============================ ยืนยันและส่ง ============================ */

function openConfirm() {
  const d = S.data, t = tally(), grade = S.mode === 'grade';
  $('#cfWhere').textContent = d.club.name + ' · สัปดาห์ที่ ' + d.active.week + ' · ' + thDate(d.sessions[d.active.week - 1], true);
  const n = k => '<b data-count="' + k + '">0</b>';
  $('#cfSum').innerHTML = grade
    ? '<div class="ok">' + n(t['ผ']) + 'ผ่าน (ผ)</div><div class="bad">' + n(t['มผ']) + 'ไม่ผ่าน (มผ)</div><div>' + n(d.students.length) + 'ทั้งหมด</div>'
    : '<div class="ok">' + n(t['1']) + 'มา</div><div class="warn">' + n(t['ล']) + 'ลา</div><div class="bad">' + n(t['0']) + 'ขาด</div>';
  countUp($('#cfSum'));
  const names = v => d.students.filter(s => S.marks[s.id] === v).map(s => esc(s.name) + ' <span class="muted">' + esc(s.cls) + '</span>');
  let nh = '';
  if (grade) {
    const f = names('มผ');
    if (f.length) nh = '<div class="namebox"><b>ไม่ผ่าน (มผ)</b><br>' + f.join('<br>') + '</div>';
  } else {
    const l = names('ล'), a = names('0');
    if (l.length) nh += '<div class="namebox"><b>ลา ' + l.length + ' รูป</b><br>' + l.join('<br>') + '</div>';
    if (a.length) nh += '<div class="namebox"><b>ขาด ' + a.length + ' รูป</b><br>' + a.join('<br>') + '</div>';
  }
  $('#cfNames').innerHTML = nh;
  const r = d.rights;
  $('#cfRights').innerHTML = r.count === 0
    ? 'หลังส่งแล้ว แก้ไขได้อีก <b>1 ครั้ง</b> ภายในช่วงเวลาที่เปิด'
    : r.editsLeft <= 1
      ? 'นี่คือการ<b>แก้ไขครั้งสุดท้าย</b> หลังส่งแล้วจะแก้ไม่ได้อีก'
      : 'นี่คือการ<b>แก้ไข</b> หลังส่งแล้วจะเหลือสิทธิ์แก้ไขอีก <b>' + (r.editsLeft - 1) + ' ครั้ง</b>';
  $('#cfBy').value = store('checkerName') || '';
  $('#cfCode').value = '';
  $('#cfErr').textContent = '';
  openModal('#mConfirm');
  setTimeout(() => ($('#cfBy').value ? $('#cfCode') : $('#cfBy')).focus(), 60);
}

async function onSend(e) {
  e.preventDefault();
  const by = $('#cfBy').value.trim();
  const code = $('#cfCode').value.trim();
  if (!by) { $('#cfErr').textContent = 'กรุณาใส่ชื่อผู้เช็คชื่อ'; shake($('#cfBy')); return; }
  if (code !== S.code) { $('#cfErr').textContent = 'รหัสไม่ตรงกับที่ใช้เข้าสู่ระบบ'; shake($('#cfCode')); return; }
  store('checkerName', by);
  const btn = $('#btnSend');
  busy(btn, true, 'กำลังส่ง…');
  try {
    const marks = {};
    S.data.students.forEach(s => { marks[s.id] = S.marks[s.id]; });
    const week = S.data.active.week;
    const t = tally(), grade = S.mode === 'grade';
    const data = await API.call('submit', { no: S.data.club.no, code, week, marks, by });
    store(draftKey(), null);
    closeModal('#mConfirm');
    showDone(data, week, t, grade);
  } catch (err) {
    $('#cfErr').textContent = err.message;
    shake($('#cfCode'));
  } finally {
    busy(btn, false);
  }
}

function showDone(data, week, t, grade) {
  S.data = data;
  $('#bottomBar').hidden = true;
  document.documentElement.style.setProperty('--bar-h', '0px');
  const n = k => '<b data-count="' + k + '">0</b>';
  const perfect = !grade && !t['0'] && !t['ล'];
  const r = data.rights;
  $('#viewCheck').innerHTML = '<div class="card done stack">' +
    '<svg class="check-anim" viewBox="0 0 100 100"><defs><linearGradient id="gradCk" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#2f80ed"/><stop offset=".55" stop-color="#7b6cf6"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs>' +
    '<circle cx="50" cy="50" r="45"/><path d="M30 52l13 13 27-29"/></svg>' +
    '<div><h2>ส่งเรียบร้อยแล้ว</h2><div class="muted">' + esc(data.club.name) + ' · สัปดาห์ที่ ' + week + '</div></div>' +
    '<div class="sum-grid">' + (grade
      ? '<div class="ok">' + n(t['ผ']) + 'ผ</div><div class="bad">' + n(t['มผ']) + 'มผ</div><div>' + n(data.students.length) + 'ทั้งหมด</div>'
      : '<div class="ok">' + n(t['1']) + 'มา</div><div class="warn">' + n(t['ล']) + 'ลา</div><div class="bad">' + n(t['0']) + 'ขาด</div>') + '</div>' +
    (perfect ? '<div><span class="chip pink">มาครบทุกรูป เยี่ยมมาก!</span></div>' : '') +
    '<div class="muted small">' + (r && r.canSubmit ? 'แก้ไขได้อีก ' + r.editsLeft + ' ครั้ง ภายในเวลาที่เปิด' : 'สัปดาห์นี้ล็อกแล้ว') + '</div>' +
    '<div class="row" style="justify-content:center;flex-wrap:nowrap"><button class="btn" id="btnView">ดูรายการที่ส่ง</button>' +
    '<button class="btn primary" id="btnHome">กลับหน้าแรก</button></div></div>';
  $('#btnHome').addEventListener('click', () => history.back());
  $('#btnView').addEventListener('click', () => showCheck(data));
  window.scrollTo(0, 0);
  countUp($('#viewCheck'));
  confetti();
  buzz([20, 60, 20]);
}
