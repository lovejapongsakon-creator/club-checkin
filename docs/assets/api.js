// เรียก Apps Script ด้วย POST แบบ text/plain (ไม่เกิด CORS preflight)
const API = {
  demo: !(window.CONFIG && window.CONFIG.API_URL) || /[?&]demo=1/.test(location.search),

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

// ---------- ลูกเล่นและความสะดวก ----------

// ขนาดตัวอักษร 3 ระดับ จำไว้ในเครื่อง
const FONT_SIZES = ['', 'fs-l', 'fs-xl'];
function applyFont(i) {
  document.documentElement.classList.remove('fs-l', 'fs-xl');
  if (FONT_SIZES[i]) document.documentElement.classList.add(FONT_SIZES[i]);
}
applyFont(store('fontSize') || 0);
document.addEventListener('DOMContentLoaded', () => {
  const b = $('#btnFont');
  if (b) b.addEventListener('click', () => {
    const i = ((store('fontSize') || 0) + 1) % FONT_SIZES.length;
    store('fontSize', i);
    applyFont(i);
    toast(['ตัวอักษรขนาดปกติ', 'ตัวอักษรใหญ่', 'ตัวอักษรใหญ่พิเศษ'][i]);
  });
});

// คลื่นน้ำเมื่อแตะปุ่ม
document.addEventListener('pointerdown', e => {
  const btn = e.target.closest('.btn, .mode-btn, .club');
  if (!btn || btn.disabled) return;
  const r = btn.getBoundingClientRect();
  const s = Math.max(r.width, r.height);
  const dot = document.createElement('span');
  dot.className = 'ripple';
  dot.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
  btn.appendChild(dot);
  setTimeout(() => dot.remove(), 600);
});

function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) { /* บางเครื่องไม่รองรับ */ } }

function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); buzz([30, 40, 30]); }

// ตัวเลขวิ่งขึ้น
function countUp(root) {
  $$('[data-count]', root).forEach(el => {
    const to = Number(el.dataset.count) || 0, t0 = performance.now();
    const step = t => { const p = Math.min(1, (t - t0) / 600); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

// พลุกระดาษสีฟ้า ชมพู เหลือง
function confetti() {
  const cv = $('#confetti');
  if (!cv || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  cv.hidden = false;
  const ctx = cv.getContext('2d');
  const W = cv.width = innerWidth, H = cv.height = innerHeight;
  const colors = ['#2f80ed', '#56ccf2', '#ec4899', '#f9a8d4', '#f5b700', '#ffe066'];
  const ps = Array.from({ length: 140 }, () => ({
    x: W / 2 + (Math.random() - .5) * 80, y: H * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4,
    s: 6 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, W, H);
    ps.forEach(p => {
      p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    });
    if (t - t0 < 2600) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, W, H); cv.hidden = true; }
  })(t0);
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'สวัสดีตอนเช้า' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
}

function initials(name) {
  const n = String(name).replace(/^(สามเณร|เด็กชาย|ด\.ช\.|นาย|พระ)/, '').trim().replace(/^[เแโใไ]/, '');
  return n.charAt(0) || '?';
}
