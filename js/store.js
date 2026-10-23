// طبقة البيانات: كل القراءة والكتابة بتعدي من هنا (مدرس واحد: مستر أسامة).
// التخزين على الجهاز (localStorage)، ولما Supabase يتربط sync.js بيبعت التعديلات أونلاين.
const DB_KEY = (/[?&]demo=1(&|$)/.test(location.search) ? 'oa_db_demo' : window.Sync && Sync.live ? 'oa_db_live' : 'oa_db_v1') + OA_SFX;
let DB = null;

const GRADES = ['أولى إعدادي', 'تانية إعدادي', 'تالتة إعدادي'];
const GRADE_SHORT = { 'أولى إعدادي': 'أولى', 'تانية إعدادي': 'تانية', 'تالتة إعدادي': 'تالتة' };
const GRADE_NUM = { 'أولى إعدادي': '1', 'تانية إعدادي': '2', 'تالتة إعدادي': '3' };
const EXP_TYPES = { month: 'ثابت كل شهر', student: 'على كل طالب (شهري)', attend: 'على كل طالب في الحصة', once: 'مرة واحدة' };
const assessName = k => ({ quiz: 'كويز', exam: 'امتحان', hw: 'واجب' }[k] || 'تقييم');

const Store = {
  // ================= تحميل وحفظ =================
  load() {
    try { DB = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { DB = null; }
    if (DB) Store.fix(), Store.ix();
    return !!DB;
  },
  save() { Store.cache(); if (window.Sync) Sync.changed(); },
  cache() {
    Store.ix();
    try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); }
    catch (e) { U.toast('مساحة المتصفح خلصت — نزّل نسخة احتياطية من الإعدادات', 'bad'); }
  },
  wipe() { localStorage.removeItem(DB_KEY); DB = null; },
  blank() {
    return {
      v: 1, ready: false,
      teacher: { name: 'أسامة عفيفي', subject: 'English', phone: '', user: 'OA', pw: '1234' },
      places: ['سنتر الأسس', 'سنتر بيومي'],
      groups: [], students: [], att: [], subs: [], pays: [], assess: [], scores: {}, exAtt: {}, closed: {}, sopt: {},
      expenses: [], posts: [], msgs: [], log: [],
      assts: [], perms: { money: false, add: true, del: false, grades: true, msgs: true, edit: false },
      notif: { wa: false, to: 'p', absence: true, report: true, grades: true, portal: true },
      defaults: { qzMax: 10, exMax: 20 },
    };
  },
  // لو البيانات من نسخة أقدم ناقصها حاجة
  fix() { const b = Store.blank(); Object.keys(b).forEach(k => { if (DB[k] === undefined) DB[k] = b[k]; }); Object.keys(b.notif).forEach(k => { if (DB.notif[k] === undefined) DB.notif[k] = b.notif[k]; }); if (!DB.teacher.user) DB.teacher.user = 'OA'; DB.students.forEach(s => { if (!s.pin) s.pin = Store.newPin(); }); if (!DB.log) DB.log = []; },
  // رقم سري من 4 أرقام مش متكرر (للطالب وولي أمره)
  newPin() { const used = new Set(DB.students.map(s => s.pin)); let p; do { p = String(1000 + Math.floor(Math.random() * 9000)); } while (used.has(p) || p === '1234'); return p; },
  // باسورد أسيستنت من 6 أرقام مش متكرر ومختلف عن باسورد المستر
  newAsstPw() { const used = new Set(DB.assts.map(a => a.pw).concat(DB.teacher.pw)); let p; do { p = String(100000 + Math.floor(Math.random() * 900000)); } while (used.has(p)); return p; },
  // سجل الحاجات الجديدة اللي المستر والأسيستنت بيعملوها (بيطلع في الإشعارات)
  log(kind, text, s) {
    const by = App.ses && App.ses.role === 'assistant' ? App.ses.id : 'teacher';
    DB.log.push({ id: Store.nid(), at: U.today() + ' ' + U.now(), by, kind, text, s: s || null });
    if (DB.log.length > 1500) DB.log.splice(0, 300);
  },
  byName(by) { if (by === 'teacher') return 'مستر ' + DB.teacher.name.split(' ')[0]; const a = Store.asst(by); return a ? a.name : 'أسيستنت'; },
  nid() { Store._last = Math.max((Store._last || 0) + 1, Date.now() * 1000 + Math.floor(Math.random() * 1000)); return Store._last; },

  // مجموعات مستر أسامة (من الرسالة) — بتتملى في خطوات الإعداد وهو يعدّلها
  starterGroups() {
    const mk = (grade, place, slots) => ({ id: '', grade, place, name: '', slots, payMode: 'month', price: 0, monthPrice: 0, qz: true, ex: false, active: true });
    const MT = (f, t) => [{ day: 'الاثنين', from: f, to: t }, { day: 'الخميس', from: f, to: t }];
    return [
      mk('تالتة إعدادي', 'سنتر الأسس', MT('12:00', '14:00')),
      mk('تانية إعدادي', 'سنتر الأسس', MT('14:00', '15:30')),
      mk('أولى إعدادي', 'سنتر الأسس', MT('15:30', '16:30')),
      mk('تالتة إعدادي', 'سنتر بيومي', [{ day: 'السبت', from: '16:00', to: '18:00' }, { day: 'الثلاثاء', from: '11:30', to: '13:30' }]),
      mk('تانية إعدادي', 'سنتر بيومي', MT('16:30', '18:00')),
      mk('أولى إعدادي', 'سنتر بيومي', MT('18:00', '19:00')),
    ];
  },

  // فهارس للسرعة (بتتبني بعد كل حفظ)
  ix() {
    const I = { s: {}, g: {}, attS: {}, attSess: {}, sub: {}, gS: {} };
    DB.students.forEach(s => { I.s[s.code] = s; if (s.st !== 'out') (I.gS[s.g] = I.gS[s.g] || []).push(s); });
    DB.groups.forEach(g => I.g[g.id] = g);
    DB.att.forEach(a => { (I.attS[a.s] = I.attS[a.s] || []).push(a); const k = a.g + '|' + a.d; (I.attSess[k] = I.attSess[k] || []).push(a); });
    DB.subs.forEach(x => I.sub[x.s + '|' + x.m] = x);
    Store.I = I;
  },

  // ================= مجموعات =================
  group: id => Store.I.g[id],
  groups(all) { return DB.groups.filter(g => all || g.active !== false).sort((a, b) => GRADES.indexOf(a.grade) - GRADES.indexOf(b.grade) || DB.places.indexOf(a.place) - DB.places.indexOf(b.place)); },
  gName(g) { return g ? (g.name || (GRADE_SHORT[g.grade] || g.grade) + ' · ' + g.place) : '—'; },
  gFull(g) { return g ? (g.name ? g.name + ' (' + g.grade + ')' : g.grade + ' · ' + g.place) : '—'; },
  gDays(g) { return [...new Set(g.slots.map(s => s.day))].join(' و '); },
  gTime(g) {
    const t = [...new Set(g.slots.map(s => s.from + '-' + s.to))];
    if (t.length === 1) return Store.gDays(g) + ' · ' + U.t12s(g.slots[0].from) + ' ← ' + U.t12(g.slots[0].to);
    return g.slots.map(s => U.SHORT[s.day] + ' ' + U.t12(s.from)).join(' · ');
  },
  slot(g, d) { const n = U.dayName(d); return g.slots.find(s => s.day === n); },
  meets(g, d) { return !!Store.slot(g, d); },
  dayGroups(d) { return Store.groups().filter(g => Store.meets(g, d)).sort((a, b) => U.mins(Store.slot(a, d).from) - U.mins(Store.slot(b, d).from)); },
  nextGroupId() { return 'G' + (DB.groups.reduce((m, g) => Math.max(m, +String(g.id).replace(/\D/g, '') || 0), 0) + 1); },
  gPrice(g) { return g.payMode === 'month' ? g.monthPrice : g.price; },
  members(gid) { return (Store.I.gS[gid] || []).slice(); },
  gradeMembers(grade) { return DB.students.filter(s => s.st !== 'out' && Store.group(s.g) && Store.group(s.g).grade === grade); },
  // الحصة الحالية/الجاية النهارده
  liveGroup() {
    const d = U.today(), n = U.mins(U.now()), gs = Store.dayGroups(d);
    return gs.find(g => { const s = Store.slot(g, d); return n >= U.mins(s.from) - 20 && n <= U.mins(s.to); }) || gs.find(g => U.mins(Store.slot(g, d).from) > n) || null;
  },

  // ================= طلاب =================
  student: code => Store.I.s[code],
  active() { return DB.students.filter(s => s.st !== 'out'); },
  nextCode() { return DB.students.reduce((m, s) => Math.max(m, +s.code), 1000) + 1; },
  findByPhone(ph, not) { ph = U.phone(ph); return ph ? DB.students.find(s => s.code !== not && (s.phone === ph || s.parentPhone === ph)) : null; },
  addStudent(d) {
    const s = { code: Store.nextCode(), name: d.name, gender: d.gender || 'ذكر', g: d.g, parentPhone: U.phone(d.parentPhone), same: !!d.same, phone: d.same ? U.phone(d.parentPhone) : U.phone(d.phone), parentName: d.parentName || '', school: d.school || '', notes: d.notes || '', st: 'on', since: U.today(), debt0: 0, pin: Store.newPin() };
    DB.students.push(s); Store.ix(); return s;
  },
  updateStudent(code, d) {
    const s = Store.student(code);
    ['name', 'gender', 'school', 'notes', 'parentName', 'g'].forEach(k => { if (d[k] !== undefined) s[k] = d[k]; });
    s.same = !!d.same; s.parentPhone = U.phone(d.parentPhone); s.phone = s.same ? s.parentPhone : U.phone(d.phone);
    Store.ix();
  },
  withdraw(code) { Store.student(code).st = 'out'; Store.ix(); },
  restore(code) { Store.student(code).st = 'on'; Store.ix(); },
  deleteStudent(code) {
    DB.students = DB.students.filter(s => s.code !== code);
    DB.att = DB.att.filter(a => a.s !== code); DB.pays = DB.pays.filter(p => p.s !== code); DB.subs = DB.subs.filter(p => p.s !== code);
    Object.values(DB.scores).forEach(m => delete m[code]); Object.values(DB.exAtt).forEach(m => delete m[code]);
    Store.ix();
  },
  isGirl: s => s.gender === 'أنثى',

  // ================= حضور =================
  sessAtt(gid, d) { return Store.I.attSess[gid + '|' + d] || []; },
  rec(code, gid, d) { return Store.sessAtt(gid, d).find(a => a.s === code); },
  stAtt(code) { return (Store.I.attS[code] || []).slice().sort((a, b) => b.d.localeCompare(a.d)); },
  isClosed(gid, d) { return !!DB.closed[gid + '|' + d]; },
  closedAt(gid, d) { const v = DB.closed[gid + '|' + d]; return typeof v === 'string' ? v : ''; },
  markPresent(code, gid, d) {
    const g = Store.group(gid), s = Store.student(code);
    if (Store.sessAtt(gid, d).some(a => a.s === code && a.st === 'p')) return { dup: true };
    DB.att = DB.att.filter(a => !(a.g === gid && a.d === d && a.s === code));
    const fee = g.payMode === 'month' ? 0 : g.price;
    const a = { id: Store.nid(), s: code, g: gid, d, st: 'p', fee, paid: fee, mk: s.g !== gid, tm: U.now() };
    DB.att.push(a); Store.ix(); return { a };
  },
  markAbsent(code, gid, d) {
    DB.att = DB.att.filter(a => !(a.g === gid && a.d === d && a.s === code));
    DB.att.push({ id: Store.nid(), s: code, g: gid, d, st: 'a', fee: 0, paid: 0, mk: false, tm: '' });
    ['quiz', 'exam'].forEach(t => { const a = Store.sessAssess(gid, d, t); if (a && DB.scores[a.id]) delete DB.scores[a.id][code]; });
    Store.ix();
  },
  unmark(code, gid, d) { DB.att = DB.att.filter(a => !(a.g === gid && a.d === d && a.s === code)); Store.ix(); },
  // «تسجيل اليوم»: اللي ماجوش يتسجلوا غياب
  closeSession(gid, d) {
    const here = new Set(Store.sessAtt(gid, d).map(a => a.s)), abs = [];
    Store.members(gid).forEach(s => { if (!here.has(s.code)) { DB.att.push({ id: Store.nid(), s: s.code, g: gid, d, st: 'a', fee: 0, paid: 0, mk: false, tm: '' }); abs.push(s); } });
    DB.closed[gid + '|' + d] = U.now(); Store.ix(); return abs;
  },
  reopen(gid, d) { delete DB.closed[gid + '|' + d]; Store.ix(); },
  // رقم الحصة في المجموعة: بنعدّ أيام الحصص اللي اتسجلت (كل يوم + مجموعة = حصة واحدة مهما اتسجلت كام مرة)
  sessNo(gid, d) {
    const ds = new Set(); DB.att.forEach(a => { if (a.g === gid) ds.add(a.d); }); Object.keys(DB.closed).forEach(k => { const [g, x] = k.split('|'); if (g === gid) ds.add(x); });
    ds.add(d); const list = [...ds].sort(), n = list.indexOf(d) + 1, per = Math.max(1, (Store.group(gid) || { slots: [1] }).slots.length);
    return { n, w: Math.ceil(n / per), k: ((n - 1) % per) + 1, per };
  },
  sessLabel(gid, d) { const x = Store.sessNo(gid, d); return 'الحصة ' + x.n + ' · الأسبوع ' + x.w + (x.per > 1 ? ' (حصة ' + x.k + ' من ' + x.per + ')' : ''); },
  // كويز/امتحان في الحصة دي؟ (الافتراضي من المجموعة)
  sopt(gid, d) { const g = Store.group(gid), o = DB.sopt[gid + '|' + d] || {}; return { qz: o.qz !== undefined ? o.qz : !!g.qz, ex: o.ex !== undefined ? o.ex : false, qzMax: o.qzMax || g.qzMax || DB.defaults.qzMax, exMax: o.exMax || g.exMax || DB.defaults.exMax }; },
  setSopt(gid, d, k, v) { const key = gid + '|' + d; DB.sopt[key] = Object.assign(DB.sopt[key] || {}, { [k]: v }); ['quiz', 'exam'].forEach(t => { const a = Store.sessAssess(gid, d, t); if (a) a.max = Store.sopt(gid, d)[t === 'quiz' ? 'qzMax' : 'exMax']; }); },
  attRate(code) { const a = Store.stAtt(code); return a.length ? U.pct(a.filter(x => x.st === 'p').length, a.length) : null; },
  absences(code) { return Store.stAtt(code).filter(x => x.st === 'a').length; },
  presents(code) { return Store.stAtt(code).filter(x => x.st === 'p').length; },
  // غياب ورا بعض (آخر الحصص)
  absStreak(code) { let n = 0; for (const a of Store.stAtt(code)) { if (a.st === 'a') n++; else break; } return n; },

  // ================= فلوس الطالب =================
  sub(code, m) { return Store.I.sub[code + '|' + (m || U.month())]; },
  toggleSub(code, m) {
    const s = Store.student(code), g = Store.group(s.g), x = Store.sub(code, m);
    if (x) DB.subs = DB.subs.filter(y => y !== x);
    else { DB.subs.push({ id: Store.nid(), s: code, g: s.g, m: m || U.month(), amt: g ? g.monthPrice || 0 : 0, d: U.today() }); Store.log('pay', s.name + ' دفع اشتراك ' + U.monthName(m || U.month()), code); }
    Store.ix();
  },
  debt(code) {
    let d = +(Store.student(code) || {}).debt0 || 0;
    Store.stAtt(code).forEach(a => d += (a.fee || 0) - (a.paid || 0));
    DB.pays.forEach(p => { if (p.s === code) d -= p.amt; });
    return Math.max(0, d);
  },
  // حالة الدفع: شهري ← مدفوع/مش مدفوع، بالحصة ← دفع/آجل
  payState(code, d) {
    const s = Store.student(code), g = Store.group(s.g); if (!g) return '';
    if (g.payMode === 'month') return Store.sub(code, U.month(d)) ? 'mp' : 'up';
    return Store.debt(code) > 0 ? 'df' : 'paid';
  },
  payText(st) { return { mp: 'دفع الشهر', up: 'مدفعش الشهر', paid: 'خالص', df: 'عليه آجل' }[st] || '—'; },
  pay(code, amt, waive, note) { DB.pays.push({ id: Store.nid(), s: code, amt: +amt, d: U.today(), waive: !!waive, note: note || '' }); Store.log('pay', (note || 'تسديد') + ' ' + U.money(amt) + ' — ' + Store.student(code).name, code); Store.ix(); },

  // ================= الحسابات =================
  revenue(r, gid) {
    let v = 0;
    DB.att.forEach(a => { if ((!gid || a.g === gid) && U.inRange(a.d, r)) v += a.paid || 0; });
    DB.subs.forEach(x => { if ((!gid || x.g === gid) && U.inRange(x.d, r)) v += x.amt; });
    if (!gid) DB.pays.forEach(p => { if (!p.waive && U.inRange(p.d, r)) v += p.amt; });
    return v;
  },
  deferred() { return DB.students.reduce((a, s) => a + Store.debt(s.code), 0); },
  presentCount(r, gids) { return DB.att.filter(a => a.st === 'p' && U.inRange(a.d, r) && (!gids || gids.has(a.g))).length; },
  scopeGroups(scope) {
    if (!scope) return null;
    const [k, v] = scope.split(':');
    return new Set(DB.groups.filter(g => (k === 'place' && g.place === v) || (k === 'grade' && g.grade === v) || (k === 'group' && g.id === v)).map(g => g.id));
  },
  scopeName(scope) { if (!scope) return 'كل المجموعات'; const [k, v] = scope.split(':'); return k === 'group' ? Store.gName(Store.group(v)) : v; },
  // قيمة بند مصروف في شهر معين + طريقة الحساب (عشان تتعرض «=»)
  expCalc(e, m) {
    if (e.from && e.from > m) return { v: 0, how: 'لسه مبدأش' };
    if (e.to && e.to < m) return { v: 0, how: 'اتوقف' };
    const gs = Store.scopeGroups(e.scope), amt = +e.amt || 0;
    if (e.type === 'month') return { v: amt, how: U.money(amt) + ' شهري' };
    if (e.type === 'once') return e.m === m ? { v: amt, how: 'مرة واحدة' } : { v: 0, how: '—' };
    if (e.type === 'student') { const n = DB.students.filter(s => s.st !== 'out' && (!gs || gs.has(s.g))).length; return { v: n * amt, how: U.fmt(amt) + ' × ' + n + ' طالب' }; }
    if (e.type === 'attend') { const n = Store.presentCount(U.mRange(m), gs); return { v: n * amt, how: U.fmt(amt) + ' × ' + n + ' حضور' }; }
    return { v: 0, how: '' };
  },
  expenses(m) { return DB.expenses.reduce((a, e) => a + Store.expCalc(e, m).v, 0); },
  monthRevenue(m) { return Store.revenue(U.mRange(m)); },

  // ================= درجات =================
  addAssess(o) { const a = Object.assign({ id: Store.nid(), d: U.today(), pub: true }, o); a.max = +a.max || 10; DB.assess.push(a); DB.scores[a.id] = {}; return a; },
  assess: id => DB.assess.find(a => a.id === id),
  sessAssess(gid, d, type) { return DB.assess.find(a => a.g === gid && a.d === d && a.type === type && !a.solo); },
  ensureSessAssess(gid, d, type) {
    const g = Store.group(gid);
    const o = Store.sopt(gid, d);
    return Store.sessAssess(gid, d, type) || Store.addAssess({ g: gid, grade: g.grade, type, d, max: type === 'exam' ? o.exMax : o.qzMax, title: assessName(type) + ' ' + U.short(d) + ' · ' + Store.gName(g) });
  },
  sessScore(gid, d, type, code) { const a = Store.sessAssess(gid, d, type); return a && DB.scores[a.id] && DB.scores[a.id][code] !== undefined ? DB.scores[a.id][code] : ''; },
  setScore(aid, code, v) {
    const a = Store.assess(aid); DB.scores[aid] = DB.scores[aid] || {};
    if (v === '' || v === null || isNaN(+v)) delete DB.scores[aid][code]; else DB.scores[aid][code] = Math.max(0, Math.min(a.max, +v));
  },
  delAssess(id) { DB.assess = DB.assess.filter(a => a.id !== id); delete DB.scores[id]; delete DB.exAtt[id]; },
  // طلاب التقييم: امتحان مستقل ممكن يبقى لصف كامل أو مجموعة
  assessMembers(a) { return a.g ? Store.members(a.g) : Store.gradeMembers(a.grade); },
  scoresOf(code, onlyPub) {
    return DB.assess.filter(a => (!onlyPub || a.pub) && DB.scores[a.id] && DB.scores[a.id][code] !== undefined && DB.scores[a.id][code] !== '')
      .sort((a, b) => a.d.localeCompare(b.d)).map(a => ({ a, v: +DB.scores[a.id][code] }));
  },
  avg(code, onlyPub) { const s = Store.scoresOf(code, onlyPub); return s.length ? Math.round(s.reduce((x, y) => x + y.v / y.a.max * 100, 0) / s.length) : null; },
  trend(code) { const s = Store.scoresOf(code).slice(-4); if (s.length < 2) return 0; const h = Math.floor(s.length / 2), f = x => x.reduce((a, y) => a + y.v / y.a.max * 100, 0) / x.length; return Math.round(f(s.slice(h)) - f(s.slice(0, h))); },
  level(p) { return p === null ? ['لسه', 'mu'] : p >= 85 ? ['ممتاز', 'top'] : p >= 65 ? ['جيد جداً', 'ok'] : p >= 50 ? ['مقبول', 'mid'] : ['ضعيف', 'low']; },
  cat(code) { const p = Store.avg(code), t = Store.trend(code); if (p === null) return 'ok'; return p >= 85 ? 'top' : t <= -15 ? 'dn' : t >= 15 ? 'up' : p < 50 ? 'wk' : 'ok'; },
  catName: c => ({ top: 'متفوق', up: 'في تحسن', dn: 'في تراجع', wk: 'محتاج متابعة', ok: 'مستقر' }[c]),
  assessAvg(a) { const v = Object.values(DB.scores[a.id] || {}); return v.length ? Math.round(v.reduce((x, y) => x + y, 0) / v.length / a.max * 100) : null; },

  // ================= أسيستنتس =================
  asst(user) { return DB.assts.find(a => a.user.toLowerCase() === String(user).toLowerCase()); },
  nextAsstUser() { let n = 1; const all = new Set(DB.assts.map(a => a.user.toUpperCase())); while (all.has('A' + String(n).padStart(2, '0'))) n++; return 'A' + String(n).padStart(2, '0'); },
  logMsg(o) { DB.msgs.push(Object.assign({ d: U.today(), tm: U.now() }, o)); if (DB.msgs.length > 3000) DB.msgs.splice(0, 500); },

  // ================= بوابة الطالب =================
  postsFor(s, role) {
    const g = Store.group(s.g);
    return DB.posts.filter(p => (p.to === 'b' || p.to === (role === 'parent' ? 'p' : 's')) &&
      (p.tgt === 'all' || (g && (p.tgt === 'grade:' + g.grade || p.tgt === 'group:' + g.id)) || p.tgt === 'st:' + s.code))
      .sort((a, b) => (b.d + b.tm).localeCompare(a.d + a.tm));
  },
  tgtName(t) { if (t === 'all') return 'كل الطلاب'; const [k, v] = t.split(':'); return k === 'grade' ? v : k === 'group' ? Store.gName(Store.group(v)) : k === 'st' ? (Store.student(+v) || {}).name : t; },
  async setPw(kind, key, pw) {
    if (kind === 'teacher') DB.teacher.pw = pw;
    if (kind === 'assistant') { const a = Store.asst(key); if (a) a.pw = pw; }
    if (kind === 'student' || kind === 'parent') Store.student(+key).pin = pw;
    Store.cache();
    return window.Sync ? Sync.setPw(kind, key, pw) : true;
  },
};
