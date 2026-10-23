// الرسايل: (1) بوابة الطالب/ولي الأمر — رسالة + ملف/صورة  (2) واتساب — اختياري ويتقفل من الإعدادات
const TT = {
  top: ['مبروك يا {n}! مستواك ممتاز، كمّل على كده', 'نبشركم إن {n} من المتفوقين وأداؤه ممتاز، بارك الله فيه'],
  up: ['ما شاء الله يا {n}، مستواك بيتحسن، كمّل', 'نلاحظ تحسن واضح في مستوى {n}، شكراً على متابعتكم'],
  dn: ['يا {n}، مستواك نزل شوية الفترة دي، ركّز معانا وهترجع أقوى', 'نلاحظ انخفاض في مستوى {n} مؤخراً، برجاء المتابعة معانا'],
  wk: ['يا {n}، محتاجين مجهود أكتر، يلا نذاكر سوا', 'مستوى {n} أقل من المطلوب، نرجو التواصل معانا لخطة مذاكرة'],
  ok: ['يا {n}، مستواك كويس، كمّل واجتهد', 'مستوى {n} كويس، ونشجعه على اجتهاد أكتر'],
};
const Msg = {
  sig() { return 'مستر ' + DB.teacher.name + ' — English'; },
  // رابط تطبيق الطلاب وأولياء الأمور
  famUrl() { return location.origin + location.pathname.replace(/(family\/)?(index\.html)?$/, '') + 'family/'; },
  first: s => s.name.split(' ')[0],
  hi(s, to) { return to === 's' ? 'أهلاً يا ' + Msg.first(s) : 'السلام عليكم ' + (s.parentName ? 'أ/ ' + s.parentName : 'ولي أمر الطالب ' + s.name); },
  report(code, o) {
    o = o || {}; const s = Store.student(code), g = Store.group(o.g || s.g), d = o.d || U.today(), a = g && Store.rec(code, g.id, d), P = o.to !== 's';
    const L = [Msg.hi(s, o.to), P ? 'تقرير ' + s.name + ' — حصة ' + U.long(d) : 'تقريرك في حصة ' + U.long(d)];
    L.push('• الحضور: ' + (a ? (a.st === 'p' ? 'حضر' : 'غاب') : '—'));
    if (DB.notif.grades !== false && g) {
      const qz = Store.sessScore(g.id, d, 'quiz', code), ex = Store.sessScore(g.id, d, 'exam', code), o2 = Store.sopt(g.id, d);
      if (qz !== '') L.push('• كويز النهارده: ' + qz + ' / ' + o2.qzMax);
      if (ex !== '') L.push('• الامتحان: ' + ex + ' / ' + o2.exMax);
      const r = Store.attRate(code), av = Store.avg(code);
      if (r !== null) L.push('• نسبة الحضور: ' + r + '%');
      if (av !== null) L.push('• متوسط الدرجات: ' + av + '% (' + Store.level(av)[0] + ')');
    }
    if (P && g && g.payMode === 'month') L.push('• اشتراك الشهر: ' + (Store.sub(code, U.month(d)) ? 'مدفوع' : 'لسه مدفعش'));
    L.push('', Msg.sig()); return L.join('\n');
  },
  absence(code, o) {
    o = o || {}; const s = Store.student(code), d = o.d || U.today();
    return Msg.hi(s, o.to) + '\n' + (o.to === 's' ? 'إنت غبت' : 'نحيطكم علماً بغياب ' + s.name) + ' عن حصة الإنجليزي النهارده ' + U.long(d) + '.' + (Store.absStreak(code) >= 2 ? '\nده الغياب رقم ' + Store.absStreak(code) + ' ورا بعض.' : '') + '\n\n' + Msg.sig();
  },
  monthly(code, o) {
    o = o || {}; const s = Store.student(code), m = U.month(), list = Store.stAtt(code).filter(x => x.d.startsWith(m)), av = Store.avg(code), P = o.to !== 's', g = Store.group(s.g);
    const L = [Msg.hi(s, o.to), (P ? 'التقرير الشهري لـ ' + s.name : 'تقريرك الشهري') + ' — ' + U.monthName(m)];
    L.push('• حضر ' + list.filter(x => x.st === 'p').length + ' من ' + list.length + ' حصة');
    if (av !== null) L.push('• متوسط الدرجات: ' + av + '% (' + Store.level(av)[0] + ')');
    const sc = Store.scoresOf(code).filter(x => x.a.d.startsWith(m)).slice(-5); if (sc.length) L.push('• الدرجات: ' + sc.map(x => x.v + '/' + x.a.max).join(' · '));
    if (P && g && g.payMode === 'month') L.push('• اشتراك الشهر: ' + (Store.sub(code, m) ? 'مدفوع' : 'لسه مدفعش'));
    L.push('', Msg.sig()); return L.join('\n');
  },
  level(code, to, cat) { const s = Store.student(code), c = cat || Store.cat(code); return TT[c][to === 's' ? 0 : 1].replace('{n}', to === 's' ? Msg.first(s) : s.name) + '\n\n' + Msg.sig(); },
  custom(code, text, to) { const s = Store.student(code); return text ? Msg.hi(s, to) + '\n' + text + '\n\n' + Msg.sig() : ''; },
  login(code, to) { const s = Store.student(code); return Msg.hi(s, to) + '\nبوابة الطالب وولي الأمر — مستر ' + DB.teacher.name + ':\n' + Msg.famUrl() + '\nكود الطالب: ' + s.code + '\nالرقم السري: ' + s.pin + '\nهتلاقوا فيها الدرجات والحضور ورسايل المستر.\n\n' + Msg.sig(); },
  times(code, to) { const s = Store.student(code), g = Store.group(s.g); return Msg.hi(s, to) + '\nمواعيد مجموعة ' + Store.gFull(g) + ':\n' + g.slots.map(x => '• ' + x.day + ' من ' + U.t12(x.from) + ' لـ ' + U.t12(x.to)).join('\n') + '\n📍 ' + g.place + '\n\n' + Msg.sig(); },

  targets(s, to) { const r = []; if (to !== 's' && s.parentPhone) r.push(['p', 'ولي الأمر', s.parentPhone]); if (to !== 'p' && s.phone && !(to === 'b' && s.same)) r.push(['s', 'الطالب', s.phone]); return r; },
  btns(code, to, textFor, kind) { const s = Store.student(code); return Msg.targets(s, to).map(([k, l, ph]) => '<a class="btn soft sm" target="_blank" rel="noopener" href="' + U.wa(ph, textFor(k)) + '" onclick="Msg.sent(this,' + code + ',' + q(kind) + ')">' + I('wa', 'sm') + l + '</a>').join(''); },
  sent(el, code, kind) { el.classList.remove('soft'); el.classList.add('aub'); Store.logMsg({ s: code, kind }); Store.save(); },
  bulk(title, codes, to, textFor, kind) {
    U.modal('<h3>' + U.esc(title) + ' · ' + codes.length + ' طالب</h3><p class="mu fw sm">كل زرار بيفتح واتساب والرسالة مكتوبة جاهزة. الزرار بيغمق بعد ما تبعت.</p>' +
      (codes.map(c => { const s = Store.student(c); return '<div class="ln"><span><b>' + U.esc(s.name) + '</b><small>' + s.code + '</small></span><span class="btns">' + Msg.btns(c, to, k => textFor(c, k), kind) + '</span></div>'; }).join('') || U.empty()), { wide: true });
  },
  // بعد «تسجيل اليوم»: الغياب + تقرير الحاضرين
  session(gid, d) {
    const g = Store.group(gid), rows = Store.sessAtt(gid, d), abs = rows.filter(a => a.st === 'a'), pres = rows.filter(a => a.st === 'p'), to = DB.notif.to;
    const sec = (title, list, kind) => '<h4 style="margin:16px 0 4px">' + title + ' (' + list.length + ')</h4>' + (list.map(a => { const s = Store.student(a.s); return '<div class="ln"><span><b>' + U.esc(s.name) + '</b><small>' + s.code + '</small></span><span class="btns">' + Msg.btns(a.s, to, k => Msg[kind](a.s, { to: k, g: gid, d }), kind) + '</span></div>'; }).join('') || '<p class="mu sm">مفيش</p>');
    U.modal('<h3>رسايل حصة ' + U.esc(Store.gName(g)) + ' · ' + U.short(d) + '</h3><p class="mu fw sm">اختياري — لو مش عايز تبعت اقفل النافذة، الحصة اتسجلت خلاص.</p>' +
      (DB.notif.absence ? sec('الغياب', abs, 'absence') : '') + (DB.notif.report ? sec('تقرير الحاضرين', pres, 'report') : ''), { wide: true });
  },
};

