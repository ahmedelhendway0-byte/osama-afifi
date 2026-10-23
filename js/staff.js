// شاشات المستر والأسيستنت: الرئيسية، تسجيل الحصة، فورم الطالب، ملف الطالب

// ======================= الرئيسية =======================
V.home = () => {
  const today = U.today(), m = U.month(), sel = App.st.hd || today, hr = new Date().getHours();
  const act = Store.active(), presToday = DB.att.filter(a => a.d === today && a.st === 'p').length;
  const rev = Store.monthRevenue(m), exp = Store.expenses(m);
  const hi = hr < 12 ? 'صباح الخير' : 'مساء الخير';
  let h = '<div class="hello"><div><h1>' + hi + ' يا مستر ' + U.esc(DB.teacher.name.split(' ')[0]) + '</h1><p>' + U.long(today) + ' · ' + (Store.dayGroups(today).length ? Store.dayGroups(today).length + ' حصص النهارده' : 'مفيش حصص النهارده') + '</p></div>' +
    (App.can('add') ? '<button class="btn gold" onclick="SF.open()">' + I('userplus') + 'طالب جديد</button>' : '') + '</div>';
  h += '<div class="kpis"><a class="k hl" href="#students" style="--i:0"><div class="ic">' + I('users') + '</div><span>الطلاب</span>' + U.num(act.length) + '<small>' + Store.groups().length + ' مجموعات</small></a>' +
    '<a class="k" href="#att" style="--i:1"><div class="ic">' + I('att') + '</div><span>حضروا النهارده</span>' + U.num(presToday) + '<small>' + (DB.att.filter(a => a.d === today && a.st === 'a').length) + ' غياب</small></a>' +
    (App.can('money') ? '<a class="k" href="#money" style="--i:2"><div class="ic">' + I('trend') + '</div><span>إيراد ' + U.MONTHS[+m.slice(5) - 1] + '</span>' + U.num(rev, ' ج') + '<small>مصاريف ' + U.money(exp) + '</small></a>' +
      '<a class="k gd" href="#money" style="--i:3"><div class="ic">' + I('wallet') + '</div><span>الصافي</span>' + U.num(rev - exp, ' ج') + '<small>الإيراد − المصاريف</small></a>'
      : '<a class="k" href="#grades" style="--i:2"><div class="ic">' + I('exam') + '</div><span>امتحانات الشهر</span>' + U.num(DB.assess.filter(a => a.d.startsWith(m)).length) + '</a><a class="k gd" href="#groups" style="--i:3"><div class="ic">' + I('layers') + '</div><span>المجموعات</span>' + U.num(Store.groups().length) + '</a>') + '</div>';

  if (!DB.students.length && App.can('add')) h += '<div class="panel" style="--i:2;background:var(--aub);color:#fff"><div class="sp"><div><h2 style="font-size:20px">ابدأ بإضافة طلابك</h2><p style="margin:4px 0 0;color:var(--silver)" class="fw">الطالب بياخد كود تلقائي، وتسجّله في مجموعته. بعدها تسجيل الحصة بيبقى بالكود أو الاسم.</p></div><button class="btn gold" onclick="SF.open()">' + I('userplus') + 'أول طالب</button></div></div>';

  // الحصص في اليوم المختار + الأسبوع
  const ws = U.addDays(today, -((U.parse(today).getDay() + 1) % 7)), week = [...Array(7)].map((_, i) => U.addDays(ws, i));
  const live = Store.liveGroup(), gs = Store.dayGroups(sel), n = U.mins(U.now());
  const sesHtml = gs.map(g => {
    const s = Store.slot(g, sel), rows = Store.sessAtt(g.id, sel), pr = rows.filter(a => a.st === 'p').length, cl = Store.isClosed(g.id, sel);
    const now = sel === today && live && live.id === g.id, past = sel < today || (sel === today && n > U.mins(s.to));
    return '<a class="ses ' + (now ? 'now' : cl || past ? 'done' : '') + '" href="#att" onclick="App.st.ag=' + q(g.id) + ';App.st.ad=' + q(sel) + '"><div class="tm"><b>' + U.t12s(s.from) + '</b><small>لـ ' + U.t12(s.to) + '</small></div><div class="tx"><b>' + U.esc(Store.gName(g)) + (now ? '<span class="live">دلوقتي</span>' : '') + '</b><small>' + I('pin') + U.esc(g.place) + ' · ' + Store.members(g.id).length + ' طالب' + (rows.length ? ' · حضر ' + pr : '') + (cl ? ' · ' + I('check') + 'اتسجلت' : '') + '</small></div><span class="go">' + I('go') + '</span></a>';
  }).join('') || U.empty('مفيش حصص يوم ' + U.dayName(sel), 'cal');
  h += '<div class="grid2"><div class="panel" style="--i:3"><div class="ph"><h2>' + I('clock') + (sel === today ? 'حصص النهارده' : 'حصص ' + U.long(sel)) + '</h2><a class="lnk" href="#groups">كل المجموعات ' + I('chev', 'sm') + '</a></div>' +
    '<div class="wk" style="margin-bottom:14px">' + week.map(d => '<button class="' + (d === sel ? 'on' : '') + (d === today ? ' td' : '') + '" onclick="App.st.hd=' + q(d) + ';App.render()">' + U.SHORT[U.dayName(d)] + '<b>' + U.parse(d).getDate() + '</b><div class="dots">' + Store.dayGroups(d).map(() => '<i></i>').join('') + '</div></button>').join('') + '</div>' + sesHtml + '</div>';

  // تنبيهات
  const unpaid = act.filter(s => Store.payState(s.code) === 'up'), streak = act.filter(s => Store.absStreak(s.code) >= 2), debt = act.filter(s => Store.debt(s.code) > 0);
  const al = [];
  if (App.can('money') && unpaid.length) al.push(['a', 'coins', unpaid.length + ' طالب مدفعوش ' + U.MONTHS[+m.slice(5) - 1], 'دوس عشان تشوفهم', "App.st.sf='up';location.hash='students'"]);
  if (streak.length) al.push(['', 'alert', streak.length + ' طالب غابوا حصتين أو أكتر ورا بعض', streak.slice(0, 3).map(s => s.name.split(' ')[0]).join('، '), "App.st.sf='abs';location.hash='students'"]);
  if (App.can('money') && debt.length) al.push(['', 'receipt', debt.length + ' طالب عليهم آجل', U.money(debt.reduce((a, s) => a + Store.debt(s.code), 0)), "App.st.sf='df';location.hash='students'"]);
  const top = act.map(s => [s, Store.avg(s.code)]).filter(x => x[1] !== null).sort((a, b) => b[1] - a[1]).slice(0, 3);
  h += '<div><div class="panel" style="--i:4"><div class="ph"><h2>' + I('bell') + 'محتاج انتباهك</h2></div>' + (al.map(a => '<div class="alrt ' + a[0] + '" onclick="' + a[4] + '"><div class="ai">' + I(a[1]) + '</div><div><b>' + a[2] + '</b><small>' + U.esc(a[3]) + '</small></div>' + I('chev', 'sm') + '</div>').join('') || U.empty('كله تمام', 'check')) + '</div>' +
    (top.length ? '<div class="panel" style="--i:5"><div class="ph"><h2>' + I('award') + 'الأوائل</h2><a class="lnk" href="#grades">الدرجات ' + I('chev', 'sm') + '</a></div>' + top.map((x, i) => '<div class="ln" style="cursor:pointer" onclick="Prof.open(' + x[0].code + ')"><span class="btns"><span class="av ' + (i ? '' : 'lg') + '" style="' + (i ? '' : 'width:42px;height:42px;font-size:17px') + '">' + (i + 1) + '</span><span><b>' + U.esc(x[0].name) + '</b><small>' + U.esc(Store.gName(Store.group(x[0].g))) + '</small></span></span><span class="tag a">' + x[1] + '%</span></div>').join('') + '</div>' : '') + '</div></div>';

  if (App.can('money') && DB.att.length) {
    const days = [...Array(14)].map((_, i) => U.addDays(today, i - 13));
    h += '<div class="panel" style="--i:6"><div class="ph"><h2>' + I('trend') + 'الإيراد آخر 14 يوم</h2></div>' + U.line(days.map(d => Store.revenue([d, d])), days.map(U.short)) + '</div>';
  }
  return h;
};

