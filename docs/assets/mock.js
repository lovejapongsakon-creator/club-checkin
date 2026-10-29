// โหมดทดลอง: จำลองการทำงานของ Apps Script ในเบราว์เซอร์ (ใช้เมื่อ CONFIG.API_URL ว่าง)
// รายชื่อนักเรียนเป็นชื่อสมมติทั้งหมด
const MockAPI = (() => {
  const CLUBS = [
    ['ท่องโลกกว้างภาษาอังกฤษ', ['อ.รุ่งทิวา สุนา'], 'วิชาการ'],
    ['ปวธ.', ['พระอนุรักษ์ อภิธมฺโม'], 'คุณธรรม'],
    ['ใบเลี้ยงเดี่ยว', ['พระสุวิจักขณ์ ปวิจกฺขโณ'], 'อื่นๆ'],
    ['นวดแผนไทย', ['อ.จิณห์ศศิโสม คล้อยอรุณ', 'อ.แวว อาจหินกอง'], 'อื่นๆ'],
    ['ออกเสียงชัด ฝึกหัดได้', ['อ.ณัฐสรณ์ ชูเดช', 'อ.วิทวัส ทองมะค่า'], 'วิชาการ'],
    ['บาลีรู้ธรรมนำโชค', ['พระมหาขวัญพัฒน์ ขนฺติธมฺโม'], 'อื่นๆ'],
    ['FitBody', ['พระวิรัตน์ อภิรตโน', 'พระวรากร ปานเมือง'], 'กีฬา'],
    ['วาดภาพ', ['อ.ทวี ตั้งวณิชมงคล'], 'ศิลปะ'],
    ['คำคมคำกลอน', ['อ.ณัฐเมศร์ สว่างแก้วภาณุวงศ์'], 'วิชาการ'],
    ['Endo', ['พระศักดา อภิฐาโน', 'อ.ฉัตรกุล บุรณศิริ'], 'วิชาการ'],
    ['ปวธ. Live Studio', ['สามเณรปรินทร เผ่ามีสุข'], 'เทคโนโลยี'],
    ['คัดลายมือ', ['อ.บุญฤทธิ์'], 'อื่นๆ'],
    ['เด็กอิ้ง', ['พระครูสมุห์บุญเนาว์ การกปุญฺโญ'], 'วิชาการ'],
    ['คอมพิวเตอร์เบื้องต้น', ['พระทองสวน ธนลาโภ'], 'เทคโนโลยี'],
    ['ใจของเรา', ['อ.ชมชนก ทิพย์ทอง', 'พระทวีชัย กตปุญฺโญ'], 'ศิลปะ'],
    ['เมตตาธรรม', ['พระทวีชัย กตปุญฺโญ', 'นางศดานันท์ สว่างแก้วภาณุวงศ์'], 'คุณธรรม'],
    ['วิทยากร', ['พระครูธรรมภาณโกวิท'], 'อื่นๆ'],
  ];
  const ICON = { 'วิชาการ': '📚', 'คุณธรรม': '🪷', 'กีฬา': '💪', 'ศิลปะ': '🎨', 'เทคโนโลยี': '💻', 'อื่นๆ': '✨' };
  const FIRST = ['กิตติพัฒน์', 'ชยพล', 'ณัฐวุฒิ', 'ธนกร', 'ปกรณ์', 'พีรพัฒน์', 'ภูมิพัฒน์', 'วรเมธ', 'ศุภชัย', 'อนุชา', 'ธีรเดช', 'นนทพัทธ์', 'สิรวิชญ์', 'ภาคิน'];
  const LAST = ['ตัวอย่างดี', 'สมมติสุข', 'ทดลองชัย', 'จำลองศรี', 'ใจทดสอบ', 'สาธิตกุล'];
  const DEF = [
    ['ชื่อโรงเรียน', 'school', 'โรงเรียนพระปริยัติธรรม วัดธรรมมงคล', 'แสดงบนหน้าเว็บ'],
    ['ภาคเรียน', 'term', '2', 'ใช้สร้างรหัสชุมนุมและชื่อชีตสรุป'],
    ['ปีการศึกษา', 'year', '2569', 'ใช้สร้างรหัสชุมนุมและชื่อชีตสรุป'],
    ['วันเช็คชื่อครั้งแรก', 'startDate', '2026-10-29', 'ปปปป-ดด-วว (ค.ศ.) = สัปดาห์ที่ 1'],
    ['เวลาเปิด', 'openTime', '17:10', 'ชช:นน'],
    ['เวลาปิด', 'closeTime', '20:00', 'ชช:นน'],
    ['จำนวนสัปดาห์', 'weeks', '20', 'สัปดาห์สุดท้าย = ส่งผล ผ/มผ'],
    ['โหมดระบบ', 'mode', 'เปิดตลอด', 'อัตโนมัติ / เปิดตลอด / ปิด'],
    ['วันที่งดชุมนุม', 'skipDates', '', 'คั่นด้วย ,'],
    ['ขยายเวลาปิดถึง', 'extendUntil', '', 'ปปปป-ดด-วว ชช:นน'],
    ['ร้อยละขาดที่ต้องเฝ้าระวัง', 'warnPercent', '20', ''],
    ['ข้อความประกาศ', 'announce', 'นี่คือโหมดทดลอง ลองเช็คชื่อได้ตามสบาย', ''],
  ];
  const pad2 = n => String(n).padStart(2, '0');
  const db = { settings: {}, pw: 'admin2569', clubs: [], students: [], marks: {}, status: {}, fails: {} };
  DEF.forEach(d => { db.settings[d[1]] = d[2]; });

  // สร้างข้อมูลแบบสุ่มคงที่ (seed) เพื่อให้รีเฟรชแล้วได้ชุดเดิม
  let seed = 7;
  const rnd = n => { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); };
  let sid = 70690001;
  CLUBS.forEach((c, i) => {
    db.clubs.push({ no: pad2(i + 1), name: c[0], teachers: c[1], category: c[2], place: '', icon: ICON[c[2]], code: pad2(i + 1) + '22569' });
    const n = 8 + rnd(5);
    for (let k = 0; k < n; k++) {
      db.students.push({ id: String(sid++), name: 'สามเณร' + FIRST[rnd(FIRST.length)] + ' ' + LAST[rnd(LAST.length)],
        cls: 'ม.' + (1 + rnd(6)) + '/' + (1 + rnd(3)), club: c[0], status: '' });
    }
  });

  function weeks() { return Math.max(2, parseInt(db.settings.weeks, 10) || 20); }
  function marksOf(id) {
    const N = weeks();
    if (!db.marks[id]) db.marks[id] = [];
    while (db.marks[id].length < N) db.marks[id].push('');
    return db.marks[id];
  }
  function now() {
    const p = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
    const date = p.year + '-' + p.month + '-' + p.day, time = p.hour + ':' + p.minute;
    return { date, time, stamp: date + ' ' + time };
  }
  function stampPlus(hours) {
    const d = new Date(Date.now() + hours * 3600e3 + 7 * 3600e3);
    return d.toISOString().slice(0, 10) + ' ' + d.toISOString().slice(11, 16);
  }
  function addDays(iso, n) { const t = new Date(iso + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
  function sessions() {
    const skip = String(db.settings.skipDates).split(/[,\s]+/).filter(Boolean);
    const out = [];
    for (let i = 0; out.length < weeks() && i < 300; i++) { const d = addDays(db.settings.startDate, i * 7); if (!skip.includes(d)) out.push(d); }
    return out;
  }
  function windowInfo() {
    const s = db.settings, n = now(), ses = sessions();
    let close = s.closeTime;
    const ext = String(s.extendUntil).split(' ');
    if (ext[0] === n.date && ext[1] > close) close = ext[1];
    let last = -1;
    ses.forEach((d, i) => { if (d <= n.date) last = i; });
    const ti = ses.indexOf(n.date);
    let isOpen = false, week = last + 1, reason = '';
    if (s.mode === 'ปิด') reason = 'ผู้ดูแลระบบปิดการเช็คชื่อชั่วคราว';
    else if (s.mode === 'เปิดตลอด') { isOpen = true; week = Math.max(1, last + 1); }
    else if (ti >= 0) {
      week = ti + 1;
      if (n.time >= s.openTime && n.time <= close) isOpen = true;
      else reason = n.time < s.openTime ? 'วันนี้เปิดให้เช็คชื่อเวลา ' + s.openTime + ' น.' : 'หมดเวลาเช็คชื่อของวันนี้แล้ว (ปิด ' + close + ' น.)';
    } else reason = 'เปิดให้เช็คชื่อเฉพาะวันที่มีชุมนุม เวลา ' + s.openTime + '–' + close + ' น.';
    const next = ses.find(d => d > n.date || (d === n.date && n.time < s.openTime)) || '';
    return { date: n.date, time: n.time, isOpen, week, weekDate: week ? ses[week - 1] || '' : '', totalWeeks: weeks(), open: s.openTime, close, reason, next, mode: s.mode };
  }
  const pub = c => ({ no: c.no, name: c.name, teachers: c.teachers, category: c.category, place: c.place, icon: c.icon });
  const fail = m => { throw new Error(m); };
  const findClub = no => db.clubs.find(c => c.no === pad2(Number(no))) || fail('ไม่พบชุมนุมนี้');
  const clsKey = c => { const m = c.match(/(\d+)\/(\d+)/); return m ? m[1] * 100 + +m[2] : 9999; };
  const studentsOf = c => db.students.filter(s => s.club === c.name && s.status !== 'ลาออก').sort((a, b) => clsKey(a.cls) - clsKey(b.cls) || a.id.localeCompare(b.id));
  const stOf = (c, w) => db.status[c.no + '|' + w];
  function rights(st) { const count = st ? st.count : 0, max = 2 + (st ? st.extra : 0); return { count, canSubmit: count < max, editsLeft: Math.max(0, max - Math.max(count, 1)) }; }
  function active(c, win) {
    if (win.isOpen) return { week: win.week, special: false };
    const n = now().stamp;
    let best = null;
    Object.entries(db.status).forEach(([k, st]) => { if (k.startsWith(c.no + '|') && st.until && st.until >= n && (!best || st.week > best.week)) best = { week: st.week, special: true, until: st.until }; });
    return best;
  }
  function checkCode(no, code) {
    const c = findClub(no);
    const f = db.fails[c.no] || 0;
    if (f >= 5) fail('ใส่รหัสผิดเกิน 5 ครั้ง กรุณารอ 10 นาทีแล้วลองใหม่');
    if (String(code).trim() !== c.code) { db.fails[c.no] = f + 1; fail('รหัสไม่ถูกต้อง (เหลือโอกาสอีก ' + (4 - f) + ' ครั้ง)'); }
    db.fails[c.no] = 0;
    return c;
  }
  const checkAdmin = pw => { if (pw !== db.pw) fail('รหัสแอดมินไม่ถูกต้อง'); };
  function payload(c) {
    const win = windowInfo(), a = active(c, win), studs = studentsOf(c), marks = {}, status = {};
    studs.forEach(s => { marks[s.id] = marksOf(s.id).slice(); });
    for (let w = 1; w <= weeks(); w++) { const st = stOf(c, w); if (st && st.count) status[w] = { count: st.count, last: st.last, by: st.by }; }
    return { club: pub(c), students: studs.map(s => ({ id: s.id, name: s.name, cls: s.cls })), marks, status, weeks: weeks(), sessions: sessions(),
      window: win, active: a, rights: a ? rights(stOf(c, a.week)) : null, mode: a && a.week === weeks() ? 'grade' : 'attendance' };
  }
  function apply(c, week, marks, grade) {
    const allowed = grade ? ['ผ', 'มผ'] : ['1', 'ล', '0'];
    const n = {}; allowed.forEach(x => { n[x] = 0; });
    const studs = studentsOf(c);
    studs.forEach(s => { const v = String(marks[s.id] || ''); if (!allowed.includes(v)) fail('ยังไม่ได้ระบุสถานะของ ' + s.name); n[v]++; });
    studs.forEach(s => { marksOf(s.id)[week - 1] = String(marks[s.id]); });
    return grade ? { present: n['ผ'], leave: 0, absent: n['มผ'] } : { present: n['1'], leave: n['ล'], absent: n['0'] };
  }
  function setStatus(c, w, patch) {
    const k = c.no + '|' + w;
    db.status[k] = Object.assign({ week: w, count: 0, last: '', by: '', extra: 0, until: '', present: 0, leave: 0, absent: 0 }, db.status[k], patch);
  }
  function dashboard(wp) {
    const win = windowInfo(), week = Math.min(weeks(), Math.max(1, Number(wp) || win.week || 1));
    return { settings: Object.assign({}, db.settings, { weeks: weeks() }), settingsDef: DEF.map(d => ({ label: d[0], key: d[1], desc: d[3] })),
      modes: ['อัตโนมัติ', 'เปิดตลอด', 'ปิด'], window: win, week, weeks: weeks(), sessions: sessions(), sheetUrl: '#', summaryName: 'สรุปเช็คชื่อ ' + db.settings.term + '/' + db.settings.year,
      now: now().stamp, clubs: db.clubs.map(c => { const st = stOf(c, week) || null; return Object.assign(pub(c), { code: c.code, count: studentsOf(c).length, rights: rights(st), status: st }); }) };
  }

  const H = {
    info() {
      const win = windowInfo();
      return { school: db.settings.school, term: db.settings.term, year: db.settings.year, announce: db.settings.announce, weeks: weeks(), window: win,
        clubs: db.clubs.map(c => { const st = stOf(c, win.week); return Object.assign(pub(c), { count: studentsOf(c).length, submitted: !!(st && st.count) }); }) };
    },
    login: p => payload(checkCode(p.no, p.code)),
    submit(p) {
      const c = checkCode(p.no, p.code), win = windowInfo(), a = active(c, win);
      if (!a) fail('ขณะนี้ไม่อยู่ในช่วงเวลาเช็คชื่อ');
      if (Number(p.week) !== a.week) fail('สัปดาห์ไม่ตรงกับที่เปิดให้เช็คชื่อ กรุณาโหลดหน้าใหม่');
      const st = stOf(c, a.week);
      if (!rights(st).canSubmit) fail('สัปดาห์นี้ส่งและแก้ไขครบแล้ว');
      const t = apply(c, a.week, p.marks || {}, a.week === weeks());
      setStatus(c, a.week, Object.assign({ count: (st ? st.count : 0) + 1, last: now().stamp, by: p.by }, t));
      return payload(c);
    },
    adminDashboard: p => { checkAdmin(p.pw); return dashboard(p.week); },
    adminSaveSettings(p) { checkAdmin(p.pw); Object.assign(db.settings, p.values); return dashboard(p.week); },
    adminGrant(p) {
      checkAdmin(p.pw);
      const c = findClub(p.no), w = Number(p.week), st = stOf(c, w) || {};
      if (p.kind === 'edit') setStatus(c, w, { extra: (st.extra || 0) + 1 });
      else if (p.kind === 'open') setStatus(c, w, { until: stampPlus(Number(p.hours) || 24) });
      else setStatus(c, w, { until: '' });
      return dashboard(w);
    },
    adminClub(p) {
      checkAdmin(p.pw);
      const c = findClub(p.no), d = payload(c), status = {};
      for (let w = 1; w <= weeks(); w++) { const st = stOf(c, w); if (st) status[w] = st; }
      return { club: d.club, students: d.students, marks: d.marks, status, weeks: weeks(), sessions: sessions() };
    },
    adminSaveMarks(p) {
      checkAdmin(p.pw);
      const c = findClub(p.no), w = Number(p.week), st = stOf(c, w);
      const t = apply(c, w, p.marks || {}, w === weeks());
      setStatus(c, w, Object.assign({ count: Math.max(1, st ? st.count : 0), last: now().stamp, by: st && st.by ? st.by : 'แอดมิน' }, t));
      return H.adminClub(p);
    },
    adminClearWeek(p) {
      checkAdmin(p.pw);
      const w = Number(p.week);
      const clubs = p.no === 'all' ? db.clubs : [findClub(p.no)];
      clubs.forEach(c => {
        db.students.filter(s => s.club === c.name).forEach(s => { marksOf(s.id)[w - 1] = ''; });
        delete db.status[c.no + '|' + w];
      });
      return dashboard(w);
    },
    adminStudents: p => { checkAdmin(p.pw); return { students: db.students.map(s => Object.assign({}, s)), clubs: db.clubs.map(c => c.name) }; },
    adminSetStudent(p) {
      checkAdmin(p.pw);
      const s = db.students.find(x => x.id === p.id) || fail('ไม่พบนักเรียน');
      if ('status' in p) s.status = p.status;
      if ('club' in p) s.club = p.club;
      return H.adminStudents(p);
    },
    adminSetCode(p) {
      checkAdmin(p.pw);
      if (!/^\d{4,10}$/.test(p.code)) fail('รหัสต้องเป็นตัวเลข 4–10 หลัก');
      const c = findClub(p.no);
      if (db.clubs.some(x => x !== c && x.code === p.code)) fail('รหัสนี้ซ้ำกับชุมนุมอื่น');
      c.code = p.code;
      return dashboard(p.week);
    },
    adminResetCodes(p) { checkAdmin(p.pw); db.clubs.forEach(c => { c.code = c.no + db.settings.term + db.settings.year; }); return dashboard(p.week); },
    adminRebuild: p => { checkAdmin(p.pw); return dashboard(p.week); },
    adminReport(p) {
      checkAdmin(p.pw);
      const N = weeks();
      const rows = db.students.filter(s => s.club).map(s => {
        const m = marksOf(s.id);
        let pr = 0, l = 0, a = 0;
        for (let i = 0; i < N - 1; i++) { if (m[i] === '1') pr++; else if (m[i] === 'ล') l++; else if (m[i] === '0') a++; }
        const held = pr + l + a;
        return { club: s.club, name: s.name, cls: s.cls, id: s.id, present: pr, leave: l, absent: a, pct: held ? Math.round(pr / held * 100) : null, grade: m[N - 1] || '' };
      });
      return { rows, warnPercent: Number(db.settings.warnPercent) || 20, weeks: N };
    },
    adminChangePw(p) { checkAdmin(p.pw); if (String(p.newPw).length < 6) fail('รหัสแอดมินใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร'); db.pw = p.newPw; return { ok: true }; },
  };

  return {
    async call(action, p) {
      await new Promise(r => setTimeout(r, 250));
      if (!H[action]) fail('ไม่รู้จักคำสั่ง: ' + action);
      return H[action](p || {});
    },
  };
})();
