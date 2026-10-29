// หน้าเช็คชื่อสำหรับครูที่ปรึกษา / หัวหน้าชุมนุม
const S = {
  info: null,     // ข้อมูลหน้าแรก
  club: null,     // ชุมนุมที่เลือก
  code: '',       // รหัสที่ใช้เข้า (เก็บในหน่วยความจำเท่านั้น)
  data: null,     // ข้อมูลจาก login
  marks: {},      // ค่าที่กำลังเลือก { id: '1' | 'ล' | '0' | 'ผ' | 'มผ' }
  mode: '',       // 'full' (ครบ) | 'part' (ไม่ครบ) | 'grade'
  loadedAt: 0,
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
  $('#school').textContent = i.school + ' · ภาคเรียนที่ ' + i.term + '/' + i.year;
  const ann = $('#announce');
  ann.hidden = !i.announce;
  ann.textContent = i.announce ? '📢 ' + i.announce : '';
  renderStatus();
  renderClubs();
}

// นาทีที่ผ่านไปตั้งแต่โหลดข้อมูล ใช้นับถอยหลังจากเวลาของเซิร์ฟเวอร์ (ไม่พึ่งนาฬิกาเครื่อง)
function serverMinutesNow(win) {
  const [h, m] = win.time.split(':').map(Number);
  return h * 60 + m + Math.floor((Date.now() - S.loadedAt) / 60000);
}

function remainText(win) {
  const [ch, cm] = win.close.split(':').map(Number);
  const left = ch * 60 + cm - serverMinutesNow(win);
  if (left <= 0) return 'ใกล้หมดเวลา';
  return 'เหลือเวลา ' + (left >= 60 ? Math.floor(left / 60) + ' ชม. ' : '') + (left % 60) + ' นาที';
}

function renderStatus() {
  if (!S.info) return;
  const w = S.info.window;
  const el = $('#statusCard');
  if (w.isOpen) {
    el.className = 'card status open';
    el.innerHTML = '<span class="dot"></span><div><b>เปิดให้เช็คชื่อ · สัปดาห์ที่ ' + w.week + (w.week === S.info.weeks ? ' (ส่งผล ผ/มผ)' : '') +
      '</b><div class="muted small">' + thDate(w.weekDate, true) + ' · ' + w.open + '–' + w.close + ' น. · ' +
      (w.mode === 'เปิดตลอด' ? 'แอดมินเปิดไว้ตลอด' : remainText(w)) + '</div></div>';
  } else {
    el.className = 'card status closed';
    el.innerHTML = '<span class="dot"></span><div><b>ยังไม่เปิดให้เช็คชื่อ</b><div class="muted small">' + esc(w.reason) +
      (w.next ? '<br>ครั้งถัดไป: ' + thDate(w.next, true) + ' เวลา ' + w.open + ' น.' : '') + '</div></div>';
  }
}

function renderClubs() {
  if (!S.info) return;
  const q = $('#search').value.trim().toLowerCase();
  const mine = store('lastClub');
  const list = S.info.clubs
    .filter(c => !q || (c.name + ' ' + c.teachers.join(' ')).toLowerCase().includes(q))
    .sort((a, b) => (b.no === mine) - (a.no === mine) || a.no.localeCompare(b.no));
  const grid = $('#clubGrid');
  if (!list.length) { grid.innerHTML = '<div class="empty">ไม่พบชุมนุมที่ค้นหา</div>'; return; }
  grid.innerHTML = list.map(c => '<button class="club' + (c.no === mine ? ' mine' : '') + '" data-no="' + c.no + '">' +
    '<span class="ic">' + c.icon + '</span><span style="flex:1;min-width:0">' +
    '<span class="no">ชุมนุมที่ ' + Number(c.no) + (c.no === mine ? ' · ชุมนุมของฉัน' : '') + '</span>' +
    '<span class="nm" style="display:block">' + esc(c.name) + '</span>' +
    '<span class="tc" style="display:block">' + esc(c.teachers.join(', ')) + '</span>' +
    '<span class="meta"><span class="chip gray">' + c.count + ' รูป</span>' +
    (c.submitted ? '<span class="chip ok">✓ ส่งสัปดาห์นี้แล้ว</span>' : '') + '</span></span></button>').join('');
  $$('.club', grid).forEach(b => b.addEventListener('click', () => askCode(b.dataset.no)));
}