// ======================= شاشة الرسايل =======================
const PO = {
  st() { return App.st.po = App.st.po || { to: 'b', tgt: 'all', body: '', files: [] }; },
  async addFiles(inp) {
    const p = PO.st(), lim = window.Sync && Sync.live ? 10 * 1048576 : 1.5 * 1048576;
    for (const f of inp.files) {
      if (f.size > lim) { U.toast(f.name + ' كبير أوي (أقصى ' + U.size(lim) + ')', 'bad'); continue; }
      const url = window.Sync && Sync.live ? await Sync.upload(f) : await U.readFile(f);
      if (url) p.files.push({ name: f.name, type: f.type, size: f.size, url });
    }
    inp.value = ''; PO.paintFiles();
  },
  paintFiles() { const el = document.getElementById('pof'); if (el) el.innerHTML = PO.st().files.map((f, i) => '<span>' + I(f.type.startsWith('image') ? 'image' : 'file', 'sm') + U.esc(f.name) + ' · ' + U.size(f.size) + '<button onclick="PO.st().files.splice(' + i + ',1);PO.paintFiles()">' + I('x', 'sm') + '</button></span>').join(''); },
  send() {
    const p = PO.st(), body = (document.getElementById('pob').value || '').trim();
    if (!body && !p.files.length) return U.toast('اكتب رسالة أو ضيف ملف', 'bad');
    DB.posts.push({ id: Store.nid(), title: '', body, to: p.to, tgt: p.tgt, files: p.files, d: U.today(), tm: U.now() });
    Store.log('post', 'رسالة لـ ' + Store.tgtName(p.tgt) + ': ' + (body || p.files[0].name).slice(0, 60));
    App.st.po = { to: p.to, tgt: p.tgt, body: '', files: [] }; App.refresh(); U.toast('اتبعتت — هتظهر عندهم في البوابة');
  },
  del(id) { U.confirm('حذف الرسالة؟', 'هتختفي من البوابة عند الطلاب وأولياء الأمور.', 'احذف', () => { DB.posts = DB.posts.filter(p => p.id !== id); App.refresh(); }); },
};
const WB = { // واتساب جماعي حسب الفئة
  st() { return App.st.wb = App.st.wb || { g: '*', seg: 'all', to: DB.notif.to, ty: 'monthly', tx: '' }; },
  list() {
    const b = WB.st(), mem = b.g === '*' ? Store.active() : Store.members(b.g), today = U.today();
    if (b.seg === 'abs') return mem.filter(s => Store.stAtt(s.code).some(a => a.d === today && a.st === 'a'));
    if (b.seg === 'np') return mem.filter(s => Store.payState(s.code) === 'up');
    if (b.seg === 'df') return mem.filter(s => Store.debt(s.code) > 0);
    return mem.filter(s => b.seg === 'all' || Store.cat(s.code) === b.seg);
  },
  send() {
    const b = WB.st(), codes = WB.list().map(s => s.code);
    if (b.ty === 'new' && !b.tx.trim()) return U.toast('اكتب الرسالة', 'bad');
    const f = (c, k) => b.ty === 'new' ? Msg.custom(c, b.tx.trim(), k) : b.ty === 'monthly' ? Msg.monthly(c, { to: k }) : b.ty === 'times' ? Msg.times(c, k) : b.ty === 'login' ? Msg.login(c, k) : Msg.level(c, k);
    Msg.bulk(b.g === '*' ? 'كل الطلاب' : Store.gName(Store.group(b.g)), codes, b.to, f, b.ty);
  },
};