// ======================= تسجيل الحصة =======================
const Att = {
  gid() {
    const gs = Store.groups(); if (!gs.length) return null;
    let g = App.st.ag;
    if (!g || !Store.group(g)) g = App.st.ag = (Store.liveGroup() || Store.dayGroups(Att.d())[0] || gs[0]).id;
    return g;
  },
  d() { return App.st.ad || U.today(); },
  match(s, qq) {
    if (/^\d+$/.test(qq)) return String(s.code).startsWith(qq) || (qq.length >= 3 && ((s.phone || '').endsWith(qq) || (s.parentPhone || '').endsWith(qq)));
    const n = U.norm(s.name); return U.norm(qq).split(' ').every(w => n.includes(w));
  },
  // البحث السريع: كود / أول حروف الاسم / آخر أرقام التليفون ثم Enter
  search(v) {
    App.st.aq = v;
    const el = document.getElementById('res'); if (!el) return;
    const qq = v.trim(); Att.res = [];
    if (!qq) { el.innerHTML = ''; return; }
    const gid = Att.gid(), d = Att.d(), here = new Set(Store.sessAtt(gid, d).filter(a => a.st === 'p').map(a => a.s));
    const list = Store.active().filter(s => Att.match(s, qq));
    list.sort((a, b) => (here.has(a.code) - here.has(b.code)) || ((a.g !== gid) - (b.g !== gid)) || (String(a.code) === qq ? -1 : 0) || a.name.localeCompare(b.name, 'ar'));
    Att.res = list.map(s => s.code);
    el.innerHTML = list.slice(0, 6).map((s, i) => '<button class="ri' + (i === 0 ? ' first' : '') + '" onclick="Att.pick(' + s.code + ')"><span class="av">' + U.initial(s.name) + '</span><div><b>' + U.esc(s.name) + '</b><small>' + s.code + ' · ' + U.esc(Store.gName(Store.group(s.g))) + '</small></div>' +
      (here.has(s.code) ? '<span class="tag a">' + I('check') + 'حضر</span>' : s.g !== gid ? '<span class="tag g">تعويض</span>' : '<span class="tag gl">Enter</span>') + '</button>').join('') ||
      '<div class="ri none">مفيش طالب بالاسم ده' + (App.can('add') ? '<button class="btn gold sm" style="margin-inline-start:10px" onclick="SF.open(null,{gid:' + q(gid) + ',mark:1,name:' + q(/^\d+$/.test(qq) ? '' : qq) + '})">' + I('userplus', 'sm') + 'سجّله جديد</button>' : '') + '</div>';
  },
  key(e) {
    if (e.key === 'Enter') { e.preventDefault(); if (Att.res && Att.res[0]) Att.pick(Att.res[0]); }
    if (e.key === 'Escape') { e.target.value = ''; Att.search(''); }
  },
  pick(code) {
    const gid = Att.gid(), d = Att.d(), s = Store.student(code);
    const r = Store.markPresent(code, gid, d);
    if (r.dup) { U.toast(s.name + ' متسجل حاضر قبل كده', 'bad'); return; }
    App.st.aq = ''; Store.save();
    U.toast(s.name + (r.a.mk ? ' — تعويض' : ' — حضر'));
    App.render();
    const i = document.getElementById('q'); if (i) i.focus();
  },
  setA(code, v) {
    const gid = Att.gid(), d = Att.d(), a = Store.rec(code, gid, d);
    if (a && a.st === v) Store.unmark(code, gid, d);
    else if (v === 'p') Store.markPresent(code, gid, d);
    else Store.markAbsent(code, gid, d);
    App.refresh();
  },
  setPay(code, v) {
    const gid = Att.gid(), d = Att.d(), g = Store.group(gid);
    if (g.payMode === 'month') Store.toggleSub(code, U.month(d));
    else { const a = Store.rec(code, gid, d); if (!a || a.st !== 'p') return; a.paid = v === 'paid' ? a.fee : 0; }
    App.refresh();
  },
  score(type, code, el) {
    const a = Store.ensureSessAssess(Att.gid(), Att.d(), type); Store.setScore(a.id, code, el.value); Store.save();
    el.parentNode.classList.toggle('has', el.value !== '');
  },
  opt(k, v) { Store.setSopt(Att.gid(), Att.d(), k, v); App.refresh(); },
  setG(v) { App.st.ag = v; App.st.aq = ''; App.render(); },
  setD(v) { App.st.ad = v || U.today(); App.render(); },
  // التسجيل تاني لنفس المجموعة في نفس اليوم = تعديل نفس الحصة (مفيش حاجة بتتكرر)
  save() {
    const gid = Att.gid(), d = Att.d(), was = Store.isClosed(gid, d), abs = Store.closeSession(gid, d), g = Store.group(gid);
    const pr = Store.sessAtt(gid, d).filter(a => a.st === 'p').length;
    Store.log('att', (was ? 'تعديل ' : 'تسجيل ') + Store.gName(g) + ' · ' + Store.sessLabel(gid, d).split(' ·')[0] + ' · حضر ' + pr);
    Store.save(); App.render();
    U.toast(was ? 'اتعدلت الحصة' : 'اتسجلت الحصة' + (abs.length ? ' · ' + abs.length + ' غياب' : ''));
    if (!was && DB.notif.wa && App.can('msgs')) setTimeout(() => Msg.session(gid, d), 350);
  },
  reopen() { Store.reopen(Att.gid(), Att.d()); App.refresh(); },
  row(s, g, d, o, i) {
    const a = Store.rec(s.code, g.id, d), st = a ? a.st : '';
    const inp = (type, mx) => { const v = Store.sessScore(g.id, d, type, s.code); return '<label class="score ' + (v !== '' ? 'has' : '') + '">' + (type === 'quiz' ? 'كويز' : 'امتحان') + '<input type="number" inputmode="decimal" min="0" max="' + mx + '" placeholder="—" value="' + v + '" onchange="Att.score(\'' + type + '\',' + s.code + ',this)">/' + mx + '</label>'; };
    let pay = '';
    if (App.can('money') || true) {
      if (g.payMode === 'month') { const p = !!Store.sub(s.code, U.month(d)); pay = '<div class="pay2"><button class="' + (p ? 'on g' : '') + '" onclick="Att.setPay(' + s.code + ')">' + I(p ? 'check' : 'coins', 'sm') + (p ? 'دفع ' + U.MONTHS[+d.slice(5, 7) - 1] : 'مدفعش الشهر — دوس لما يدفع') + '</button></div>'; }
      else if (st === 'p') pay = '<div class="pay2"><button class="' + (a.paid >= a.fee ? 'on g' : '') + '" onclick="Att.setPay(' + s.code + ',\'paid\')">' + I('check', 'sm') + 'دفع ' + U.fmt(a.fee) + '</button><button class="' + (a.paid < a.fee ? 'on' : '') + '" onclick="Att.setPay(' + s.code + ',\'df\')">' + I('clock', 'sm') + 'آجل</button></div>';
    }
    return '<div class="st ' + st + '" style="--i:' + Math.min(i, 20) + '"><div class="t" onclick="Prof.open(' + s.code + ')"><span class="av ' + (Store.isGirl(s) ? 'g' : '') + '">' + U.initial(s.name) + '</span><div class="nm"><b>' + U.esc(s.name) + '</b><small>' + s.code + (a && a.mk ? ' · تعويض من ' + U.esc(Store.gName(Store.group(s.g))) : '') + (a && a.tm ? ' · ' + U.t12(a.tm) : '') + '</small></div>' + (Store.absStreak(s.code) >= 2 && st !== 'p' ? '<span class="tag g">' + Store.absStreak(s.code) + ' غياب</span>' : '') + '</div>' +
      '<div class="acts"><button class="tog ' + (st === 'p' ? 'p' : '') + '" onclick="Att.setA(' + s.code + ',\'p\')">' + I('check') + 'حضر</button><button class="tog ' + (st === 'a' ? 'a' : '') + '" onclick="Att.setA(' + s.code + ',\'a\')">' + I('x') + 'غاب</button>' +
      (st === 'p' && o.qz ? inp('quiz', o.qzMax) : '') + (st === 'p' && o.ex ? inp('exam', o.exMax) : '') + '</div>' + pay + '</div>';
  },
};