function askCode(no) {
  S.club = S.info.clubs.find(c => c.no === no);
  $('#mCodeIc').textContent = S.club.icon;
  $('#mCodeName').textContent = S.club.name;
  $('#mCodeTc').textContent = S.club.teachers.join(', ');
  $('#codeInput').value = '';
  $('#codeErr').textContent = '';
  openModal('#mCode');
  setTimeout(() => $('#codeInput').focus(), 50);
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
  } finally {
    busy(btn, false);
  }
}

function goHome() {
  S.data = null;
  S.code = '';
  $('#viewCheck').hidden = true;
  $('#bottomBar').hidden = true;
  $('#viewClubs').hidden = false;
  window.scrollTo(0, 0);
  API.call('info').then(i => { S.info = i; S.loadedAt = Date.now(); renderHome(); }).catch(() => {});
}

/* ============================ หน้าเช็คชื่อ ============================ */

function draftKey() { return 'draft:' + S.data.club.no + ':' + S.data.active.week; }

function showCheck(data) {
  S.data = data;
  S.marks = {};
  S.mode = '';
  const a = data.active;
  if (a) {
    const wk = a.week - 1;
    const prev = {};
    data.students.forEach(st => { const v = (data.marks[st.id] || [])[wk]; if (v) prev[st.id] = v; });
    const draft = store(draftKey());
    if (data.mode === 'grade') {
      S.mode = 'grade';
      S.marks = Object.assign({}, prev, draft && draft.marks);
    } else if (draft && draft.mode) {
      S.mode = draft.mode;
      S.marks = draft.marks || {};
    } else if (Object.keys(prev).length) {
      S.marks = prev;
      S.mode = Object.values(prev).includes('0') ? 'part' : 'full';
    }
  }
  $('#viewClubs').hidden = true;
  $('#viewCheck').hidden = false;
  renderCheck();
  window.scrollTo(0, 0);
}

