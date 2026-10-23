// المزامنة مع Supabase: نفس الشاشات، والبيانات بتتحفظ أونلاين وكل الموبايلات بتشوف نفس الحاجة.
// - الدخول من السيرفر (الباسوردات متشفّرة هناك).
// - كل تعديل بيتبعت لوحده بعد ثانية (اللي اتغيّر بس)، ولو النت فاصل بيستنى ويتبعت لما يرجع.
// - كل شوية بيجيب آخر نسخة.
// ?local=1 في الرابط = تجربة على الجهاز من غير ما يلمس الداتابيز.
window.Sync = (() => {
  const C = window.OA_CONFIG || {};
  const live = !!(C.SUPABASE_URL && C.SUPABASE_KEY) && !/[?&]local=1(&|$)/.test(location.search);
  const TK = 'oa_live_token', SNAP = 'oa_live_snap';
  let snap = null, timer = null, busy = false, state = 'ok', pullTimer = null;
  const files = {};

  async function rpc(fn, args) {
    const r = await fetch(C.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST', headers: Object.assign({ apikey: C.SUPABASE_KEY, 'Content-Type': 'application/json' }, /^eyJ/.test(C.SUPABASE_KEY) ? { Authorization: 'Bearer ' + C.SUPABASE_KEY } : {}), body: JSON.stringify(args || {}),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  const token = () => { try { return localStorage.getItem(TK); } catch (e) { return null; } };
  const setToken = t => { try { t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK); } catch (e) { } };
  const staff = () => App.ses && (App.ses.role === 'teacher' || App.ses.role === 'assistant');

  // DB ← → صفوف
  function toRows() {
    const out = [], add = (k, i, s, d) => out.push({ k, i: String(i), s: s == null ? '' : String(s), d });
    const t = DB.teacher;
    add('conf', 'main', '', { ready: true, teacher: { name: t.name, subject: t.subject, phone: t.phone }, places: DB.places, notif: DB.notif, defaults: DB.defaults, perms: DB.perms, assts: DB.assts.map(a => ({ user: a.user, name: a.name, phone: a.phone })) });
    DB.groups.forEach(g => add('group', g.id, '', g));
    DB.students.forEach(s => add('student', s.code, s.code, s));
    DB.att.forEach(a => add('att', a.id, a.s, a));
    DB.subs.forEach(x => add('sub', x.id, x.s, x));
    DB.pays.forEach(p => add('pay', p.id, p.s, p));
    DB.assess.forEach(a => add('assess', a.id, '', a));
    Object.keys(DB.scores).forEach(aid => Object.keys(DB.scores[aid]).forEach(c => add('score', aid + '|' + c, c, { a: +aid, s: +c, v: DB.scores[aid][c] })));
    Object.keys(DB.exAtt).forEach(aid => Object.keys(DB.exAtt[aid]).forEach(c => add('exatt', aid + '|' + c, c, { a: +aid, s: +c, v: DB.exAtt[aid][c] })));
    Object.keys(DB.closed).forEach(k => add('closed', k, '', { v: DB.closed[k] }));
    Object.keys(DB.sopt).forEach(k => add('sopt', k, '', DB.sopt[k]));
    DB.expenses.forEach(e => add('expense', e.id, '', e));
    DB.posts.forEach(p => add('post', p.id, '', p));
    DB.log.forEach(l => add('log', l.id, l.s || '', l));
    return out;
  }
  function fromRows(rows) {
    const d = Store.blank(), old = DB;
    rows.forEach(([k, id, , x]) => {
      if (k === 'conf') { d.ready = true; Object.assign(d.teacher, x.teacher || {}); ['places', 'notif', 'defaults', 'perms', 'assts'].forEach(f => { if (x[f]) d[f] = x[f]; }); }
      else if (k === 'group') d.groups.push(x);
      else if (k === 'student') d.students.push(x);
      else if (k === 'att') d.att.push(x);
      else if (k === 'sub') d.subs.push(x);
      else if (k === 'pay') d.pays.push(x);
      else if (k === 'assess') { d.assess.push(x); d.scores[x.id] = d.scores[x.id] || {}; }
      else if (k === 'score') (d.scores[x.a] = d.scores[x.a] || {})[x.s] = x.v;
      else if (k === 'exatt') (d.exAtt[x.a] = d.exAtt[x.a] || {})[x.s] = x.v;
      else if (k === 'closed') d.closed[id] = x.v;
      else if (k === 'sopt') d.sopt[id] = x;
      else if (k === 'expense') d.expenses.push(x);
      else if (k === 'post') d.posts.push(x);
      else if (k === 'log') d.log.push(x);
    });
    d.log.sort((a, b) => a.at.localeCompare(b.at));
    // الباسوردات بتفضل على الجهاز ده بس (مش بتتبعت للسيرفر غير متشفّرة)
    if (old) { d.teacher.pw = old.teacher && old.teacher.pw; d.assts.forEach(a => { const o = (old.assts || []).find(x => x.user === a.user); if (o && o.pw) a.pw = o.pw; }); d.msgs = old.msgs || []; }
    return d;
  }
  const keyOf = r => r.k + '|' + r.i;
  function snapshot() { const m = {}; toRows().forEach(r => m[keyOf(r)] = JSON.stringify(r)); return m; }
  function saveSnap() { try { localStorage.setItem(SNAP, JSON.stringify(snap)); } catch (e) { } }
  function pending() { if (!snap || !DB) return false; const cur = snapshot(), a = Object.keys(cur), b = Object.keys(snap); return a.length !== b.length || a.some(k => cur[k] !== snap[k]); }

  async function push() {
    if (!live || busy || !token() || !DB || !staff()) return;
    busy = true;
    try {
      const cur = {}, changes = [];
      toRows().forEach(r => { const j = JSON.stringify(r); cur[keyOf(r)] = j; if (!snap || snap[keyOf(r)] !== j) changes.push(r); });
      Object.keys(snap || {}).forEach(k => { if (!cur[k]) { const p = k.indexOf('|'), old = JSON.parse(snap[k]); changes.push({ k: k.slice(0, p), i: k.slice(p + 1), del: true, f: old.k === 'post' ? (old.d.files || []).map(f => String(f.url).replace(/^oaf:/, '')) : [] }); } });
      for (let i = 0; i < changes.length; i += 300) {
        const res = await rpc('oa_push', { p_token: token(), p_changes: changes.slice(i, i + 300) });
        if (res.auth) { state = 'auth'; return Sync.expired(); }
        if (!res.ok) throw new Error(res.error || 'push');
      }
      snap = cur; saveSnap(); state = 'ok';
    } catch (e) { state = 'off'; clearTimeout(timer); timer = setTimeout(push, 20000); }
    finally { busy = false; Sync.paintBadge(); }
  }
  async function pull(quiet) {
    if (!live || !token()) return false;
    if (staff() && pending()) { await push(); if (pending()) return false; } // التعديلات المحلية الأول
    try {
      const res = await rpc('oa_pull', { p_token: token() });
      if (res.auth) { Sync.expired(); return false; }
      if (!res.ok) return false;
      const before = JSON.stringify(snap || {});
      DB = fromRows(res.rows); Store.fix(); Store.ix(); snap = snapshot(); saveSnap(); Store.cache(); state = 'ok';
      if (quiet && JSON.stringify(snap) !== before && !Sync.typing() && App.ses) App.render();
      Sync.paintBadge();
      return true;
    } catch (e) { state = 'off'; Sync.paintBadge(); return false; }
  }

  return {
    live, rpc, token, ready: null,
    changed() { if (!live || !token() || !staff()) return; state = 'wait'; Sync.paintBadge(); clearTimeout(timer); timer = setTimeout(push, 900); },
    async status() { try { const r = await rpc('oa_status'); Sync.ready = !!r.ready; } catch (e) { Sync.ready = true; } return Sync.ready; },
    async login(role, u, p) {
      const res = await rpc('oa_login', { p_role: role, p_user: u, p_pw: p });
      if (!res.ok) return res;
      setToken(res.token); snap = null;
      if (!await pull()) return { ok: false, error: 'pull' };
      return res;
    },
    // الإعداد أول مرة: بيبعت كل البيانات + باسورد المستر
    async setup(pw) {
      const res = await rpc('oa_setup', { p_pw: pw, p_rows: toRows() });
      if (!res.ok) return res;
      setToken(res.token); snap = snapshot(); saveSnap(); Sync.ready = true; return res;
    },
    async logout() { const t = token(); setToken(null); snap = null; try { localStorage.removeItem(SNAP); } catch (e) { } if (t) rpc('oa_logout', { p_token: t }).catch(() => { }); },
    boot() {
      if (!live) return;
      try { snap = JSON.parse(localStorage.getItem(SNAP)); } catch (e) { snap = null; }
      if (token()) { if (staff() && pending()) push(); else pull(true); }
      clearInterval(pullTimer);
      pullTimer = setInterval(() => { if (token() && !document.hidden) pull(true); }, (C.PULL_SECONDS || 45) * 1000);
      window.addEventListener('online', () => push());
      document.addEventListener('visibilitychange', () => { if (!document.hidden && token()) pull(true); });
    },
    expired() { setToken(null); App.setSes(null); U.toast('الجلسة انتهت — ادخل تاني', 'bad'); App.go(''); },
    async setPw(kind, key, pw) {
      if (!live) return true;
      try {
        const r = await rpc('oa_set_pw', { p_token: token(), p_kind: kind, p_key: String(key), p_pw: pw });
        if (!r.ok) U.toast(r.error === 'taken' ? 'الباسورد ده مستخدم — اختار غيره' : 'مقدرتش أغيّر الباسورد', 'bad');
        if (r.ok && (kind === 'student' || kind === 'parent') && staff()) { snap = snapshot(); saveSnap(); }
        return r.ok;
      } catch (e) { U.toast('مفيش نت — جرّب تاني', 'bad'); return false; }
    },
    // رفع ملف/صورة: بيرجع oaf:<id>
    async upload(f) {
      try {
        const body = await U.readFile(f), r = await rpc('oa_put_file', { p_token: token(), p_name: f.name, p_type: f.type, p_body: body });
        if (!r.ok) { U.toast('مقدرتش أرفع ' + f.name, 'bad'); return null; }
        files[r.id] = body; return 'oaf:' + r.id;
      } catch (e) { U.toast('مفيش نت — مقدرتش أرفع الملف', 'bad'); return null; }
    },
    async file(id) {
      if (files[id]) return files[id];
      const r = await rpc('oa_get_file', { p_token: token(), p_id: id });
      return r.ok ? (files[id] = r.body) : null;
    },
    // الصور والملفات اللي في الرسايل بتتحمل لما تظهر بس
    hydrate(root) {
      (root || document).querySelectorAll('[data-oaf]').forEach(async el => {
        const id = el.dataset.oaf; el.removeAttribute('data-oaf');
        const b = await Sync.file(id); if (!b) return;
        if (el.tagName === 'IMG') el.src = b; else el.href = b;
        const a = el.closest('a'); if (a && el.tagName === 'IMG') a.href = b;
      });
    },
    async sheetKey() { const r = await rpc('oa_sheet_key', { p_token: token() }); return r.ok ? r.key : null; },
    typing() { const a = document.activeElement; return !!document.getElementById('modal') || (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)); },
    badge() {
      if (!live) return '';
      const m = { ok: ['refresh', 'متزامن'], wait: ['clock', 'بيتحفظ…'], off: ['alert', 'مفيش نت — هيتبعت لما يرجع'], auth: ['lock', ''] }[state] || ['refresh', ''];
      return '<span class="ib net ' + state + '" id="netb" title="' + m[1] + '">' + I(m[0], 'sm') + '</span>';
    },
    paintBadge() { const e = document.getElementById('netb'); if (e) e.outerHTML = Sync.badge(); },
    panel() {
      if (!live) return '<p class="mu fw sm" style="margin:12px 0 0">السيستم شغال على الجهاز ده بس.</p>';
      return '<p class="mu fw sm" style="margin:12px 0 0">' + I('refresh', 'sm') + ' أونلاين — كل الموبايلات بتشوف نفس البيانات.</p><button class="btn soft sm" onclick="Sync.showSheetKey()">' + I('link', 'sm') + 'مفتاح شيت جوجل</button>';
    },
    async showSheetKey() {
      const k = await Sync.sheetKey(); if (!k) return U.toast('مقدرتش أجيب المفتاح', 'bad');
      U.modal('<h3>مفتاح شيت جوجل</h3><p class="mu fw sm">حطه في تاب «الإعدادات» في الشيت، خانة B2.</p><div class="msgbox ltr" style="word-break:break-all">' + k + '</div><button class="btn aub wide" style="margin-top:12px" onclick="navigator.clipboard.writeText(' + q(k) + ');U.toast(\'اتنسخ\')">' + I('download', 'sm') + 'انسخ</button>');
    },
    pull, push, pending,
  };
})();
