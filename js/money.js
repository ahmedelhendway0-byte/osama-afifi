// الحسابات: الإيراد − المصاريف = الصافي (شهر بشهر)
const XP = {
  scopes() { return [['', 'كل المجموعات']].concat(DB.places.map(p => ['place:' + p, p]), GRADES.filter(gr => DB.groups.some(g => g.grade === gr)).map(g => ['grade:' + g, g]), Store.groups().map(g => ['group:' + g.id, Store.gFull(g)])); },
  open(id) {
    const e = id ? DB.expenses.find(x => x.id === id) : { title: '', amt: '', type: 'month', scope: '' };
    U.modal('<h3>' + (id ? 'تعديل مصروف' : 'مصروف جديد') + '</h3><form id="xf" onsubmit="event.preventDefault();XP.save(' + (id || 0) + ')">' +
      '<label class="f">اسم المصروف</label><input class="in big" name="title" required autofocus value="' + U.esc(e.title) + '" placeholder="مثلاً: إيجار سنتر الأسس">' +
      '<label class="f">المبلغ (رقم بس)</label><input class="in big num" name="amt" type="number" inputmode="numeric" min="0" required value="' + U.esc(e.amt) + '" placeholder="0">' +
      '<label class="f">بيتحسب إزاي</label><select class="in" name="type" onchange="XP.hint(this.value)">' + U.opts(Object.entries(EXP_TYPES), e.type) + '</select><p class="hint" id="xh"></p>' +
      '<label class="f">على مين</label><select class="in" name="scope">' + U.opts(XP.scopes(), e.scope) + '</select>' +
      '<button class="btn aub wide" style="margin-top:16px">' + I('check') + 'حفظ</button></form>');
    XP.hint(e.type);
  },
  hint(t) { const el = document.getElementById('xh'); if (el) el.textContent = { month: 'نفس المبلغ بيتخصم كل شهر (إيجار، مرتب أسيستنت...).', student: 'المبلغ × عدد الطلاب في الشهر (زي نسبة السنتر على الطالب).', attend: 'المبلغ × عدد مرات الحضور في الشهر (حق السنتر على كل حصة).', once: 'بيتخصم في الشهر ده بس (طباعة، مذكرات...).' }[t] || ''; },
  save(id) {
    const f = U.form('xf'), m = App.st.mm || U.month();
    if (!f.title || !(+f.amt >= 0)) return U.toast('اكتب الاسم والمبلغ', 'bad');
    if (id) Object.assign(DB.expenses.find(x => x.id === id), { title: f.title, amt: +f.amt, type: f.type, scope: f.scope, m: f.type === 'once' ? m : undefined });
    else DB.expenses.push({ id: Store.nid(), title: f.title, amt: +f.amt, type: f.type, scope: f.scope, from: f.type === 'once' ? undefined : m, m: f.type === 'once' ? m : undefined });
    U.close(); U.toast('اتحفظ'); App.refresh();
  },
  stop(id) { const e = DB.expenses.find(x => x.id === id), m = App.st.mm || U.month(); U.confirm('وقّف المصروف ده؟', 'هيفضل محسوب في الشهور اللي فاتت، ومش هيتحسب من ' + U.monthName(U.addMonths(m, 1)) + '.', 'وقّفه', () => { e.to = m; App.refresh(); }); },
  del(id) { U.confirm('حذف المصروف؟', 'هيتشال من كل الشهور.', 'احذف', () => { DB.expenses = DB.expenses.filter(x => x.id !== id); App.refresh(); }); },
};