function renderCheck() {
  const d = S.data, c = d.club, a = d.active, r = d.rights;
  const view = $('#viewCheck');
  let html = '<div><button class="btn ghost sm" id="btnBack">← เลือกชุมนุมอื่น</button></div>' +
    '<div class="card club-head"><div class="ic">' + c.icon + '</div><div style="flex:1;min-width:0"><h2>' + esc(c.name) + '</h2>' +
    '<div class="muted small">' + esc(c.teachers.join(', ')) + (c.place ? ' · ' + esc(c.place) : '') + '</div>' +
    '<div class="muted small">สมาชิก ' + d.students.length + ' รูป</div></div></div>';

  if (!a) {
    html += '<div class="card"><b>ขณะนี้ยังไม่เปิดให้เช็คชื่อ</b><div class="muted">' + esc(d.window.reason) +
      (d.window.next ? '<br>ครั้งถัดไป: ' + thDate(d.window.next, true) + ' เวลา ' + d.window.open + '–' + d.window.close + ' น.' : '') +
      '</div><div class="muted small" style="margin-top:6px">ดูประวัติการเช็คชื่อย้อนหลังได้ด้านล่าง</div></div>';
  } else {
    const grade = d.mode === 'grade';
    const st = d.status[a.week];
    html += '<div class="card stack"><div class="row" style="justify-content:space-between">' +
      '<div><b style="font-size:19px">สัปดาห์ที่ ' + a.week + (grade ? ' · ส่งผลการเรียน' : '') + '</b>' +
      '<div class="muted small">' + thDate(d.sessions[a.week - 1], true) +
      (a.special ? ' · <span class="chip warn">เปิดส่งพิเศษถึง ' + thStamp(a.until) + '</span>' : '') + '</div></div>' +
      rightsChip(r) + '</div>' +
      (st ? '<div class="muted small">ส่งล่าสุด ' + thStamp(st.last) + (st.by ? ' โดย ' + esc(st.by) : '') + '</div>' : '') + '</div>';

    if (!r.canSubmit) {
      html += '<div class="card"><b>🔒 สัปดาห์นี้ส่งและแก้ไขครบแล้ว</b><div class="muted">หากต้องการแก้ไขอีก กรุณาติดต่อหัวหน้ากิจกรรมพัฒนาผู้เรียน</div></div>';
    } else {
      html += '<div class="card"><label class="f" for="byName">ผู้เช็คชื่อ</label>' +
        '<input class="input" id="byName" placeholder="เช่น อ.รุ่งทิวา หรือ หัวหน้าชุมนุม สามเณร…" value="' + esc(store('checkerName') || '') + '"></div>';
      if (grade) {
        html += '<div class="hint">สัปดาห์สุดท้าย: เลือกผลการเรียน <b>ผ</b> (ผ่าน) หรือ <b>มผ</b> (ไม่ผ่าน) ให้นักเรียนทุกรูป ' +
          'ระบบแสดงร้อยละการมาเรียนไว้ช่วยประกอบการตัดสิน</div>' +
          '<div class="row"><button class="btn sm" id="btnAllPass">ให้ ผ ทุกรูป</button><button class="btn sm" id="btnByPct">ผ เฉพาะรูปที่มาเรียน ≥ 80%</button></div>';
      } else {
        html += '<div class="mode-btns">' +
          '<button class="mode-btn full' + (S.mode === 'full' ? ' on' : '') + '" data-mode="full"><b>✓ ครบ</b><span>มาเรียนครบทุกรูป (เลือกรูปที่ลาได้)</span></button>' +
          '<button class="mode-btn part' + (S.mode === 'part' ? ' on' : '') + '" data-mode="part"><b>✗ ไม่ครบ</b><span>มีนักเรียนไม่เข้าเรียน</span></button></div>';
        if (S.mode) {
          html += '<div class="hint">' + (S.mode === 'full'
            ? 'ทุกรูปถูกตั้งเป็น <b>มา</b> แล้ว หากมีรูปที่ลา ให้แตะ <b>ลา</b> ที่ชื่อรูปนั้น'
            : 'แตะ <b>ขาด</b> ที่ชื่อนักเรียนที่ไม่เข้าเรียน หรือ <b>ลา</b> สำหรับรูปที่ลา') + '</div>';
        }
      }
      if (grade || S.mode) html += '<div class="card"><ul class="slist" id="slist">' + listHtml() + '</ul></div>';
    }
  }

  html += '<details class="card" id="histBox"><summary>📋 ประวัติการเช็คชื่อทุกสัปดาห์</summary><div style="margin-top:10px">' + historyHtml() + '</div></details>';
  view.innerHTML = html;

  $('#btnBack').addEventListener('click', () => history.back());
  $$('.mode-btn', view).forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  const by = $('#byName');
  if (by) by.addEventListener('change', () => store('checkerName', by.value.trim()));
  if ($('#btnAllPass')) $('#btnAllPass').addEventListener('click', () => { d.students.forEach(s => { S.marks[s.id] = 'ผ'; }); refreshList(); });
  if ($('#btnByPct')) $('#btnByPct').addEventListener('click', () => {
    d.students.forEach(s => { const p = attendance(s.id).pct; S.marks[s.id] = p === null || p >= 80 ? 'ผ' : 'มผ'; });
    refreshList();
  });
  bindList();
  updateBar();
}

function rightsChip(r) {
  if (!r) return '';
  if (!r.canSubmit) return '<span class="chip bad">ล็อกแล้ว</span>';
  if (r.count === 0) return '<span class="chip warn">ยังไม่ส่ง</span>';
  return '<span class="chip ok">ส่งแล้ว · แก้ได้อีก ' + r.editsLeft + ' ครั้ง</span>';
}

function options() {
  if (S.mode === 'grade') return ['ผ', 'มผ'];
  return S.mode === 'full' ? ['1', 'ล'] : ['1', 'ล', '0'];
}

function attendance(id) {
  const m = S.data.marks[id] || [];
  let p = 0, l = 0, a = 0;
  for (let i = 0; i < S.data.weeks - 1; i++) { if (m[i] === '1') p++; else if (m[i] === 'ล') l++; else if (m[i] === '0') a++; }
  const held = p + l + a;
  return { p, l, a, held, pct: held ? Math.round(p / held * 100) : null };
}

