// أدوات عامة: تنسيق، تواريخ، بحث عربي، نوافذ، أنيميشن
const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; // نص جوه onclick
const U = {
  esc(x) { return String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); },
  fmt(n) { return Math.round(n || 0).toLocaleString('en-US'); },
  money(n) { return U.fmt(n) + ' ج'; },
  pct(a, b) { return b ? Math.round(a / b * 100) : 0; },

  // ---- التواريخ (YYYY-MM-DD بالتوقيت المحلي) ----
  dkey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  today() { return U.dkey(); },
  addDays(key, n) { const [y, m, d] = key.split('-').map(Number); return U.dkey(new Date(y, m - 1, d + n)); },
  parse(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); },
  DAYS: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  WEEK: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
  SHORT: { 'السبت': 'سبت', 'الأحد': 'أحد', 'الاثنين': 'اتنين', 'الثلاثاء': 'تلات', 'الأربعاء': 'أربع', 'الخميس': 'خميس', 'الجمعة': 'جمعة' },
  MONTHS: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  dayName(key) { return U.DAYS[U.parse(key).getDay()]; },
  short(key) { const d = U.parse(key); return d.getDate() + '/' + (d.getMonth() + 1); },
  long(key) { const d = U.parse(key); return U.dayName(key) + ' ' + d.getDate() + ' ' + U.MONTHS[d.getMonth()]; },
  monthName(m) { const [y, mm] = m.split('-').map(Number); return U.MONTHS[mm - 1] + ' ' + y; },
  addMonths(m, n) { const [y, mm] = m.split('-').map(Number); const d = new Date(y, mm - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); },
  now() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); },
  mins(t) { const m = String(t || '').match(/(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : 0; },
  // "14:30" → "2:30 م"
  t12(t) { if (!t) return '—'; const m = U.mins(t), h = Math.floor(m / 60), mm = m % 60; return ((h % 12) || 12) + ':' + String(mm).padStart(2, '0') + ' ' + (h < 12 ? 'ص' : 'م'); },
  t12s(t) { if (!t) return '—'; const m = U.mins(t), h = Math.floor(m / 60), mm = m % 60; return ((h % 12) || 12) + ':' + String(mm).padStart(2, '0'); },
  month: d => (d || U.today()).slice(0, 7),
  mRange(m) { const [y, mm] = m.split('-').map(Number); return [m + '-01', U.dkey(new Date(y, mm, 0))]; },
  inRange(d, r) { return d >= r[0] && d <= r[1]; },

  // ---- بحث عربي ----
  norm(s) {
    return String(s || '').toLowerCase().replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[ًٌٍَُِّْـ]/g, '').replace(/\s+/g, ' ').trim();
  },
  phone(p) {
    let s = String(p ?? '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '');
    if (s.length === 10 && s[0] === '1') s = '0' + s;
    if (s.startsWith('20') && s.length === 12) s = s.slice(1);
    return s;
  },
  wa(phone, text) { return 'https://wa.me/2' + U.phone(phone) + '?text=' + encodeURIComponent(text); },
  initial(n) { return (String(n || '').trim()[0] || '؟'); },

  // ---- واجهة ----
  toast(msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.innerHTML = I(kind === 'bad' ? 'alert' : 'check') + '<span>' + U.esc(msg) + '</span>';
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2300);
    setTimeout(() => el.remove(), 2700);
  },
  // نافذة: على الموبايل بتطلع من تحت، على الكمبيوتر في النص
  modal(html, opts) {
    U.close(true);
    const w = document.createElement('div');
    w.className = 'mo'; w.id = 'modal';
    w.innerHTML = '<div class="md ' + ((opts && opts.wide) ? 'wide' : '') + '"><div class="grab"></div><button class="x" onclick="U.close()" aria-label="إغلاق">' + I('x') + '</button>' + html + '</div>';
    w.addEventListener('mousedown', e => { if (e.target === w) U.close(); });
    document.body.appendChild(w);
    document.body.classList.add('lock');
    const f = w.querySelector('[autofocus]'); if (f && matchMedia('(min-width:700px)').matches) f.focus();
  },
  close(now) {
    const m = document.getElementById('modal'); if (!m) return;
    m.id = ''; document.body.classList.remove('lock');
    if (now) return m.remove();
    m.classList.add('out'); setTimeout(() => m.remove(), 220);
  },
  confirm(title, text, btn, fn) {
    U.modal('<h3>' + title + '</h3><p class="mu">' + text + '</p><div class="row2"><button class="btn ghost" onclick="U.close()">رجوع</button><button class="btn danger" id="okc">' + btn + '</button></div>');
    document.getElementById('okc').onclick = () => { U.close(); fn(); };
  },
  form(id) {
    const o = {};
    document.querySelectorAll('#' + id + ' [name]').forEach(e => {
      if (e.type === 'radio') { if (e.checked) o[e.name] = e.value; }
      else o[e.name] = e.type === 'checkbox' ? e.checked : e.value.trim();
    });
    return o;
  },
  opts(list, sel) { return list.map(x => { const v = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<option value="' + U.esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + U.esc(l) + '</option>'; }).join(''); },
  // أزرار اختيار: fn كنص بيتنادى بالقيمة
  seg(items, cur, fn, cls) { return '<div class="seg ' + (cls || '') + '">' + items.map(([v, l]) => '<button type="button" class="' + (String(v) === String(cur) ? 'on' : '') + '" onclick="(' + fn + ')(\'' + v + '\')">' + l + '</button>').join('') + '</div>'; },
  // اختيار جوه فورم (radio)
  radio(name, items, cur) { return '<div class="seg">' + items.map(([v, l]) => '<label><input type="radio" name="' + name + '" value="' + U.esc(v) + '"' + (String(v) === String(cur) ? ' checked' : '') + '><span>' + l + '</span></label>').join('') + '</div>'; },
  tgl(on, fn, label, sub) { return '<label class="tgl"><div><b>' + label + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div><input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="(' + fn + ')(this.checked)"><span></span></label>'; },
  empty(t, icon, act) { return '<div class="empty"><div class="ei">' + I(icon || 'inbox') + '</div><p>' + (t || 'مفيش بيانات لسه') + '</p>' + (act || '') + '</div>'; },

  // ---- أنيميشن: الأرقام بتعد لحد قيمتها ----
  countUp(root) {
    (root || document).querySelectorAll('[data-n]').forEach(el => {
      const to = +el.dataset.n, suf = el.dataset.s || '', t0 = performance.now(), dur = 700;
      if (!to || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = U.fmt(to) + suf; return; }
      const step = t => { const p = Math.min(1, Math.max(0, (t - t0) / dur)), e = 1 - Math.pow(1 - p, 3); el.textContent = U.fmt(to * e) + suf; if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
      setTimeout(() => { el.textContent = U.fmt(to) + suf; }, dur + 150); // لو المتصفح وقّف الأنيميشن
    });
  },
  num(n, suf) { return '<b data-n="' + Math.round(n || 0) + '" data-s="' + (suf || '') + '">0' + (suf || '') + '</b>'; },

  // ---- رسوم بسيطة ----
  bars(vals, labels, max) {
    const mx = max || Math.max(1, ...vals);
    return '<div class="bars">' + vals.map((v, i) => '<div><em>' + (v === null ? '' : U.fmt(v)) + '</em><i style="--h:' + Math.max(3, Math.round((v || 0) / mx * 100)) + '%;--d:' + i * 50 + 'ms"></i><span>' + labels[i] + '</span></div>').join('') + '</div>';
  },
  ring(p, label, cls) {
    const r = 30, C = 2 * Math.PI * r, v = p === null ? 0 : p;
    return '<div class="ring ' + (cls || '') + '"><svg viewBox="0 0 72 72"><circle r="' + r + '" cx="36" cy="36" class="bg"/><circle r="' + r + '" cx="36" cy="36" class="fg" style="--c:' + C + ';--o:' + (C - C * v / 100) + '"/></svg><b>' + (p === null ? '—' : p + '%') + '</b><span>' + label + '</span></div>';
  },
  line(v, labels) {
    const w = 320, h = 110, m = Math.max(...v, 1) * 1.15, n = Math.max(1, v.length - 1);
    const pts = v.map((x, i) => [8 + i * (w - 16) / n, h - 18 - x / m * (h - 30)]), p = pts.map(a => a[0].toFixed(1) + ',' + a[1].toFixed(1)).join(' ');
    let lb = ''; pts.forEach((a, i) => { if (i % 3 === 0 || i === v.length - 1) lb += '<text x="' + a[0] + '" y="' + (h - 2) + '" text-anchor="middle">' + labels[i] + '</text>'; });
    return '<svg class="line" viewBox="0 0 ' + w + ' ' + h + '" width="100%"><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAAA00" stop-opacity=".45"/><stop offset="1" stop-color="#EAAA00" stop-opacity="0"/></linearGradient></defs>' +
      '<polygon points="8,' + (h - 18) + ' ' + p + ' ' + (w - 8) + ',' + (h - 18) + '" fill="url(#lg)"/><polyline class="dl" pathLength="1" points="' + p + '" fill="none" stroke="#3A0F34" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      pts.map(a => '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="3" fill="#EAAA00" stroke="#3A0F34" stroke-width="1.5"/>').join('') + lb + '</svg>';
  },
  // ملف → نص base64 (للصور والملفات الصغيرة في الوضع المحلي)
  readFile(f) { return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); }); },
  size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.ceil(n / 1024) + ' KB'; },
};
