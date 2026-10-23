// الإعدادات (المستر بس)
const SET = {
  n(k, v) { DB.notif[k] = v; App.refresh(); U.toast(v ? 'اتفتحت' : 'اتقفلت'); },
  p(k, v) { DB.perms[k] = v; App.refresh(); },
  prof() { const f = U.form('prf'); if (!f.name) return; DB.teacher.name = f.name; DB.teacher.phone = U.phone(f.phone); App.refresh(); U.toast('اتحفظ'); },
  async pw() {
    const f = U.form('pwf'); if (!f.pw || f.pw.length < 4) return U.toast('4 حروف أو أرقام على الأقل', 'bad');
    if (DB.assts.some(a => a.pw === f.pw)) return U.toast('الباسورد ده بتاع أسيستنت — اختار غيره', 'bad');
    if (await Store.setPw('teacher', 'teacher', f.pw)) { App.render(); U.toast('الباسورد اتغير'); }
  },
  defs() { const f = U.form('dff'); DB.defaults = { qzMax: +f.qzMax || 10, exMax: +f.exMax || 20 }; App.refresh(); U.toast('اتحفظ'); },
  addPlace() { const n = prompt('اسم المكان'); if (n && n.trim() && !DB.places.includes(n.trim())) { DB.places.push(n.trim()); App.refresh(); } },
  renPlace(i) {
    const old = DB.places[i], n = prompt('الاسم الجديد', old); if (!n || !n.trim() || n.trim() === old) return;
    DB.places[i] = n.trim(); DB.groups.forEach(g => { if (g.place === old) g.place = n.trim(); });
    DB.expenses.forEach(e => { if (e.scope === 'place:' + old) e.scope = 'place:' + n.trim(); }); App.refresh();
  },
  delPlace(i) { const p = DB.places[i]; if (DB.groups.some(g => g.place === p)) return U.toast('فيه مجموعات في المكان ده — انقلها الأول', 'bad'); DB.places.splice(i, 1); App.refresh(); },
  addA() {
    const f = U.form('naf'); if (!f.name) return U.toast('اكتب اسم الأسيستنت', 'bad');
    const user = Store.nextAsstUser(), pw = Store.newAsstPw(); DB.assts.push({ user, name: f.name, phone: U.phone(f.phone), pw });
    Store.save(); App.render(); SET.showA(user, 'اتضاف ' + f.name);
    if (Sync.live) Store.setPw('assistant', user, pw);
  },
  delA(user) { U.confirm('حذف الأسيستنت؟', 'مش هيقدر يدخل تاني.', 'احذف', () => { DB.assts = DB.assts.filter(a => a.user !== user); App.refresh(); }); },
  async resetA(user) { const pw = Store.newAsstPw(); if (await Store.setPw('assistant', user, pw)) { App.render(); SET.showA(user, 'باسورد جديد'); } },
  // بيانات دخول الأسيستنت + زرار يبعتها واتساب
  showA(user, title) {
    const a = Store.asst(user), txt = 'أهلاً ' + a.name + '\nبيانات دخولك على سيستم مستر ' + DB.teacher.name + ':\n' + location.origin + location.pathname + '#login-staff\nاختار «أسيستنت» واكتب الباسورد: ' + a.pw;
    U.modal('<h3>' + U.esc(title) + '</h3><div class="info"><div><span>الدخول</span><b>المستر والأسيستنت ← أسيستنت</b></div><div><span>الباسورد</span><b class="ltr" style="font-size:22px;letter-spacing:3px">' + a.pw + '</b></div></div>' +
      '<div class="row2">' + (a.phone ? '<a class="btn gold" target="_blank" rel="noopener" href="' + U.wa(a.phone, txt) + '">' + I('wa') + 'ابعتهاله</a>' : '<span></span>') + '<button class="btn aub" onclick="U.close()">تمام</button></div>');
  },
  backup() {
    const b = new Blob([JSON.stringify(DB)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = 'osama-afifi-' + U.today() + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  restore(inp) {
    const f = inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { const d = JSON.parse(r.result); if (!d.groups || !d.students) throw 0; U.confirm('ترجّع النسخة دي؟', 'هتستبدل كل البيانات الحالية بالنسخة (' + d.students.length + ' طالب).', 'رجّعها', () => { DB = d; Store.fix(); Store.save(); App.render(); U.toast('اترجعت'); }); } catch (e) { U.toast('الملف ده مش نسخة السيستم', 'bad'); } };
    r.readAsText(f); inp.value = '';
  },
  reset() { U.confirm('مسح كل البيانات؟', 'هيتمسح كل الطلاب والحضور والدرجات والفلوس من الجهاز ده. نزّل نسخة احتياطية الأول.', 'امسح كله', () => { Store.wipe(); App.setSes(null); location.hash = ''; location.reload(); }); },
  link(r) { const u = location.origin + location.pathname + '#login-' + r; navigator.clipboard && navigator.clipboard.writeText(u).then(() => U.toast('الرابط اتنسخ')); },
};

V.settings = () => {
  const n = DB.notif, p = DB.perms, t = DB.teacher;
  return '<div class="dtop"><h1 style="font-size:24px">الإعدادات</h1></div><div class="grid2 even"><div>' +
    '<div class="panel" style="--i:0"><div class="ph"><h2>' + I('msg') + 'الرسايل</h2></div>' +
    U.tgl(n.wa, "v=>SET.n('wa',v)", 'رسايل واتساب بعد الحصة', 'لما تقفلها: الحصة بتتسجل عادي من غير ما يطلعلك رسايل.') +
    (n.wa ? '<div style="padding:10px 0"><label class="f" style="margin-top:0">بتروح لمين</label>' + U.seg([['p', 'ولي الأمر'], ['s', 'الطالب'], ['b', 'الاتنين']], n.to, "v=>SET.n('to',v)") + '</div>' + U.tgl(n.absence, "v=>SET.n('absence',v)", 'رسالة الغياب') + U.tgl(n.report, "v=>SET.n('report',v)", 'تقرير الحاضرين') : '') +
    U.tgl(n.grades !== false, "v=>SET.n('grades',v)", 'التقارير فيها الدرجات') +
    U.tgl(n.portal, "v=>SET.n('portal',v)", 'رسايل بوابة الطالب وولي الأمر', 'الرسايل والملفات اللي بتبعتها من «الرسايل».') + '</div>' +
    '<div class="panel" style="--i:1"><div class="ph"><h2>' + I('shield') + 'الأسيستنتس (' + DB.assts.length + ')</h2></div>' +
    (DB.assts.map(a => '<div class="ln"><span><b>' + U.esc(a.name) + '</b><small>الباسورد: <span class="ltr">' + a.pw + '</span>' + (a.phone ? ' · <span class="ltr">' + a.phone + '</span>' : '') + '</small></span><span class="btns"><button class="btn soft ic" title="ابعت بيانات الدخول" onclick="SET.showA(' + q(a.user) + ',' + q(a.name) + ')">' + I('send', 'sm') + '</button><button class="btn soft sm" onclick="SET.resetA(' + q(a.user) + ')">' + I('key', 'sm') + 'باسورد جديد</button><button class="btn soft ic" onclick="SET.delA(' + q(a.user) + ')">' + I('trash', 'sm') + '</button></span></div>').join('') || '<p class="mu fw sm">لسه مفيش أسيستنت. الأسيستنت بيسجّل الحضور من موبايله وبياناته منفصلة عن حسابك.</p>') +
    '<form id="naf" class="row3" style="margin-top:10px;align-items:end" onsubmit="event.preventDefault();SET.addA()"><input class="in" name="name" placeholder="اسم الأسيستنت"><input class="in ltr" name="phone" inputmode="tel" placeholder="01xxxxxxxxx"><button class="btn gold">' + I('plus') + 'ضيف</button></form>' +
    '<h4 style="margin:18px 0 0" class="mu">الأسيستنت يقدر:</h4>' +
    U.tgl(p.add, "v=>SET.p('add',v)", 'يضيف ويعدّل طلاب') + U.tgl(p.grades, "v=>SET.p('grades',v)", 'يسجّل الامتحانات والدرجات') + U.tgl(p.msgs, "v=>SET.p('msgs',v)", 'يبعت رسايل') +
    U.tgl(p.money, "v=>SET.p('money',v)", 'يشوف الفلوس والحسابات') + U.tgl(p.del, "v=>SET.p('del',v)", 'يحذف طلاب نهائي') + '</div></div><div>' +
    '<div class="panel" style="--i:2"><div class="ph"><h2>' + I('user') + 'بياناتي</h2></div><form id="prf" onsubmit="event.preventDefault();SET.prof()"><label class="f" style="margin-top:0">الاسم</label><input class="in" name="name" value="' + U.esc(t.name) + '"><label class="f">الموبايل</label><input class="in ltr" name="phone" value="' + U.esc(t.phone) + '"><button class="btn soft" style="margin-top:12px">حفظ</button></form>' +
    '<form id="pwf" class="row2" style="margin-top:16px;align-items:end" onsubmit="event.preventDefault();SET.pw()"><div><label class="f">باسورد جديد للمستر</label><input class="in ltr" name="pw" type="password" placeholder="••••"></div><button class="btn aub">' + I('key') + 'غيّرها</button></form></div>' +
    '<div class="panel" style="--i:3"><div class="ph"><h2>' + I('pin') + 'الأماكن</h2><button class="btn gold sm" onclick="SET.addPlace()">' + I('plus', 'sm') + 'مكان</button></div>' + DB.places.map((x, i) => '<div class="ln"><b>' + U.esc(x) + '</b><span class="btns"><span class="mu sm">' + DB.groups.filter(g => g.place === x).length + ' مجموعة</span><button class="btn soft ic" onclick="SET.renPlace(' + i + ')">' + I('edit', 'sm') + '</button><button class="btn soft ic" onclick="SET.delPlace(' + i + ')">' + I('trash', 'sm') + '</button></span></div>').join('') +
    '<p class="mu fw sm" style="margin:10px 0 0">مواعيد وأسعار المجموعات بتتعدّل من <a href="#groups">المجموعات</a>.</p></div>' +
    '<div class="panel" style="--i:4"><div class="ph"><h2>' + I('exam') + 'الدرجات الافتراضية</h2></div><form id="dff" class="row3" style="align-items:end" onsubmit="event.preventDefault();SET.defs()"><div><label class="f" style="margin-top:0">الكويز من</label><input class="in num" name="qzMax" type="number" min="1" value="' + DB.defaults.qzMax + '"></div><div><label class="f" style="margin-top:0">الامتحان من</label><input class="in num" name="exMax" type="number" min="1" value="' + DB.defaults.exMax + '"></div><button class="btn soft">حفظ</button></form></div>' +
    '<div class="panel" style="--i:5"><div class="ph"><h2>' + I('link') + 'روابط الدخول</h2></div><p class="mu fw sm" style="margin-top:0">رابطين بس: واحد ليك وللأسيستنت، وواحد للطلاب وأولياء الأمور. الرقم السري لكل طالب في ملفه، وتقدر تبعته لأولياء الأمور كلهم مرة واحدة من «الرسايل ← واتساب ← بيانات الدخول».</p><div class="btns"><button class="btn soft sm" onclick="SET.link(\'staff\')">' + I('shield', 'sm') + 'رابط المستر والأسيستنت</button><button class="btn soft sm" onclick="SET.link(\'family\')">' + I('users', 'sm') + 'رابط الطلاب وأولياء الأمور</button></div></div>' +
    '<div class="panel" style="--i:6"><div class="ph"><h2>' + I('save') + 'البيانات</h2></div><div class="btns"><button class="btn soft sm" onclick="SET.backup()">' + I('download', 'sm') + 'نسخة احتياطية</button><label class="btn soft sm" style="position:relative;overflow:hidden">' + I('upload', 'sm') + 'ترجيع نسخة<input type="file" accept=".json" style="position:absolute;inset:0;opacity:0" onchange="SET.restore(this)"></label>' +
    (window.Sync && Sync.live ? '' : '<button class="btn soft sm" onclick="SET.reset()">' + I('trash', 'sm') + 'مسح كل البيانات</button>') + '</div>' + (window.Sync ? Sync.panel() : '') + '</div></div></div>';
};