function listHtml() {
  const opts = options();
  return S.data.students.map((s, i) => {
    const v = S.marks[s.id] || '';
    let sub = esc(s.cls);
    if (S.mode === 'grade') {
      const at = attendance(s.id);
      sub += ' · มา ' + at.p + '/' + at.held + (at.pct !== null ? ' (' + at.pct + '%)' : '');
      if (at.pct !== null && at.pct < 80) sub += ' <span class="chip bad">ต่ำกว่า 80%</span>';
    }
    return '<li class="srow is-' + v + '" data-id="' + esc(s.id) + '"><span class="n">' + (i + 1) + '</span>' +
      '<span class="who"><b>' + esc(s.name) + '</b><small>' + sub + '</small></span>' +
      '<span class="seg">' + opts.map(o => '<button type="button" data-v="' + o + '" class="' + (v === o ? 'on' : '') + '">' + MARK_LABEL[o] + '</button>').join('') +
      '</span></li>';
  }).join('');
}

function bindList() {
  $$('#slist .srow').forEach(li => {
    $$('.seg button', li).forEach(b => b.addEventListener('click', () => {
      S.marks[li.dataset.id] = b.dataset.v;
      li.className = 'srow is-' + b.dataset.v;
      $$('.seg button', li).forEach(x => x.classList.toggle('on', x === b));
      saveDraft();
      updateBar();
    }));
  });
}

function refreshList() {
  const ul = $('#slist');
  if (ul) { ul.innerHTML = listHtml(); bindList(); }
  saveDraft();
  updateBar();
}