V.money = () => {
  const m = App.st.mm || U.month(), r = U.mRange(m), rev = Store.revenue(r), exp = Store.expenses(m), net = rev - exp;
  const subs = DB.subs.filter(x => U.inRange(x.d, r)).reduce((a, x) => a + x.amt, 0), sess = DB.att.filter(a => U.inRange(a.d, r)).reduce((a, x) => a + (x.paid || 0), 0), pays = DB.pays.filter(p => !p.waive && U.inRange(p.d, r)).reduce((a, p) => a + p.amt, 0);
  const gs = Store.groups(), gRev = gs.map(g => Store.revenue(r, g.id));
  const mg = gs.filter(g => g.payMode === 'month'), expected = mg.reduce((a, g) => a + Store.members(g.id).length * g.monthPrice, 0), got = mg.reduce((a, g) => a + Store.members(g.id).filter(s => Store.sub(s.code, m)).reduce((x, s) => x + Store.sub(s.code, m).amt, 0), 0);
  const unpaid = mg.reduce((a, g) => a + Store.members(g.id).filter(s => !Store.sub(s.code, m)).length, 0);
  let h = '<div class="sp" style="margin-bottom:14px"><h1 style="font-size:24px" class="hide-m">الحسابات</h1><div class="mnav"><button class="btn ghost ic" onclick="App.st.mm=U.addMonths(' + q(m) + ',-1);App.render()">' + I('back') + '</button><b>' + U.monthName(m) + '</b><button class="btn ghost ic" ' + (m >= U.month() ? 'disabled' : '') + ' onclick="App.st.mm=U.addMonths(' + q(m) + ',1);App.render()">' + I('go') + '</button></div></div>' +
    '<div class="eq"><div><span>الإيراد</span>' + U.num(rev, ' ج') + '</div><i>−</i><div><span>المصاريف</span>' + U.num(exp, ' ج') + '</div><i>=</i><div class="net"><span>الصافي</span>' + U.num(net, ' ج') + '</div></div>';
  h += '<div class="grid2 even"><div><div class="panel" style="--i:1"><div class="ph"><h2>' + I('trend') + 'الإيراد جه منين</h2></div>' +
    '<div class="exp"><div class="ei">' + I('cal') + '</div><div><b>اشتراكات شهرية</b><small>' + DB.subs.filter(x => U.inRange(x.d, r)).length + ' اشتراك</small></div><b class="v">' + U.money(subs) + '</b></div>' +
    '<div class="exp"><div class="ei">' + I('att') + '</div><div><b>حصص (بالحصة)</b><small>' + DB.att.filter(a => U.inRange(a.d, r) && a.paid > 0).length + ' حصة مدفوعة</small></div><b class="v">' + U.money(sess) + '</b></div>' +
    '<div class="exp"><div class="ei">' + I('receipt') + '</div><div><b>تسديد آجل</b><small>' + DB.pays.filter(p => !p.waive && U.inRange(p.d, r)).length + ' تسديد</small></div><b class="v">' + U.money(pays) + '</b></div>' +
    '<div class="exp tot"><div class="ei">' + I('wallet') + '</div><div><b>الإجمالي</b><small>' + U.fmt(subs) + ' + ' + U.fmt(sess) + ' + ' + U.fmt(pays) + '</small></div><b class="v">= ' + U.money(rev) + '</b></div></div>' +
    (mg.length ? '<div class="panel" style="--i:2"><div class="ph"><h2>' + I('coins') + 'اشتراكات ' + U.MONTHS[+m.slice(5) - 1] + '</h2><a class="lnk" href="#students" onclick="App.st.sf=\'up\'">' + unpaid + ' مدفعوش ' + I('chev', 'sm') + '</a></div>' +
      '<div class="info" style="box-shadow:none;background:var(--aub-05)"><div><span>المفروض يتحصّل</span><b>' + U.money(expected) + '</b></div><div><span>اتحصّل</span><b>' + U.money(got) + ' (' + U.pct(got, expected) + '%)</b></div><div><span>باقي</span><b>' + U.money(Math.max(0, expected - got)) + '</b></div></div></div>' : '') +
    (gs.length ? '<div class="panel" style="--i:3"><div class="ph"><h2>' + I('chart') + 'الإيراد لكل مجموعة</h2></div>' + U.bars(gRev, gs.map(g => Store.gName(g))) + '</div>' : '') + '</div>';
  // المصاريف
  const items = DB.expenses.map(e => [e, Store.expCalc(e, m)]).filter(([e, c]) => c.v > 0 || (!e.to && (!e.from || e.from <= m) && e.type !== 'once'));
  h += '<div><div class="panel" style="--i:2"><div class="ph"><h2>' + I('receipt') + 'المصاريف</h2>' + (App.isAsst() ? '' : '<button class="btn gold sm" onclick="XP.open()">' + I('plus', 'sm') + 'مصروف</button>') + '</div>' +
    (items.length ? items.map(([e, c]) => '<div class="exp"><div class="ei">' + I(e.type === 'once' ? 'file' : e.type === 'month' ? 'cal' : 'users') + '</div><div><b>' + U.esc(e.title) + '</b><small>' + EXP_TYPES[e.type] + ' · ' + U.esc(Store.scopeName(e.scope)) + '</small><small style="color:var(--aub)">' + U.esc(c.how) + '</small></div><b class="v">' + U.money(c.v) + '</b>' +
      (App.isAsst() ? '' : '<div class="btns" style="flex:none"><button class="btn soft ic" onclick="XP.open(' + e.id + ')">' + I('edit', 'sm') + '</button>' + (e.type === 'once' ? '<button class="btn soft ic" onclick="XP.del(' + e.id + ')">' + I('trash', 'sm') + '</button>' : '<button class="btn soft ic" title="وقّف" onclick="XP.stop(' + e.id + ')">' + I('pause', 'sm') + '</button>') + '</div>') + '</div>').join('') +
      '<div class="exp tot"><div class="ei">' + I('receipt') + '</div><div><b>إجمالي المصاريف</b><small>' + items.map(x => U.fmt(x[1].v)).join(' + ') + '</small></div><b class="v">= ' + U.money(exp) + '</b></div>'
      : U.empty('مفيش مصاريف متسجلة للشهر ده', 'receipt', App.isAsst() ? '' : '<button class="btn gold" onclick="XP.open()">' + I('plus') + 'ضيف مصروف</button>')) + '</div>' +
    '<div class="panel" style="--i:3"><div class="ph"><h2>' + I('clock') + 'الآجل</h2></div><div class="sp"><span class="mu fw">إجمالي الفلوس اللي على الطلاب</span><b style="font-size:20px">' + U.money(Store.deferred()) + '</b></div>' +
    (Store.deferred() ? '<a class="btn soft sm" style="margin-top:10px" href="#students" onclick="App.st.sf=\'df\'">شوف الأسماء ' + I('chev', 'sm') + '</a>' : '') + '</div></div></div>';
  // آخر 6 شهور
  const ms = [...Array(6)].map((_, i) => U.addMonths(U.month(), i - 5));
  h += '<div class="panel" style="--i:4"><div class="ph"><h2>' + I('chart') + 'الصافي آخر 6 شهور</h2></div>' + U.bars(ms.map(x => Math.max(0, Store.monthRevenue(x) - Store.expenses(x))), ms.map(x => U.MONTHS[+x.slice(5) - 1])) + '</div>';
  return h;
};