V.att = () => {
  const gid = Att.gid();
  if (!gid) return U.empty('مفيش مجموعات لسه', 'layers', App.isAsst() ? '' : '<a class="btn gold" href="#groups">' + I('plus') + 'ضيف مجموعة</a>');
  const d = Att.d(), g = Store.group(gid), rows = Store.sessAtt(gid, d), pres = rows.filter(a => a.st === 'p'), abs = rows.filter(a => a.st === 'a'), mem = Store.members(gid);
  const closed = Store.isClosed(gid, d), o = Store.sopt(gid, d), today = Store.dayGroups(d).map(x => x.id), slot = Store.slot(g, d);
  const mids = new Set(mem.map(s => s.code)), extra = rows.filter(a => !mids.has(a.s)).map(a => Store.student(a.s)).filter(Boolean);
  const list = mem.concat(extra).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  const subs = g.payMode === 'month' ? mem.filter(s => Store.sub(s.code, U.month(d))).length : 0;
  const collected = pres.reduce((x, a) => x + a.paid, 0) + DB.subs.filter(x => x.g === gid && x.d === d).reduce((s, x) => s + x.amt, 0);
  const others = Store.groups().slice().sort((a, b) => today.includes(b.id) - today.includes(a.id));
  let h = '<div class="dtop"><h1 style="font-size:24px">تسجيل الحصة</h1></div>' +
    '<div class="scroll-x">' + others.map(x => '<button class="chip ' + (x.id === gid ? 'on' : '') + '" onclick="Att.setG(' + q(x.id) + ')">' + (today.includes(x.id) ? '<span class="dot" style="position:static;box-shadow:none"></span>' : '') + U.esc(Store.gName(x)) + '</button>').join('') + '</div>' +
    '<div class="panel" style="padding:14px"><div class="sp"><div><span class="tag a" style="margin-bottom:6px">' + I('cal') + Store.sessLabel(gid, d) + '</span><h2 style="font-size:19px">' + U.esc(Store.gFull(g)) + '</h2><p class="mu fw sm" style="margin:2px 0 0">' + I('clock', 'sm') + ' ' + (slot ? U.t12s(slot.from) + ' ← ' + U.t12(slot.to) : Store.gTime(g)) + ' · ' + I('pin', 'sm') + ' ' + U.esc(g.place) + ' · ' + (g.payMode === 'month' ? U.money(g.monthPrice) + ' شهري' : U.money(g.price) + ' للحصة') + '</p></div>' +
    '<input class="in" type="date" style="width:auto" value="' + d + '" max="' + U.today() + '" onchange="Att.setD(this.value)"></div>' +
    (slot ? '' : '<div class="warn">' + I('alert') + 'المجموعة دي مالهاش ميعاد يوم ' + U.dayName(d) + ' — لو دي حصة إضافية كمّل عادي.</div>') +
    '<div class="btns" style="margin-top:12px">' + (App.can('grades') ? '<button class="chip ' + (o.qz ? 'on' : '') + '" onclick="Att.opt(\'qz\',' + !o.qz + ')">' + I(o.qz ? 'check' : 'plus') + 'كويز النهارده' + (o.qz ? ' /' + o.qzMax : '') + '</button>' +
      '<button class="chip ' + (o.ex ? 'on' : '') + '" onclick="Att.opt(\'ex\',' + !o.ex + ')">' + I(o.ex ? 'check' : 'plus') + 'امتحان في الحصة' + (o.ex ? ' /' + o.exMax : '') + '</button>' +
      ((o.qz || o.ex) ? '<button class="chip" onclick="Att.maxes()">' + I('edit') + 'الدرجة النهائية</button>' : '') : '') + '</div></div>';
  if (closed) h += '<div class="closed">' + I('check') + '<div><b>الحصة اتسجلت' + (Store.closedAt(gid, d) ? ' الساعة ' + U.t12(Store.closedAt(gid, d)) : '') + '</b><small style="display:block;color:var(--silver);font-weight:600;font-size:12px">لو فيه غلط عدّله ودوس «حفظ التعديلات» — هيتعدل نفس التسجيل.</small></div>' + (DB.notif.wa && App.can('msgs') ? '<button class="btn gold sm" onclick="Msg.session(' + q(gid) + ',' + q(d) + ')">' + I('wa', 'sm') + 'رسايل الحصة</button>' : '') + '<button class="btn sm" style="background:#ffffff1c;color:#fff" onclick="Att.reopen()">' + I('undo', 'sm') + 'فتحها تاني</button></div>';
  h += '<div class="search">' + I('search') + '<input id="q" placeholder="الكود أو الاسم أو آخر أرقام التليفون" autocomplete="off" value="' + U.esc(App.st.aq || '') + '" oninput="Att.search(this.value)" onkeydown="Att.key(event)">' +
    (App.can('add') ? '<button class="btn gold ic" title="طالب جديد" onclick="SF.open(null,{gid:' + q(gid) + ',mark:1})">' + I('userplus') + '</button>' : '') + '</div><div id="res" class="res"></div>' +
    '<div class="stat"><span>الطلاب<b>' + mem.length + '</b></span><span>حضروا<b>' + pres.length + '</b></span><span>غابوا<b>' + abs.length + '</b></span>' + (g.payMode === 'month' ? '<span>دفعوا الشهر<b>' + subs + '/' + mem.length + '</b></span>' : '') + (App.can('money') ? '<span>اتحصّل النهارده<b>' + U.money(collected) + '</b></span>' : '') + '</div>';
  h += list.length ? '<div class="roster">' + list.map((s, i) => Att.row(s, g, d, o, i)).join('') + '</div>' : U.empty('لسه مفيش طلاب في المجموعة دي', 'users', App.can('add') ? '<button class="btn gold" onclick="SF.open(null,{gid:' + q(gid) + '})">' + I('userplus') + 'ضيف طالب</button>' : '');
  if (list.length) h += '<div class="savebar"><button class="btn gold" onclick="Att.save()">' + I('save') + (closed ? 'حفظ التعديلات' : 'تسجيل اليوم') + '</button></div>';
  return h;
};
V.att_after = () => { const i = document.getElementById('q'); if (i && App.st.aq) { i.focus(); Att.search(App.st.aq); } };
Att.maxes = () => {
  const o = Store.sopt(Att.gid(), Att.d());
  U.modal('<h3>الدرجة النهائية للحصة دي</h3><form id="mxf" onsubmit="event.preventDefault();Att.saveMax()"><div class="row2">' + (o.qz ? '<div><label class="f">الكويز من</label><input class="in big num" name="qzMax" type="number" min="1" value="' + o.qzMax + '"></div>' : '') + (o.ex ? '<div><label class="f">الامتحان من</label><input class="in big num" name="exMax" type="number" min="1" value="' + o.exMax + '"></div>' : '') + '</div><button class="btn aub wide" style="margin-top:16px">حفظ</button></form>');
};
Att.saveMax = () => { const f = U.form('mxf'); ['qzMax', 'exMax'].forEach(k => { if (f[k]) Store.setSopt(Att.gid(), Att.d(), k, +f[k]); }); U.close(); App.refresh(); };