function setMode(mode) {
  if (mode === 'full') {
    // ครบ: ทุกรูปมา ยกเว้นรูปที่เลือกลาไว้แล้ว
    S.data.students.forEach(s => { S.marks[s.id] = S.marks[s.id] === 'ล' ? 'ล' : '1'; });
  } else {
    S.data.students.forEach(s => { if (!S.marks[s.id]) S.marks[s.id] = '1'; });
  }
  S.mode = mode;
  saveDraft();
  renderCheck();
  const list = $('#slist');
  if (list) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function saveDraft() {
  if (S.data && S.data.active) store(draftKey(), { mode: S.mode, marks: S.marks });
}

function tally() {
  const t = { '1': 0, 'ล': 0, '0': 0, 'ผ': 0, 'มผ': 0, missing: 0 };
  S.data.students.forEach(s => { const v = S.marks[s.id]; if (v && options().includes(v)) t[v]++; else t.missing++; });
  return t;
}

function updateBar() {
  const d = S.data;
  const show = d && d.active && d.rights.canSubmit && (S.mode === 'grade' || S.mode);
  $('#bottomBar').hidden = !show;
  if (!show) return;
  const t = tally();
  $('#tally').innerHTML = S.mode === 'grade'
    ? '<span class="chip ok">ผ ' + t['ผ'] + '</span><span class="chip bad">มผ ' + t['มผ'] + '</span>'
    : '<span class="chip ok">มา ' + t['1'] + '</span><span class="chip warn">ลา ' + t['ล'] + '</span><span class="chip bad">ขาด ' + t['0'] + '</span>';
  if (t.missing) $('#tally').innerHTML += '<span class="chip gray">ยังไม่เลือก ' + t.missing + '</span>';
  $('#btnReview').disabled = t.missing > 0;
}

function historyHtml() {
  const d = S.data;
  if (!d.students.length) return '<div class="empty">ยังไม่มีรายชื่อนักเรียน</div>';
  let h = '<div class="hist-wrap"><table class="hist"><thead><tr><th>ชื่อ</th>';
  for (let w = 1; w <= d.weeks; w++) h += '<th title="' + thDate(d.sessions[w - 1]) + '">' + (w === d.weeks ? 'ผล' : 'ส.' + w) + '</th>';
  h += '</tr></thead><tbody>';
  d.students.forEach(s => {
    h += '<tr><td>' + esc(s.name) + '</td>';
    const m = d.marks[s.id] || [];
    for (let w = 0; w < d.weeks; w++) { const v = m[w] || ''; h += '<td class="m-' + v + '">' + MARK_LABEL[v] + '</td>'; }
    h += '</tr>';
  });
  return h + '</tbody></table></div><div class="muted small" style="margin-top:6px">มา = มาเรียน · ลา = ลา · ขาด = ไม่เข้าเรียน · ผล = ผ/มผ</div>';
}

/* ============================ ยืนยันและส่ง ============================ */

function openConfirm() {
  const d = S.data, t = tally(), grade = S.mode === 'grade';
  const by = $('#byName') ? $('#byName').value.trim() : '';
  if (!by) { toast('กรุณาใส่ชื่อผู้เช็คชื่อ', 'bad'); $('#byName').focus(); return; }
  store('checkerName', by);
  $('#cfWhere').textContent = d.club.name + ' · สัปดาห์ที่ ' + d.active.week + ' · ' + thDate(d.sessions[d.active.week - 1], true);
  $('#cfSum').innerHTML = grade
    ? '<div class="ok"><b>' + t['ผ'] + '</b>ผ่าน (ผ)</div><div class="bad"><b>' + t['มผ'] + '</b>ไม่ผ่าน (มผ)</div><div><b>' + d.students.length + '</b>ทั้งหมด</div>'
    : '<div class="ok"><b>' + t['1'] + '</b>มา</div><div class="warn"><b>' + t['ล'] + '</b>ลา</div><div class="bad"><b>' + t['0'] + '</b>ขาด</div>';
  const names = v => d.students.filter(s => S.marks[s.id] === v).map(s => esc(s.name) + ' (' + esc(s.cls) + ')');
  let nh = '';
  if (grade) {
    const f = names('มผ');
    nh = f.length ? '<div class="namebox"><b>ไม่ผ่าน (มผ):</b><br>' + f.join('<br>') + '</div>' : '';
  } else {
    const l = names('ล'), a = names('0');
    if (l.length) nh += '<div class="namebox"><b>ลา ' + l.length + ' รูป:</b><br>' + l.join('<br>') + '</div>';
    if (a.length) nh += '<div class="namebox" style="margin-top:8px"><b>ขาด ' + a.length + ' รูป:</b><br>' + a.join('<br>') + '</div>';
  }
  $('#cfNames').innerHTML = nh;
  const r = d.rights;
  $('#cfRights').innerHTML = r.count === 0
    ? 'หลังส่งแล้ว แก้ไขได้อีก <b>1 ครั้ง</b> ภายในช่วงเวลาที่เปิด'
    : r.editsLeft <= 1
      ? 'นี่คือการ<b>แก้ไขครั้งสุดท้าย</b> หลังส่งแล้วจะแก้ไม่ได้อีก กรุณาตรวจให้ถูกต้อง'
      : 'นี่คือการ<b>แก้ไข</b> หลังส่งแล้วจะเหลือสิทธิ์แก้ไขอีก <b>' + (r.editsLeft - 1) + ' ครั้ง</b>';
  $('#cfCode').value = '';
  $('#cfErr').textContent = '';
  openModal('#mConfirm');
  setTimeout(() => $('#cfCode').focus(), 50);
}

async function onSend(e) {
  e.preventDefault();
  const code = $('#cfCode').value.trim();
  if (code !== S.code) { $('#cfErr').textContent = 'รหัสไม่ตรงกับที่ใช้เข้าสู่ระบบ'; return; }
  const btn = $('#btnSend');
  busy(btn, true, 'กำลังส่ง…');
  try {
    const marks = {};
    S.data.students.forEach(s => { marks[s.id] = S.marks[s.id]; });
    const week = S.data.active.week;
    const data = await API.call('submit', { no: S.data.club.no, code, week, marks, by: store('checkerName') || '' });
    store(draftKey(), null);
    closeModal('#mConfirm');
    showDone(data, week);
  } catch (err) {
    $('#cfErr').textContent = err.message;
  } finally {
    busy(btn, false);
  }
}

function showDone(data, week) {
  const t = tally(), grade = S.mode === 'grade';
  S.data = data;
  $('#bottomBar').hidden = true;
  $('#viewCheck').innerHTML = '<div class="card done stack"><div class="big">✅</div><h2>ส่งเรียบร้อยแล้ว</h2>' +
    '<div class="muted">' + esc(data.club.name) + ' · สัปดาห์ที่ ' + week + '</div>' +
    '<div>' + (grade ? 'ผ ' + t['ผ'] + ' · มผ ' + t['มผ'] : 'มา ' + t['1'] + ' · ลา ' + t['ล'] + ' · ขาด ' + t['0']) + '</div>' +
    '<div>' + rightsChip(data.rights) + '</div>' +
    '<div class="row" style="justify-content:center"><button class="btn" id="btnView">ดูรายการที่ส่ง</button>' +
    '<button class="btn primary" id="btnHome">กลับหน้าแรก</button></div></div>';
  $('#btnHome').addEventListener('click', () => history.back());
  $('#btnView').addEventListener('click', () => showCheck(data));
  window.scrollTo(0, 0);
}