V.msgs = () => {
  const p = PO.st(), tab = App.st.mt || 'portal';
  const tgts = [['all', 'كل الطلاب']].concat(GRADES.filter(gr => DB.groups.some(g => g.grade === gr)).map(gr => ['grade:' + gr, gr]), Store.groups().map(g => ['group:' + g.id, Store.gFull(g)]));
  let h = '<div class="dtop"><h1 style="font-size:24px">الرسايل</h1></div><div class="tabs"><button class="' + (tab === 'portal' ? 'on' : '') + '" onclick="App.st.mt=\'portal\';App.render()">' + I('send', 'sm') + 'رسايل البوابة</button><button class="' + (tab === 'wa' ? 'on' : '') + '" onclick="App.st.mt=\'wa\';App.render()">' + I('wa', 'sm') + 'واتساب</button></div>';
  if (tab === 'portal') {
    if (!DB.notif.portal) h += '<div class="warn">' + I('pause') + '<span>رسايل البوابة مقفولة من الإعدادات — الطلاب مش هيشوفوا الرسايل الجديدة. <a href="#settings">افتحها</a></span></div>';
    h += '<div class="panel"><div class="ph"><h2>' + I('send') + 'رسالة جديدة</h2></div>' +
      '<label class="f" style="margin-top:0">تروح لمين</label>' + U.seg([['b', 'الطلاب وأولياء الأمور'], ['s', 'الطلاب بس'], ['p', 'أولياء الأمور بس']], p.to, "v=>{PO.st().to=v;PO.st().body=document.getElementById('pob').value;App.render()}") +
      '<label class="f">أنهي طلاب</label><select class="in" onchange="PO.st().tgt=this.value">' + U.opts(tgts, p.tgt) + '</select>' +
      '<label class="f">الرسالة</label><textarea class="in" id="pob" rows="4" placeholder="مثلاً: امتحان الوحدة التانية يوم الخميس، ذاكروا كويس" oninput="PO.st().body=this.value">' + U.esc(p.body) + '</textarea>' +
      '<label class="drop">' + I('clip') + 'ضيف صورة أو ملف (PDF، وورد...)<input type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp3,.m4a" onchange="PO.addFiles(this)"></label><div class="files" id="pof"></div>' +
      '<div class="btns" style="margin-top:14px"><button class="btn gold" onclick="PO.send()">' + I('send') + 'ابعت</button><button class="btn soft" onclick="PO.st().body=Msg.timesAll();document.getElementById(\'pob\').value=PO.st().body">' + I('clock', 'sm') + 'اكتب المواعيد</button></div></div>';
    const list = DB.posts.slice().sort((a, b) => (b.d + b.tm).localeCompare(a.d + a.tm)).slice(0, App.st.pn || 20);
    h += '<h2 style="font-size:16px;margin:20px 4px 10px" class="mu">الرسايل اللي اتبعتت (' + DB.posts.length + ')</h2>' + (list.map((x, i) => V.post(x, i, true)).join('') || U.empty('لسه مبعتش رسايل', 'send'));
  } else {
    const b = WB.st(), n = WB.list().length;
    if (!DB.notif.wa) h += '<div class="warn">' + I('pause') + '<span>رسايل الواتساب التلقائية بعد الحصة مقفولة. تقدر تبعت يدوي من هنا عادي، أو <a href="#settings">تفتحها من الإعدادات</a>.</span></div>';
    h += '<div class="panel"><div class="ph"><h2>' + I('wa') + 'واتساب لمجموعة طلاب</h2></div>' +
      '<label class="f" style="margin-top:0">المجموعة</label><select class="in" onchange="WB.st().g=this.value;App.render()"><option value="*">كل الطلاب</option>' + U.opts(Store.groups().map(g => [g.id, Store.gFull(g)]), b.g) + '</select>' +
      '<label class="f">مين بالظبط</label><div class="scroll-x">' + [['all', 'الكل'], ['top', 'المتفوقين'], ['up', 'في تحسن'], ['dn', 'في تراجع'], ['wk', 'محتاجين متابعة'], ['abs', 'غابوا النهارده']].concat(App.can('money') ? [['np', 'مدفعوش الشهر'], ['df', 'عليهم آجل']] : []).map(([k, l]) => '<button class="chip ' + (b.seg === k ? 'on' : '') + '" onclick="WB.st().seg=\'' + k + '\';App.render()">' + l + '</button>').join('') + '</div>' +
      '<label class="f">تروح لمين</label>' + U.seg([['p', 'ولي الأمر'], ['s', 'الطالب'], ['b', 'الاتنين']], b.to, "v=>{WB.st().to=v;App.render()}") +
      '<label class="f">الرسالة</label>' + U.seg([['monthly', 'تقرير شهري'], ['level', 'رسالة المستوى'], ['times', 'المواعيد'], ['login', 'بيانات الدخول'], ['new', 'رسالتي']], b.ty, "v=>{WB.st().ty=v;App.render()}") +
      (b.ty === 'new' ? '<textarea class="in" style="margin-top:10px" placeholder="اكتب رسالتك" oninput="WB.st().tx=this.value">' + U.esc(b.tx) + '</textarea>' : '') +
      '<button class="btn gold" style="margin-top:14px" onclick="WB.send()">' + I('wa') + 'جهّز الرسايل (' + n + ' طالب)</button></div>';
  }
  return h;
};
V.msgs_after = () => PO.paintFiles();
Msg.timesAll = () => 'مواعيد المجموعات:\n' + Store.groups().map(g => '• ' + Store.gFull(g) + ': ' + g.slots.map(s => s.day + ' ' + U.t12(s.from)).join(' و ')).join('\n');