// ======================= فورم الطالب =======================
const SF = {
  open(code, opt) {
    opt = opt || {}; SF.opt = opt;
    const s = code ? Store.student(code) : { name: opt.name || '', gender: 'ذكر', g: opt.gid || App.st.sg || '', parentPhone: '', phone: '', same: true, parentName: '', school: '', notes: '' };
    const gs = Store.groups();
    if (!s.g && gs[0]) s.g = gs[0].id;
    U.modal('<h3>' + (code ? 'تعديل بيانات ' + U.esc(s.name.split(' ')[0]) : 'طالب جديد') + '</h3><form id="sf" onsubmit="event.preventDefault();SF.save(' + (code || 0) + ')">' +
      '<label class="f">اسم الطالب</label><input class="in big" name="name" required autofocus value="' + U.esc(s.name) + '" placeholder="الاسم الثلاثي">' +
      '<label class="f">المجموعة</label>' + U.radio('g', gs.map(x => [x.id, Store.gName(x)]), s.g).replace('class="seg"', 'class="seg gc"') +
      '<label class="f">النوع</label>' + U.radio('gender', [['ذكر', 'ولد'], ['أنثى', 'بنت']], s.gender) +
      '<label class="f">تليفون ولي الأمر</label><input class="in big ltr" name="parentPhone" inputmode="tel" placeholder="01xxxxxxxxx" value="' + U.esc(s.parentPhone) + '" onblur="SF.check(this.value,' + (code || 0) + ')">' +
      '<label class="chk"><input type="checkbox" name="same" ' + (s.same ? 'checked' : '') + ' onchange="document.getElementById(\'sph\').classList.toggle(\'hide\',this.checked)"><i>' + I('check') + '</i>تليفون الطالب هو نفس تليفون ولي الأمر</label>' +
      '<div id="sph" class="' + (s.same ? 'hide' : '') + '"><label class="f">تليفون الطالب</label><input class="in big ltr" name="phone" inputmode="tel" placeholder="01xxxxxxxxx" value="' + U.esc(s.same ? '' : s.phone) + '"></div>' +
      '<div id="dup"></div>' +
      '<details style="margin-top:12px"' + (s.parentName || s.school ? ' open' : '') + '><summary class="mu fw sm" style="cursor:pointer">بيانات إضافية (اختياري)</summary><div class="row2"><div><label class="f">اسم ولي الأمر</label><input class="in" name="parentName" value="' + U.esc(s.parentName) + '"></div><div><label class="f">المدرسة</label><input class="in" name="school" value="' + U.esc(s.school) + '"></div></div>' +
      '<label class="f">ملاحظات</label><input class="in" name="notes" value="' + U.esc(s.notes) + '"></details>' +
      (opt.mark ? '<div class="note" style="margin-top:12px">هيتسجل حاضر في الحصة دي على طول بعد الحفظ.</div>' : '') +
      '<div class="' + (code ? '' : 'row2') + '" style="margin-top:16px">' + (code ? '' : '<button type="button" class="btn soft" onclick="SF.save(0,1)">' + I('plus') + 'حفظ وضيف غيره</button>') + '<button class="btn aub ' + (code ? 'wide' : '') + '">' + I('check') + 'حفظ</button></div></form>');
  },
  check(ph, code) {
    const s = Store.findByPhone(ph, code), el = document.getElementById('dup'); if (!el) return;
    el.innerHTML = s ? '<div class="warn">' + I('alert') + '<span>الرقم ده متسجل لـ <b>' + U.esc(s.name) + '</b> (' + s.code + '). لو أخوه/أخته كمّل عادي.</span></div>' : '';
  },
  save(code, again) {
    const f = U.form('sf');
    if (!f.name) return U.toast('اكتب اسم الطالب', 'bad');
    if (!f.parentPhone) return U.toast('اكتب تليفون ولي الأمر', 'bad');
    if (U.phone(f.parentPhone).length !== 11) return U.toast('تليفون ولي الأمر لازم 11 رقم', 'bad');
    if (!f.same && f.phone && U.phone(f.phone).length !== 11) return U.toast('تليفون الطالب لازم 11 رقم', 'bad');
    if (!f.g) return U.toast('اختار المجموعة', 'bad');
    if (code) { Store.updateStudent(code, f); U.close(); U.toast('اتحفظ'); Store.save(); if (document.getElementById('pmb')) return; App.render(); return; }
    const s = Store.addStudent(f);
    if (SF.opt.mark) Store.markPresent(s.code, Att.gid(), Att.d());
    Store.save(); App.st.aq = '';
    Store.log('student', 'طالب جديد: ' + s.name + ' (' + Store.gName(Store.group(s.g)) + ')', s.code); Store.save();
    U.toast('اتسجل ' + s.name.split(' ')[0] + ' · كود ' + s.code + ' · رقم سري ' + s.pin);
    if (again) { const g = f.g; App.render(); SF.open(null, { gid: g, mark: SF.opt.mark }); }
    else { U.close(); App.render(); }
  },
};

