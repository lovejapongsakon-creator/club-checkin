// หลังบ้านสำหรับหัวหน้ากิจกรรมพัฒนาผู้เรียน
const A = {
  pw: '',
  dash: null,       // ข้อมูลภาพรวมล่าสุด
  tab: 'overview',
  filter: 'all',
  students: null,
  report: null,
  club: null,       // ข้อมูลชุมนุมที่เปิดใน modal
  clubMarks: {},
};

(function init() {
  if (API.demo) $('#demoBar').hidden = false;
  $$('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.close)));
  $('#formLogin').addEventListener('submit', onLogin);
  $$('#tabs button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  $('#mcWeek').addEventListener('change', renderClubModal);
  $('#mcSave').addEventListener('click', saveClubMarks);
  $('#mcAll').addEventListener('click', () => {
    const v = Number($('#mcWeek').value) === A.club.weeks ? 'ผ' : '1';
    A.club.students.forEach(s => { A.clubMarks[s.id] = v; });
    renderClubList();
  });
  try { A.pw = sessionStorage.getItem('adminPw') || ''; } catch (e) { A.pw = ''; }
  if (A.pw) login(A.pw, true);
})();

async function call(action, payload) {
  try {
    return await API.call(action, Object.assign({ pw: A.pw }, payload || {}));
  } catch (err) {
    if (/รหัสแอดมิน/.test(err.message)) logout();
    throw err;
  }
}

async function onLogin(e) {
  e.preventDefault();
  await login($('#pw').value, false);
}

async function login(pw, silent) {
  const btn = $('#btnLogin');
  busy(btn, true, 'กำลังตรวจสอบ…');
  try {
    A.pw = pw;
    A.dash = await API.call('adminDashboard', { pw });
    try { sessionStorage.setItem('adminPw', pw); } catch (e) { /* ไม่มี storage ก็ใช้ต่อได้ */ }
    $('#viewLogin').hidden = true;
    $('#viewAdmin').hidden = false;
    render();
  } catch (err) {
    A.pw = '';
    if (!silent) $('#loginErr').textContent = err.message;
  } finally {
    busy(btn, false);
  }
}

function logout() {
  A.pw = '';
  try { sessionStorage.removeItem('adminPw'); } catch (e) { /* ignore */ }
  $('#viewAdmin').hidden = true;
  $('#viewLogin').hidden = false;
}

function switchTab(tab) {
  A.tab = tab;
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  render();
}

function render() {
  const body = $('#tabBody');
  ({ overview: renderOverview, settings: renderSettings, codes: renderCodes, students: renderStudents,
    report: renderReport, tools: renderTools })[A.tab](body);
}

async function act(btn, fn, okMsg) {
  busy(btn, true);
  try {
    await fn();
    if (okMsg) toast(okMsg, 'ok');
  } catch (err) {
    toast(err.message, 'bad');
  } finally {
    busy(btn, false);
  }
}

/* ============================== ภาพรวม ============================== */

function renderOverview(body) {
  const d = A.dash, w = d.window;
  const isGrade = d.week === d.weeks;
  const sent = d.clubs.filter(c => c.status && c.status.count);
  const sum = k => sent.reduce((n, c) => n + (c.status[k] || 0), 0);
  let weekOpts = '';
  for (let i = 1; i <= d.weeks; i++) {
    weekOpts += '<option value="' + i + '"' + (i === d.week ? ' selected' : '') + '>สัปดาห์ที่ ' + i + ' · ' + thDate(d.sessions[i - 1]) + (i === d.weeks ? ' (ผล)' : '') + '</option>';
  }
  const clubs = d.clubs.filter(c => A.filter === 'all' || !(c.status && c.status.count));
  body.innerHTML =
    '<div class="card status ' + (w.isOpen ? 'open' : 'closed') + '"><span class="dot"></span><div><b>' +
    (w.isOpen ? 'ระบบเปิดอยู่ · สัปดาห์ที่ ' + w.week : 'ระบบปิดอยู่') + '</b><div class="muted small">' +
    'โหมด: ' + esc(w.mode) + ' · เวลา ' + w.open + '–' + w.close + ' น.' + (w.reason ? ' · ' + esc(w.reason) : '') +
    ' · ข้อมูล ณ ' + thStamp(d.now) + '</div></div></div>' +
    '<div class="row"><select class="input" id="ovWeek" style="flex:1;min-width:220px">' + weekOpts + '</select>' +
    '<button class="btn" id="ovRefresh">↻ รีเฟรช</button></div>' +
    '<div class="kpis">' +
    '<div class="kpi"><b>' + sent.length + '/' + d.clubs.length + '</b><span>ชุมนุมที่ส่งแล้ว</span></div>' +
    (isGrade
      ? '<div class="kpi"><b style="color:var(--ok)">' + sum('present') + '</b><span>ผ (ผ่าน)</span></div><div class="kpi"><b style="color:var(--bad)">' + sum('absent') + '</b><span>มผ (ไม่ผ่าน)</span></div>'
      : '<div class="kpi"><b style="color:var(--ok)">' + sum('present') + '</b><span>มา</span></div><div class="kpi"><b style="color:var(--warn)">' + sum('leave') + '</b><span>ลา</span></div><div class="kpi"><b style="color:var(--bad)">' + sum('absent') + '</b><span>ขาด</span></div>') +
    '</div>' +
    '<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:4px"><b>รายชุมนุม</b>' +
    '<div class="seg"><button data-f="all" class="' + (A.filter === 'all' ? 'on' : '') + '" style="min-width:70px">ทั้งหมด</button>' +
    '<button data-f="pending" class="' + (A.filter === 'pending' ? 'on' : '') + '" style="min-width:90px">ยังไม่ส่ง</button></div></div>' +
    (clubs.length ? clubs.map(clubRowHtml).join('') : '<div class="empty">ทุกชุมนุมส่งครบแล้ว 🎉</div>') + '</div>';

  $('#ovWeek').addEventListener('change', e => act(null, async () => { A.dash = await call('adminDashboard', { week: e.target.value }); render(); }));
  $('#ovRefresh').addEventListener('click', e => act(e.currentTarget, async () => { A.dash = await call('adminDashboard', { week: A.dash.week }); render(); }, 'อัปเดตแล้ว'));
  $$('[data-f]', body).forEach(b => b.addEventListener('click', () => { A.filter = b.dataset.f; render(); }));
  $$('[data-act]', body).forEach(b => b.addEventListener('click', () => clubAction(b)));
}

function clubRowHtml(c) {
  const st = c.status, d = A.dash, isGrade = d.week === d.weeks;
  let chip, line = '';
  if (st && st.count) {
    chip = '<span class="chip ok">ส่งแล้ว ' + st.count + ' ครั้ง</span>';
    line = (isGrade ? 'ผ ' + st.present + ' · มผ ' + st.absent : 'มา ' + st.present + ' · ลา ' + st.leave + ' · ขาด ' + st.absent) +
      ' · ' + thStamp(st.last) + (st.by ? ' · ' + esc(st.by) : '');
  } else {
    chip = '<span class="chip warn">ยังไม่ส่ง</span>';
  }
  const openUntil = st && st.until && st.until >= d.now;
  return '<div class="adm-club"><div class="info"><b>' + c.icon + ' ' + Number(c.no) + '. ' + esc(c.name) + '</b> ' + chip +
    (openUntil ? ' <span class="chip">เปิดพิเศษถึง ' + thStamp(st.until) + '</span>' : '') +
    (st && st.extra ? ' <span class="chip gray">แก้เพิ่ม +' + st.extra + '</span>' : '') +
    '<div class="muted small">' + esc(c.teachers.join(', ')) + ' · ' + c.count + ' รูป</div>' +
    (line ? '<div class="small">' + line + '</div>' : '') + '</div>' +
    '<div class="acts"><button class="btn sm" data-act="view" data-no="' + c.no + '">ดู/แก้ไข</button>' +
    (st && st.count ? '<button class="btn sm" data-act="edit" data-no="' + c.no + '">+ สิทธิ์แก้ไข</button>' : '') +
    (openUntil
      ? '<button class="btn sm danger" data-act="close" data-no="' + c.no + '">ยกเลิกเปิดพิเศษ</button>'
      : '<button class="btn sm" data-act="open" data-no="' + c.no + '">เปิดส่งย้อนหลัง</button>') +
    '</div></div>';
}

function clubAction(btn) {
  const no = btn.dataset.no, kind = btn.dataset.act, week = A.dash.week;
  const club = A.dash.clubs.find(c => c.no === no);
  if (kind === 'view') return openClub(no, week);
  if (kind === 'open') {
    const h = prompt('เปิดให้ "' + club.name + '" ส่งสัปดาห์ที่ ' + week + ' นอกเวลาได้กี่ชั่วโมง?', '24');
    if (!h) return;
    return act(btn, async () => { A.dash = await call('adminGrant', { no, week, kind: 'open', hours: h }); render(); }, 'เปิดส่งพิเศษแล้ว');
  }
  const msg = kind === 'edit' ? 'ให้สิทธิ์แก้ไขเพิ่ม 1 ครั้ง' : 'ยกเลิกการเปิดส่งพิเศษ';
  if (!confirm(msg + '\n' + club.name + ' · สัปดาห์ที่ ' + week + ' ?')) return;
  act(btn, async () => { A.dash = await call('adminGrant', { no, week, kind }); render(); }, 'เรียบร้อย');
}

/* ============================ ดู/แก้ข้อมูลชุมนุม ============================ */

async function openClub(no, week) {
  try {
    A.club = await call('adminClub', { no });
  } catch (err) { toast(err.message, 'bad'); return; }
  let opts = '';
  for (let i = 1; i <= A.club.weeks; i++) opts += '<option value="' + i + '"' + (i === week ? ' selected' : '') + '>สัปดาห์ที่ ' + i + ' · ' + thDate(A.club.sessions[i - 1]) + (i === A.club.weeks ? ' (ผล)' : '') + '</option>';
  $('#mcWeek').innerHTML = opts;
  $('#mcTitle').textContent = A.club.club.icon + ' ' + A.club.club.name;
  renderClubModal();
  openModal('#mClub');
}

function renderClubModal() {
  const w = Number($('#mcWeek').value);
  A.clubMarks = {};
  A.club.students.forEach(s => { const v = (A.club.marks[s.id] || [])[w - 1]; if (v) A.clubMarks[s.id] = v; });
  renderClubList();
  $('#mcHist').innerHTML = histTable(A.club);
}

function renderClubList() {
  const w = Number($('#mcWeek').value);
  const opts = w === A.club.weeks ? ['ผ', 'มผ'] : ['1', 'ล', '0'];
  const ul = $('#mcList');
  ul.innerHTML = A.club.students.length ? A.club.students.map((s, i) => {
    const v = A.clubMarks[s.id] || '';
    return '<li class="srow is-' + v + '" data-id="' + esc(s.id) + '"><span class="n">' + (i + 1) + '</span><span class="who"><b>' + esc(s.name) +
      '</b><small>' + esc(s.cls) + '</small></span><span class="seg">' +
      opts.map(o => '<button type="button" data-v="' + o + '" class="' + (v === o ? 'on' : '') + '">' + MARK_LABEL[o] + '</button>').join('') + '</span></li>';
  }).join('') : '<div class="empty">ไม่มีนักเรียน</div>';
  $$('.srow', ul).forEach(li => $$('.seg button', li).forEach(b => b.addEventListener('click', () => {
    A.clubMarks[li.dataset.id] = b.dataset.v;
    li.className = 'srow is-' + b.dataset.v;
    $$('.seg button', li).forEach(x => x.classList.toggle('on', x === b));
  })));
}

async function saveClubMarks() {
  const w = Number($('#mcWeek').value);
  const missing = A.club.students.filter(s => !A.clubMarks[s.id]).length;
  if (missing) { toast('ยังไม่ได้เลือกสถานะอีก ' + missing + ' รูป', 'bad'); return; }
  if (!confirm('บันทึกข้อมูลสัปดาห์ที่ ' + w + ' ของ ' + A.club.club.name + ' ?')) return;
  await act($('#mcSave'), async () => {
    A.club = await call('adminSaveMarks', { no: A.club.club.no, week: w, marks: A.clubMarks });
    renderClubModal();
    A.dash = await call('adminDashboard', { week: A.dash.week });
    render();
  }, 'บันทึกแล้ว');
}

function histTable(c) {
  let h = '<div class="hist-wrap"><table class="hist"><thead><tr><th>ชื่อ</th>';
  for (let w = 1; w <= c.weeks; w++) h += '<th>' + (w === c.weeks ? 'ผล' : 'ส.' + w) + '</th>';
  h += '</tr></thead><tbody>';
  c.students.forEach(s => {
    const m = c.marks[s.id] || [];
    h += '<tr><td>' + esc(s.name) + '</td>';
    for (let w = 0; w < c.weeks; w++) { const v = m[w] || ''; h += '<td class="m-' + v + '">' + MARK_LABEL[v] + '</td>'; }
    h += '</tr>';
  });
  return h + '</tbody></table></div>';
}

/* ============================== ตั้งค่า ============================== */

function renderSettings(body) {
  const d = A.dash;
  body.innerHTML = '<form class="card" id="formSet">' + d.settingsDef.map(f => {
    const v = d.settings[f.key];
    const input = f.key === 'mode'
      ? '<select class="input" name="mode">' + d.modes.map(m => '<option' + (m === v ? ' selected' : '') + '>' + m + '</option>').join('') + '</select>'
      : f.key === 'announce'
        ? '<textarea class="input" name="announce" rows="2">' + esc(v) + '</textarea>'
        : '<input class="input" name="' + f.key + '" value="' + esc(v) + '"' +
          (f.key === 'startDate' ? ' type="date"' : (f.key === 'openTime' || f.key === 'closeTime') ? ' type="time"' : '') + '>';
    return '<div class="set-row"><div><b>' + esc(f.label) + '</b><div class="muted small">' + esc(f.desc) + '</div></div>' + input + '</div>';
  }).join('') +
    '<div class="row" style="margin-top:14px"><button class="btn primary" id="btnSaveSet">บันทึกการตั้งค่า</button>' +
    '<button type="button" class="btn" id="btnExtend">ขยายเวลาวันนี้ +30 นาที</button></div></form>' +
    '<div class="card small muted">ตัวอย่างวันชุมนุม: ' + d.sessions.slice(0, 4).map(x => thDate(x)).join(', ') + ' … ' + thDate(d.sessions[d.sessions.length - 1]) +
    ' (สัปดาห์ที่ ' + d.weeks + ')</div>';

  $('#formSet').addEventListener('submit', e => {
    e.preventDefault();
    const values = {};
    new FormData(e.target).forEach((v, k) => { values[k] = String(v).trim(); });
    act($('#btnSaveSet'), async () => { A.dash = await call('adminSaveSettings', { values, week: A.dash.week }); render(); }, 'บันทึกการตั้งค่าแล้ว');
  });
  $('#btnExtend').addEventListener('click', e => {
    const w = d.window;
    const [h, m] = w.close.split(':').map(Number);
    const t = h * 60 + m + 30;
    const until = w.date + ' ' + String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
    if (!confirm('ขยายเวลาปิดของวันนี้ถึง ' + until.slice(11) + ' น. ?')) return;
    act(e.currentTarget, async () => { A.dash = await call('adminSaveSettings', { values: { extendUntil: until }, week: A.dash.week }); render(); }, 'ขยายเวลาแล้ว');
  });
}

/* ============================== รหัสชุมนุม ============================== */

function renderCodes(body) {
  const d = A.dash;
  body.innerHTML = '<div class="card"><div class="hint small" style="margin-bottom:10px">รูปแบบมาตรฐาน: เลขชุมนุม 2 หลัก + ภาคเรียน + ปีการศึกษา เช่น 01' + esc(d.settings.term) + esc(d.settings.year) +
    ' · แนะนำให้เปลี่ยนรหัสเป็นเลขสุ่มถ้ากังวลว่าจะมีคนเดารหัสได้</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>ชุมนุม</th><th>รหัส</th><th></th></tr></thead><tbody>' +
    d.clubs.map(c => '<tr><td>' + Number(c.no) + '</td><td>' + esc(c.name) + '<div class="muted small">' + esc(c.teachers.join(', ')) + '</div></td>' +
      '<td><input class="input" style="min-height:40px;width:130px" inputmode="numeric" value="' + esc(c.code) + '" data-code="' + c.no + '"></td>' +
      '<td><button class="btn sm" data-save="' + c.no + '">บันทึก</button></td></tr>').join('') +
    '</tbody></table></div><div class="row" style="margin-top:12px"><button class="btn" id="btnCopyCodes">คัดลอกรายการรหัสทั้งหมด</button>' +
    '<button class="btn danger" id="btnResetCodes">ตั้งรหัสใหม่ทั้งหมดตามรูปแบบมาตรฐาน</button></div></div>';

  $$('[data-save]', body).forEach(b => b.addEventListener('click', () => {
    const no = b.dataset.save;
    const code = $('[data-code="' + no + '"]', body).value.trim();
    act(b, async () => { A.dash = await call('adminSetCode', { no, code, week: A.dash.week }); }, 'บันทึกรหัสแล้ว');
  }));
  $('#btnResetCodes').addEventListener('click', e => {
    if (!confirm('ตั้งรหัสทุกชุมนุมใหม่ตามรูปแบบมาตรฐาน? รหัสที่แก้ไว้จะถูกแทนที่')) return;
    act(e.currentTarget, async () => { A.dash = await call('adminResetCodes', { week: A.dash.week }); render(); }, 'ตั้งรหัสใหม่แล้ว');
  });
  $('#btnCopyCodes').addEventListener('click', () => {
    const text = d.clubs.map(c => Number(c.no) + '. ' + c.name + ' : ' + c.code).join('\n');
    navigator.clipboard.writeText(text).then(() => toast('คัดลอกแล้ว นำไปวางส่งให้ครูได้เลย', 'ok'), () => toast('คัดลอกไม่สำเร็จ', 'bad'));
  });
}

/* ============================== นักเรียน ============================== */

async function renderStudents(body) {
  if (!A.students) {
    body.innerHTML = '<div class="skeleton"></div>';
    try { A.students = await call('adminStudents'); } catch (err) { body.innerHTML = '<div class="card empty">' + esc(err.message) + '</div>'; return; }
  }
  const { students, clubs } = A.students;
  const left = students.filter(s => s.status === 'ลาออก').length;
  const noClub = students.filter(s => !s.club && s.status !== 'ลาออก').length;
  body.innerHTML = '<div class="kpis"><div class="kpi"><b>' + (students.length - left) + '</b><span>นักเรียนที่เรียนอยู่</span></div>' +
    '<div class="kpi"><b>' + left + '</b><span>ลาออก</span></div><div class="kpi"><b>' + noClub + '</b><span>ไม่มีชุมนุม</span></div></div>' +
    '<input class="input" id="stSearch" type="search" placeholder="🔎 ค้นหาชื่อ รหัส ชั้น หรือชุมนุม">' +
    '<div class="card tbl-wrap"><table class="tbl"><thead><tr><th>นักเรียน</th><th>ชุมนุม</th><th>สถานะ</th></tr></thead><tbody id="stBody"></tbody></table></div>';
  const draw = () => {
    const q = $('#stSearch').value.trim().toLowerCase();
    const rows = students.filter(s => !q || (s.id + ' ' + s.name + ' ' + s.cls + ' ' + s.club).toLowerCase().includes(q)).slice(0, 200);
    $('#stBody').innerHTML = rows.map(s => '<tr><td><b>' + esc(s.name) + '</b><div class="muted small">' + esc(s.id) + ' · ' + esc(s.cls) + '</div></td>' +
      '<td><select class="input" style="min-height:38px" data-club="' + esc(s.id) + '"><option value="">— ไม่มี —</option>' +
      clubs.map(c => '<option' + (c === s.club ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></td>' +
      '<td><button class="btn sm ' + (s.status === 'ลาออก' ? 'danger' : '') + '" data-left="' + esc(s.id) + '">' + (s.status === 'ลาออก' ? 'ลาออก' : 'ปกติ') + '</button></td></tr>').join('') ||
      '<tr><td colspan="3" class="empty">ไม่พบ</td></tr>';
    $$('[data-left]').forEach(b => b.addEventListener('click', () => {
      const s = students.find(x => x.id === b.dataset.left);
      const to = s.status === 'ลาออก' ? '' : 'ลาออก';
      if (!confirm((to ? 'ทำเครื่องหมายลาออก: ' : 'ยกเลิกสถานะลาออก: ') + s.name + ' ?')) return;
      act(b, async () => { A.students = await call('adminSetStudent', { id: s.id, status: to }); renderStudents(body); }, 'บันทึกแล้ว');
    }));
    $$('[data-club]').forEach(sel => sel.addEventListener('change', () => {
      const s = students.find(x => x.id === sel.dataset.club);
      if (!confirm('ย้าย ' + s.name + ' ไปชุมนุม "' + (sel.value || 'ไม่มี') + '" ?\nผลเช็คชื่อเดิมของนักเรียนยังอยู่ครบ')) { sel.value = s.club; return; }
      act(null, async () => { A.students = await call('adminSetStudent', { id: s.id, club: sel.value }); renderStudents(body); }, 'ย้ายชุมนุมแล้ว');
    }));
  };
  $('#stSearch').addEventListener('input', draw);
  draw();
}

/* ============================== รายงาน ============================== */

async function renderReport(body) {
  body.innerHTML = '<div class="skeleton"></div>';
  try { A.report = await call('adminReport'); } catch (err) { body.innerHTML = '<div class="card empty">' + esc(err.message) + '</div>'; return; }
  const r = A.report;
  const warn = r.rows.filter(x => x.absent + x.leave + x.present > 0 && (100 - x.pct) >= r.warnPercent && x.absent > 0)
    .sort((a, b) => a.pct - b.pct);
  const byClub = {};
  r.rows.forEach(x => {
    const c = byClub[x.club] || (byClub[x.club] = { n: 0, pass: 0, fail: 0, pct: [] });
    c.n++; if (x.grade === 'ผ') c.pass++; if (x.grade === 'มผ') c.fail++; if (x.pct !== null) c.pct.push(x.pct);
  });
  body.innerHTML = '<div class="card"><div class="row" style="justify-content:space-between"><b>⚠️ นักเรียนที่ขาด/ลาเกิน ' + r.warnPercent + '%</b>' +
    '<button class="btn sm" id="btnCsv">ดาวน์โหลด CSV ทั้งหมด</button></div>' +
    (warn.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>นักเรียน</th><th>ชุมนุม</th><th>มา</th><th>ลา</th><th>ขาด</th><th>%มา</th></tr></thead><tbody>' +
      warn.map(x => '<tr><td>' + esc(x.name) + '<div class="muted small">' + esc(x.cls) + '</div></td><td>' + esc(x.club) + '</td><td>' + x.present + '</td><td>' + x.leave +
        '</td><td style="color:var(--bad);font-weight:700">' + x.absent + '</td><td>' + x.pct + '%</td></tr>').join('') + '</tbody></table></div>'
      : '<div class="empty">ยังไม่มีนักเรียนที่ต้องเฝ้าระวัง</div>') + '</div>' +
    '<div class="card"><b>สรุปรายชุมนุม</b><div class="tbl-wrap"><table class="tbl"><thead><tr><th>ชุมนุม</th><th>รูป</th><th>%มาเฉลี่ย</th><th>ผ</th><th>มผ</th></tr></thead><tbody>' +
    Object.keys(byClub).map(k => { const c = byClub[k]; const avg = c.pct.length ? Math.round(c.pct.reduce((a, b) => a + b, 0) / c.pct.length) + '%' : '-';
      return '<tr><td>' + esc(k) + '</td><td>' + c.n + '</td><td>' + avg + '</td><td>' + c.pass + '</td><td>' + c.fail + '</td></tr>'; }).join('') +
    '</tbody></table></div></div>';
  $('#btnCsv').addEventListener('click', () => {
    const head = ['ชุมนุม', 'ชื่อ-นามสกุล', 'ชั้น', 'รหัสประจำตัว', 'มา', 'ลา', 'ขาด', 'ร้อยละการมา', 'ผล'];
    const lines = [head].concat(r.rows.map(x => [x.club, x.name, x.cls, x.id, x.present, x.leave, x.absent, x.pct === null ? '' : x.pct, x.grade]))
      .map(row => row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'สรุปเช็คชื่อชุมนุม.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

/* ============================== เครื่องมือ ============================== */

function renderTools(body) {
  const d = A.dash;
  body.innerHTML = '<div class="card stack"><b>Google Sheet</b><div class="muted small">ตารางสรุปอยู่ในแผ่น "' + esc(d.summaryName) + '"</div>' +
    '<div class="row"><a class="btn" href="' + esc(d.sheetUrl) + '" target="_blank" rel="noopener">เปิด Google Sheet</a>' +
    '<button class="btn" id="btnRebuild">สร้างตารางสรุปใหม่</button></div>' +
    '<div class="muted small">ใช้หลังเพิ่ม/แก้รายชื่อนักเรียนในชีตโดยตรง ข้อมูลเช็คชื่อเดิมจะยังอยู่ครบ (จับคู่ด้วยรหัสประจำตัว)</div></div>' +
    '<form class="card stack" id="formPw"><b>เปลี่ยนรหัสแอดมิน</b>' +
    '<input class="input" type="password" id="newPw" placeholder="รหัสใหม่ (อย่างน้อย 6 ตัวอักษร)" autocomplete="new-password" required minlength="6">' +
    '<input class="input" type="password" id="newPw2" placeholder="ยืนยันรหัสใหม่" autocomplete="new-password" required>' +
    '<button class="btn primary" id="btnPw">เปลี่ยนรหัส</button></form>' +
    '<div class="card"><button class="btn danger" id="btnLogout">ออกจากระบบ</button></div>';
  $('#btnRebuild').addEventListener('click', e => act(e.currentTarget, async () => { A.dash = await call('adminRebuild', { week: d.week }); }, 'สร้างตารางสรุปใหม่แล้ว'));
  $('#formPw').addEventListener('submit', e => {
    e.preventDefault();
    const p1 = $('#newPw').value, p2 = $('#newPw2').value;
    if (p1 !== p2) { toast('รหัสใหม่ทั้งสองช่องไม่ตรงกัน', 'bad'); return; }
    act($('#btnPw'), async () => {
      await call('adminChangePw', { newPw: p1 });
      A.pw = p1;
      try { sessionStorage.setItem('adminPw', p1); } catch (err) { /* ignore */ }
      e.target.reset();
    }, 'เปลี่ยนรหัสแอดมินแล้ว');
  });
  $('#btnLogout').addEventListener('click', logout);
}
