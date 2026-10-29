// เรียก Apps Script ด้วย POST แบบ text/plain (ไม่เกิด CORS preflight)
const API = {
  demo: !(window.CONFIG && window.CONFIG.API_URL),

  async call(action, payload = {}) {
    if (this.demo) return MockAPI.call(action, JSON.parse(JSON.stringify(payload)));
    const body = JSON.stringify(Object.assign({ action }, payload));
    let lastErr;
    // อ่านข้อมูลลองซ้ำได้ 1 ครั้งถ้าเน็ตสะดุด ส่วนคำสั่งที่เขียนข้อมูลไม่ลองซ้ำเพื่อกันส่งซ้ำ
    const tries = /^(info|login|adminDashboard|adminClub|adminStudents|adminReport)$/.test(action) ? 2 : 1;
    for (let i = 0; i < tries; i++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 30000);
        const res = await fetch(window.CONFIG.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body,
          redirect: 'follow',
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        const json = await res.json();
        if (!json.ok) throw Object.assign(new Error(json.error), { server: true });
        return json.data;
      } catch (err) {
        if (err.server) throw err;
        lastErr = new Error(err.name === 'AbortError'
          ? 'เชื่อมต่อนานเกินไป กรุณาลองใหม่อีกครั้ง'
          : 'เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
      }
    }
    throw lastErr;
  },
};

// ---------- ตัวช่วยที่ใช้ร่วมกันทั้งหน้าครูและหน้าแอดมิน ----------
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

function thDate(iso, withDay) {
  if (!iso) return '-';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const day = TH_DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return (withDay ? 'วัน' + day + 'ที่ ' : '') + d + ' ' + TH_MONTHS[m - 1] + ' ' + (y + 543);
}

function thStamp(stamp) {
  if (!stamp) return '-';
  return thDate(stamp) + ' ' + stamp.slice(11, 16) + ' น.';
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

function store(key, val) {
  try {
    if (val === undefined) return JSON.parse(localStorage.getItem(key));
    if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val));
  } catch (e) { return null; }
}

let toastTimer;
function toast(msg, kind) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show ' + (kind || '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3500);
}

function openModal(id) { $(id).hidden = false; document.body.classList.add('noscroll'); }
function closeModal(id) { $(id).hidden = true; document.body.classList.remove('noscroll'); }

function busy(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.innerHTML; btn.innerHTML = '<span class="spin"></span>' + (label || 'กำลังดำเนินการ…'); btn.disabled = true; }
  else { btn.innerHTML = btn.dataset.label || btn.innerHTML; btn.disabled = false; }
}

const MARK_LABEL = { '1': 'มา', 'ล': 'ลา', '0': 'ขาด', 'ผ': 'ผ', 'มผ': 'มผ', '': '–' };