// ======================= ملف الطالب =======================
const Prof = {
  open(code) { App.st.pm = { code, tab: 'att', mode: 'report', to: DB.notif.to === 's' ? 's' : 'p', note: '' }; U.modal('<div id="pmb"></div>', { wide: true }); Prof.paint(); },
  set(k, v) { App.st.pm[k] = v; Prof.paint(); },
  paint() {
    const m = App.st.pm, code = m.code, s = Store.student(code), el = document.getElementById('pmb'); if (!el || !s) return;
    const g = Store.group(s.g), A = Store.stAtt(code), pr = A.filter(a => a.st === 'p').length, ab = A.length - pr, rate = Store.attRate(code), av = Store.avg(code), lv = Store.level(av), c = Store.cat(code), db = Store.debt(code), ps = Store.payState(code);
    let h = '<div class="prof-h"><span class="av lg">' + U.initial(s.name) + '</span><div style="flex:1;min-width:0"><h3>' + U.esc(s.name) + '</h3><small>كود ' + s.code + ' · ' + U.esc(Store.gFull(g)) + '</small><div class="btns" style="margin-top:6px"><span class="tag lv-' + lv[1] + '">' + lv[0] + '</span><span class="tag o">' + Store.catName(c) + '</span>' + (s.st === 'out' ? '<span class="tag g">منسحب</span>' : '') + (App.can('money') ? '<span class="tag ' + (ps === 'mp' || ps === 'paid' ? 'a' : 'g') + '">' + Store.payText(ps) + '</span>' : '') + '</div></div></div>' +
      '<div class="rings">' + U.ring(rate, 'الحضور') + U.ring(av, 'متوسط الدرجات', 'g') + '<div class="ring"><b style="position:static;display:block;font-size:30px;margin:8px 0 2px">' + ab + '</b><span>مرات الغياب</span><span class="xs">من ' + A.length + ' حصة</span></div></div>' +
      '<div class="info"><div><span>حضر</span><b>' + pr + ' حصة</b></div><div><span>غاب</span><b>' + ab + ' حصة' + (Store.absStreak(code) >= 2 ? ' <span class="tag g">آخر ' + Store.absStreak(code) + ' ورا بعض</span>' : '') + '</b></div>' +
      (A[0] ? '<div><span>آخر حصة</span><b>' + U.long(A[0].d) + ' · ' + (A[0].st === 'p' ? 'حضر' : 'غاب') + '</b></div>' : '') +
      '<div><span>ولي الأمر</span><b class="btns">' + (s.parentName ? U.esc(s.parentName) + ' · ' : '') + '<a class="ltr" href="tel:' + s.parentPhone + '">' + s.parentPhone + '</a></b></div>' +
      (!s.same && s.phone ? '<div><span>الطالب</span><b><a class="ltr" href="tel:' + s.phone + '">' + s.phone + '</a></b></div>' : '<div><span>تليفون الطالب</span><b class="mu sm">نفس تليفون ولي الأمر</b></div>') +
      (s.school ? '<div><span>المدرسة</span><b>' + U.esc(s.school) + '</b></div>' : '') + (s.notes ? '<div><span>ملاحظات</span><b>' + U.esc(s.notes) + '</b></div>' : '') +
      (App.can('money') && db ? '<div><span>عليه آجل</span><b class="btns">' + U.money(db) + '<button class="btn gold sm" onclick="Prof.pay(' + code + ')">سدّد</button></b></div>' : '') +
      '<div><span>دخول البوابة</span><b class="btns">كود ' + s.code + ' · رقم سري <span class="ltr tag gl" style="font-size:14px;letter-spacing:2px">' + U.esc(s.pin) + '</span>' + (App.can('msgs') && s.parentPhone ? '<a class="btn soft ic" title="ابعتها لولي الأمر" target="_blank" rel="noopener" href="' + U.wa(s.parentPhone, Msg.login(code)) + '">' + I('wa', 'sm') + '</a>' : '') + '</b></div></div>';
    const tabs = [['att', 'cal', 'الحضور'], ['gr', 'chart', 'الدرجات']].concat(App.can('money') ? [['pay', 'coins', 'الفلوس']] : []).concat(App.can('msgs') ? [['msg', 'wa', 'رسالة']] : []);
    h += '<div class="tabs">' + tabs.map(t => '<button class="' + (m.tab === t[0] ? 'on' : '') + '" onclick="Prof.set(\'tab\',\'' + t[0] + '\')">' + I(t[1], 'sm') + t[2] + '</button>').join('') + '</div>' + Prof.tab(m.tab, s);
    h += '<div class="btns" style="margin-top:16px">' + (App.can('add') ? '<button class="btn soft sm" onclick="SF.open(' + code + ')">' + I('edit', 'sm') + 'تعديل / نقل مجموعة</button>' +
      (s.st === 'out' ? '<button class="btn soft sm" onclick="Store.restore(' + code + ');Store.save();Prof.paint();App.render()">' + I('undo', 'sm') + 'رجّعه</button>' : '<button class="btn soft sm" onclick="Prof.out(' + code + ')">' + I('door', 'sm') + 'انسحاب</button>') : '') +
      (!App.isAsst() ? '<button class="btn soft sm" onclick="Prof.resetPw(' + code + ')">' + I('key', 'sm') + 'رقم سري جديد</button>' : '') +
      (App.can('del') ? '<button class="btn soft sm" onclick="Prof.del(' + code + ')">' + I('trash', 'sm') + 'حذف</button>' : '') + '</div>';
    el.innerHTML = h;
  },
  tab(t, s) {
    const code = s.code;
    if (t === 'att') {
      const A = Store.stAtt(code);
      return A.length ? '<div class="hist">' + A.map(a => '<span class="' + (a.st === 'a' ? 'a' : '') + (a.mk ? ' mk' : '') + '" title="' + U.esc(Store.gName(Store.group(a.g))) + '"><b>' + U.short(a.d) + '</b>حصة ' + Store.sessNo(a.g, a.d).n + ' · ' + (a.st === 'p' ? 'حضر' : 'غاب') + '</span>').join('') + '</div>' : U.empty('لسه مفيش حصص', 'cal');
    }
    if (t === 'gr') {
      const S = Store.scoresOf(code);
      if (!S.length) return U.empty('لسه مفيش درجات', 'chart');
      const last = S.slice(-8);
      return U.bars(last.map(x => Math.round(x.v / x.a.max * 100)), last.map(x => U.short(x.a.d)), 100) + S.slice().reverse().map(x => '<div class="ln"><span><b>' + U.esc(x.a.title) + '</b><small>' + assessName(x.a.type) + ' · ' + U.long(x.a.d) + '</small></span><span class="tag lv-' + Store.level(x.v / x.a.max * 100)[1] + '">' + x.v + ' / ' + x.a.max + '</span></div>').join('');
    }
    if (t === 'pay') {
      const g = Store.group(s.g), ms = [...Array(6)].map((_, i) => U.addMonths(U.month(), -i));
      let h = '';
      if (g && g.payMode === 'month') h += '<p class="mu fw sm">دوس على الشهر عشان تعلّمه مدفوع / مش مدفوع</p><div class="hist">' + ms.map(mm => { const p = Store.sub(code, mm); return '<span class="' + (p ? '' : 'a') + '" style="cursor:pointer" onclick="Store.toggleSub(' + code + ',' + q(mm) + ');Store.save();Prof.paint()"><b>' + U.MONTHS[+mm.slice(5) - 1] + '</b>' + (p ? 'مدفوع' : 'مش مدفوع') + '</span>'; }).join('') + '</div>';
      const ps = Store.stAtt(code).filter(a => a.st === 'p' && a.fee > 0);
      if (ps.length) h += '<h4 style="margin:14px 0 6px">الحصص</h4>' + ps.slice(0, 15).map(a => '<div class="ln"><span>' + U.long(a.d) + '</span><span class="tag ' + (a.paid >= a.fee ? 'a' : 'g') + '">' + (a.paid >= a.fee ? 'دفع ' + U.fmt(a.paid) : 'آجل ' + U.fmt(a.fee - a.paid)) + '</span></div>').join('');
      const py = DB.pays.filter(p => p.s === code);
      if (py.length) h += '<h4 style="margin:14px 0 6px">تسديدات</h4>' + py.map(p => '<div class="ln"><span>' + U.long(p.d) + ' · ' + U.esc(p.note) + '</span><b>' + U.money(p.amt) + '</b></div>').join('');
      return h || U.empty('مفيش حركة فلوس لسه', 'coins');
    }
    if (t === 'msg') {
      const m = App.st.pm, txt = Prof.text(), ph = m.to === 's' ? s.phone : s.parentPhone;
      return (DB.notif.wa ? '' : '<div class="warn">' + I('pause') + 'رسايل الواتساب مقفولة من الإعدادات — تقدر تبعت يدوي من هنا عادي.</div>') +
        '<label class="f">نوع الرسالة</label>' + U.seg([['report', 'تقرير'], ['monthly', 'شهري'], ['level', 'المستوى'], ['custom', 'رسالتي']], m.mode, "v=>Prof.set('mode',v)") +
        '<label class="f">لمين</label>' + U.seg([['p', 'ولي الأمر'], ['s', 'الطالب']], m.to, "v=>Prof.set('to',v)") +
        (m.mode === 'custom' ? '<textarea class="in" style="margin-top:10px" placeholder="اكتب رسالتك" oninput="App.st.pm.note=this.value;document.getElementById(\'pv\').textContent=Prof.text()">' + U.esc(m.note) + '</textarea>' : '') +
        '<div class="msgbox" id="pv" style="margin-top:10px">' + U.esc(txt) + '</div>' +
        '<div class="btns" style="margin-top:12px">' + (ph ? '<a class="btn gold" target="_blank" rel="noopener" href="' + U.wa(ph, txt) + '" onclick="this.href=U.wa(' + q(ph) + ',Prof.text());Store.logMsg({s:' + code + ',kind:' + q(m.mode) + '});Store.save()">' + I('wa') + 'ابعت واتساب</a>' : '<span class="mu">مفيش رقم</span>') +
        (DB.notif.portal ? '<button class="btn soft" onclick="Prof.toPortal()">' + I('send', 'sm') + 'ابعتها في البوابة</button>' : '') + '</div>';
    }
    return '';
  },
  text() { const m = App.st.pm; return m.mode === 'custom' ? Msg.custom(m.code, m.note, m.to) : m.mode === 'monthly' ? Msg.monthly(m.code, { to: m.to }) : m.mode === 'level' ? Msg.level(m.code, m.to) : Msg.report(m.code, { to: m.to }); },
  toPortal() { const m = App.st.pm, t = Prof.text(); if (!t.trim()) return; DB.posts.push({ id: Store.nid(), title: '', body: t, to: m.to, tgt: 'st:' + m.code, files: [], d: U.today(), tm: U.now() }); Store.save(); U.toast('اتبعتت في البوابة'); },
  pay(code) {
    const db = Store.debt(code);
    U.modal('<h3>تسديد — ' + U.esc(Store.student(code).name) + '</h3><p class="mu fw">عليه <b style="color:var(--aub)">' + U.money(db) + '</b></p><form id="pf" onsubmit="event.preventDefault();Prof.doPay(' + code + ')"><label class="f">المبلغ</label><input class="in big num" name="amt" type="number" min="1" max="' + db + '" value="' + db + '" autofocus>' +
      (App.isAsst() ? '' : '<label class="chk"><input type="checkbox" name="waive"><i>' + I('check') + '</i>إعفاء (يتشال من غير ما يتحسب إيراد)</label>') + '<button class="btn aub wide" style="margin-top:16px">تأكيد</button></form>');
  },
  doPay(code) { const f = U.form('pf'), a = +f.amt; if (!(a > 0)) return; Store.pay(code, a, f.waive, f.waive ? 'إعفاء' : 'تسديد'); Store.save(); U.toast('اتسجل'); Prof.open(code); App.render(); },
  out(code) { U.confirm('انسحاب؟', 'الطالب هيختفي من الكشوفات، وكل بياناته القديمة هتفضل محفوظة. تقدر ترجّعه في أي وقت.', 'أيوه انسحاب', () => { Store.withdraw(code); Store.save(); App.render(); U.toast('اتسجل انسحاب'); }); },
  del(code) { U.confirm('حذف نهائي؟', 'هيتمسح ' + U.esc(Store.student(code).name) + ' وكل حضوره ودرجاته وفلوسه. استخدم ده بس لو اتسجل غلط.', 'احذف', () => { Store.deleteStudent(code); Store.save(); App.render(); U.toast('اتحذف'); }); },
  async resetPw(code) { const p = Store.newPin(); if (await Store.setPw('student', String(code), p)) { Store.save(); Prof.paint(); U.toast('الرقم السري الجديد ' + p); } },
};