// كارت رسالة (بيتعرض عند المستر وفي البوابة)
V.post = (x, i, staff) => {
  // الملفات أونلاين متخزنة كـ oaf:<id> وبتتحمل لما تظهر (Sync.hydrate)
  const src = f => /^oaf:/.test(f.url) ? '" data-oaf="' + U.esc(f.url.slice(4)) : U.esc(f.url);
  const files = (x.files || []).map(f => f.type && f.type.startsWith('image') ? '<a class="img" href="' + (/^oaf:/.test(f.url) ? '#' : U.esc(f.url)) + '" target="_blank" rel="noopener" download="' + U.esc(f.name) + '"><img src="' + src(f) + '" alt="' + U.esc(f.name) + '" loading="lazy"></a>' : '<a class="att-f" href="' + src(f) + '" target="_blank" rel="noopener" download="' + U.esc(f.name) + '">' + I('file') + '<span style="flex:1">' + U.esc(f.name) + '</span><span class="mu xs">' + U.size(f.size) + '</span>' + I('download', 'sm') + '</a>').join('');
  return '<div class="post" style="--i:' + Math.min(i, 10) + '"><div class="pt"><span class="av">OA</span><div><b>مستر ' + U.esc(DB.teacher.name) + '</b><small>' + U.long(x.d) + ' · ' + U.t12(x.tm) + (staff ? ' · ' + U.esc(Store.tgtName(x.tgt)) + ' · ' + ({ b: 'طلاب وأولياء أمور', s: 'طلاب', p: 'أولياء أمور' }[x.to]) : '') + '</small></div>' + (staff && !App.isAsst() ? '<button class="btn soft ic" onclick="PO.del(' + x.id + ')">' + I('trash', 'sm') + '</button>' : '') + '</div>' + (x.title ? '<b>' + U.esc(x.title) + '</b>' : '') + (x.body ? '<p>' + U.esc(x.body) + '</p>' : '') + files + '</div>';
};
