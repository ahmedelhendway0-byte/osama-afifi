// الطلاب والمجموعات (والكشوفات)

// ======================= الطلاب =======================
V.students = () => {
  const st = App.st, fg = st.sg || '', f = st.sf || 'all', qq = (st.sq || '').trim(), m = U.month();
  const F = { all: s => s.st !== 'out', up: s => s.st !== 'out' && Store.payState(s.code) === 'up', abs: s => s.st !== 'out' && Store.absStreak(s.code) >= 2, df: s => s.st !== 'out' && Store.debt(s.code) > 0, wk: s => s.st !== 'out' && ['wk', 'dn'].includes(Store.cat(s.code)), top: s => s.st !== 'out' && Store.cat(s.code) === 'top', out: s => s.st === 'out' };
  let list = DB.students.filter(s => (F[f] || F.all)(s) && (!fg || s.g === fg || (fg.startsWith('gr:') && (Store.group(s.g) || {}).grade === fg.slice(3))) && (!qq || Att.match(s, qq)));
  list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  const n = st.sn || 60;
  const segs = [['all', 'الكل'], ['top', 'المتفوقين'], ['wk', 'محتاجين متابعة'], ['abs', 'غياب متكرر']].concat(App.can('money') ? [['up', 'مدفعوش الشهر'], ['df', 'عليهم آجل']] : []).concat([['out', 'منسحبين']]);
  let h = '<div class="dtop"><h1 style="font-size:24px">الطلاب</h1>' + (App.can('add') ? '<button class="btn gold" onclick="SF.open()">' + I('userplus') + 'طالب جديد</button>' : '') + '</div>' +
    '<div class="toolbar"><div class="search">' + I('search') + '<input placeholder="اسم، كود، أو تليفون" value="' + U.esc(qq) + '" oninput="V.stQ(this)"></div>' +
    '<select class="in" onchange="App.st.sg=this.value;App.st.sn=60;App.render()"><option value="">كل المجموعات</option>' + GRADES.map(gr => '<option value="gr:' + gr + '"' + (fg === 'gr:' + gr ? ' selected' : '') + '>' + gr + ' (كله)</option>').join('') + U.opts(Store.groups().map(g => [g.id, Store.gName(g)]), fg) + '</select>' +
    (App.can('add') ? '<button class="btn gold ic hide-d" onclick="SF.open()" style="' + '' + '">' + I('userplus') + '</button>' : '') + '</div>' +
    '<div class="scroll-x">' + segs.map(([k, l]) => '<button class="chip ' + (k === f ? 'on' : '') + '" onclick="App.st.sf=\'' + k + '\';App.st.sn=60;App.render()">' + l + '</button>').join('') + '</div>' +
    '<p class="mu fw sm" style="margin:4px 4px 10px">' + list.length + ' طالب</p>';
  h += list.length ? '<div class="slist">' + list.slice(0, n).map((s, i) => {
    const rate = Store.attRate(s.code), av = Store.avg(s.code), ps = Store.payState(s.code), g = Store.group(s.g), lv = Store.level(av), ab = Store.absStreak(s.code);
    return '<button class="sc" style="--i:' + Math.min(i, 25) + '" onclick="Prof.open(' + s.code + ')"><span class="av ' + (Store.isGirl(s) ? 'g' : '') + '">' + U.initial(s.name) + '</span><div class="nm"><b>' + U.esc(s.name) + '</b><small>' + s.code + ' · ' + U.esc(Store.gName(g)) + '</small><div class="mt">' +
      (av !== null ? '<span class="tag lv-' + lv[1] + '">' + lv[0] + '</span>' : '') + (App.can('money') && ps ? '<span class="tag ' + (ps === 'mp' || ps === 'paid' ? 'o' : 'g') + '">' + Store.payText(ps) + '</span>' : '') + (ab >= 2 ? '<span class="tag g">' + ab + ' غياب ورا بعض</span>' : '') + '</div></div>' +
      '<div class="pc"><b>' + (rate ?? '—') + (rate !== null ? '%' : '') + '</b><small>حضور</small></div><div class="pc"><b>' + (av ?? '—') + (av !== null ? '%' : '') + '</b><small>درجات</small></div></button>';
  }).join('') + '</div>' + (list.length > n ? '<button class="btn ghost wide" style="margin-top:12px" onclick="App.st.sn=' + (n + 100) + ';App.render()">عرض المزيد (' + (list.length - n) + ')</button>' : '')
    : U.empty(DB.students.length ? 'مفيش طلاب بالفلتر ده' : 'لسه مفيش طلاب', 'users', !DB.students.length && App.can('add') ? '<button class="btn gold" onclick="SF.open()">' + I('userplus') + 'ضيف أول طالب</button>' : '');
  return h;
};
V.stQ = el => { App.st.sq = el.value; App.st.sn = 60; const p = el.selectionStart; App.render(); const e = document.querySelector('.toolbar input'); e.focus(); e.setSelectionRange(p, p); };

// ======================= المجموعات =======================
const GF = {
  open(id) {
    const g = id ? Store.group(id) : { grade: GRADES[0], place: DB.places[0], name: '', slots: [{ day: 'السبت', from: '16:00', to: '17:30' }], payMode: 'month', price: 0, monthPrice: 0, qz: true, qzMax: DB.defaults.qzMax, exMax: DB.defaults.exMax, active: true };
    GF.slots = JSON.parse(JSON.stringify(g.slots)); GF.id = id;
    U.modal('<h3>' + (id ? 'تعديل ' + U.esc(Store.gName(g)) : 'مجموعة جديدة') + '</h3><form id="gf" onsubmit="event.preventDefault();GF.save()">' +
      '<div class="row2"><div><label class="f">الصف</label><select class="in" name="grade">' + U.opts(GRADES, g.grade) + '</select></div><div><label class="f">المكان</label><select class="in" name="place">' + U.opts(DB.places, g.place) + '</select></div></div>' +
      '<label class="f">اسم المجموعة (اختياري)</label><input class="in" name="name" value="' + U.esc(g.name) + '" placeholder="لو سبته فاضي: الصف · المكان">' +
      '<label class="f">المواعيد</label><div id="gsl"></div><button type="button" class="btn soft sm" onclick="GF.addSlot()">' + I('plus', 'sm') + 'يوم تاني</button>' +
      '<label class="f">نظام الدفع</label>' + U.radio('payMode', [['month', 'شهري'], ['session', 'بالحصة']], g.payMode) +
      '<div class="row2"><div><label class="f">الاشتراك الشهري</label><input class="in num" name="monthPrice" type="number" min="0" value="' + (g.monthPrice || 0) + '"></div><div><label class="f">سعر الحصة</label><input class="in num" name="price" type="number" min="0" value="' + (g.price || 0) + '"></div></div>' +
      '<div class="row2"><div><label class="f">الكويز من</label><input class="in num" name="qzMax" type="number" min="1" value="' + (g.qzMax || DB.defaults.qzMax) + '"></div><div><label class="f">الامتحان من</label><input class="in num" name="exMax" type="number" min="1" value="' + (g.exMax || DB.defaults.exMax) + '"></div></div>' +
      '<label class="chk"><input type="checkbox" name="qz" ' + (g.qz ? 'checked' : '') + '><i>' + I('check') + '</i>كويز في كل حصة (افتراضي)</label>' +
      '<button class="btn aub wide" style="margin-top:16px">' + I('check') + 'حفظ</button>' + (id ? '<button type="button" class="btn soft wide" style="margin-top:8px" onclick="GF.toggle(' + q(id) + ')">' + (g.active === false ? I('undo') + 'تفعيل المجموعة' : I('pause') + 'قفل المجموعة (توقف مؤقت)') + '</button>' : '') + '</form>');
    GF.paintSlots();
  },
  paintSlots() {
    document.getElementById('gsl').innerHTML = GF.slots.map((s, j) => '<div class="slotrow"><select class="in" onchange="GF.slots[' + j + '].day=this.value">' + U.opts(U.WEEK, s.day) + '</select><input class="in ltr" type="time" value="' + s.from + '" onchange="GF.slots[' + j + '].from=this.value"><input class="in ltr" type="time" value="' + s.to + '" onchange="GF.slots[' + j + '].to=this.value"><button type="button" class="btn soft ic" onclick="GF.slots.splice(' + j + ',1);GF.paintSlots()">' + I('x', 'sm') + '</button></div>').join('');
  },
  addSlot() { const l = GF.slots[GF.slots.length - 1] || { from: '16:00', to: '17:30' }; GF.slots.push({ day: 'الخميس', from: l.from, to: l.to }); GF.paintSlots(); },
  save() {
    const f = U.form('gf'), id = GF.id;
    if (!GF.slots.length) return U.toast('ضيف ميعاد واحد على الأقل', 'bad');
    const d = { grade: f.grade, place: f.place, name: f.name, slots: GF.slots.slice().sort((a, b) => U.WEEK.indexOf(a.day) - U.WEEK.indexOf(b.day)), payMode: f.payMode, price: +f.price || 0, monthPrice: +f.monthPrice || 0, qz: f.qz, qzMax: +f.qzMax || 10, exMax: +f.exMax || 20 };
    if (id) Object.assign(Store.group(id), d); else DB.groups.push(Object.assign({ id: Store.nextGroupId(), active: true, ex: false }, d));
    U.close(); U.toast('اتحفظت'); App.refresh();
  },
  toggle(id) { const g = Store.group(id); g.active = g.active === false; U.close(); App.refresh(); },
};

V.groups = () => {
  if (App.arg && Store.group(App.arg)) return V.group(Store.group(App.arg));
  const all = Store.groups(true), m = U.month();
  let h = '<div class="dtop"><h1 style="font-size:24px">المجموعات</h1>' + (App.isAsst() ? '' : '<button class="btn gold" onclick="GF.open()">' + I('plus') + 'مجموعة جديدة</button>') + '</div>';
  if (!App.isAsst()) h += '<div class="btns" style="margin-bottom:14px" ><button class="btn gold sm hide-d" onclick="GF.open()">' + I('plus', 'sm') + 'مجموعة جديدة</button></div>';
  GRADES.forEach(gr => {
    const gs = all.filter(g => g.grade === gr); if (!gs.length) return;
    h += '<h2 style="font-size:16px;margin:18px 4px 10px" class="mu">' + gr + '</h2><div class="cards">' + gs.map((g, i) => {
      const mem = Store.members(g.id), att = DB.att.filter(a => a.g === g.id), rate = att.length ? U.pct(att.filter(a => a.st === 'p').length, att.length) : null;
      const paid = g.payMode === 'month' ? mem.filter(s => Store.sub(s.code, m)).length : null;
      return '<div class="gcard ' + (DB.places.indexOf(g.place) % 2 ? 'b ' : '') + (g.active === false ? 'off' : '') + '" style="--i:' + i + '" onclick="location.hash=\'groups/' + g.id + '\'"><div class="gh"><div class="gi">' + GRADE_NUM[g.grade] + '</div><div style="flex:1;min-width:0"><h3>' + U.esc(Store.gName(g)) + (g.active === false ? ' <span class="tag g">مقفولة</span>' : '') + '</h3><small>' + I('pin', 'sm') + U.esc(g.place) + '</small></div><span class="go" style="width:38px;height:38px">' + I('go', 'sm') + '</span></div>' +
        '<div class="slots">' + g.slots.map(s => '<div>' + I('clock') + '<b>' + s.day + '</b><span class="mu">' + U.t12s(s.from) + ' ← ' + U.t12(s.to) + '</span></div>').join('') + '</div>' +
        '<div class="gs"><div><b>' + mem.length + '</b>طالب</div><div><b>' + (rate ?? '—') + (rate !== null ? '%' : '') + '</b>حضور</div>' + (App.can('money') ? '<div><b>' + (paid !== null ? paid + '/' + mem.length : U.fmt(g.price)) + '</b>' + (paid !== null ? 'دفعوا الشهر' : 'ج للحصة') + '</div>' : '<div><b>' + g.slots.length + '</b>أيام</div>') + '</div></div>';
    }).join('') + '</div>';
  });
  return all.length ? h : h + U.empty('مفيش مجموعات لسه', 'layers', App.isAsst() ? '' : '<button class="btn gold" onclick="GF.open()">' + I('plus') + 'ضيف مجموعة</button>');
};

// تفاصيل مجموعة: الطلاب · كشف الحضور · الدرجات · الفلوس
V.group = g => {
  const tab = App.st.gt || 'st', mem = Store.members(g.id).sort((a, b) => a.name.localeCompare(b.name, 'ar')), m = U.month();
  const att = DB.att.filter(a => a.g === g.id), rate = att.length ? U.pct(att.filter(a => a.st === 'p').length, att.length) : null;
  const avs = mem.map(s => Store.avg(s.code)).filter(x => x !== null), gav = avs.length ? Math.round(avs.reduce((a, b) => a + b, 0) / avs.length) : null;
  let h = '<a class="btn soft sm" href="#groups" style="margin-bottom:12px">' + I('back', 'sm') + 'كل المجموعات</a>' +
    '<div class="kid"><div class="sp" style="position:relative;z-index:1"><div><h1>' + U.esc(Store.gFull(g)) + '</h1><p>' + I('pin', 'sm') + ' ' + U.esc(g.place) + ' · ' + (g.payMode === 'month' ? U.money(g.monthPrice) + ' شهري' : U.money(g.price) + ' للحصة') + '</p>' +
    '<div class="btns" style="margin-top:10px">' + g.slots.map(s => '<span class="tag g">' + s.day + ' ' + U.t12s(s.from) + '–' + U.t12(s.to) + '</span>').join('') + '</div></div>' +
    '<div class="btns"><a class="btn gold" href="#att" onclick="App.st.ag=' + q(g.id) + ';App.st.ad=\'\'">' + I('att') + 'سجّل الحصة</a>' + (App.isAsst() ? '' : '<button class="btn" style="background:#ffffff1c;color:#fff" onclick="GF.open(' + q(g.id) + ')">' + I('edit') + 'تعديل</button>') + '</div></div></div>' +
    '<div class="kpis"><div class="k" style="--i:0"><div class="ic">' + I('users') + '</div><span>الطلاب</span>' + U.num(mem.length) + '</div><div class="k" style="--i:1"><div class="ic">' + I('att') + '</div><span>نسبة الحضور</span><b>' + (rate ?? '—') + (rate !== null ? '%' : '') + '</b></div>' +
    '<div class="k" style="--i:2"><div class="ic">' + I('chart') + '</div><span>متوسط الدرجات</span><b>' + (gav ?? '—') + (gav !== null ? '%' : '') + '</b></div>' +
    (App.can('money') ? '<div class="k gd" style="--i:3"><div class="ic">' + I('coins') + '</div><span>إيراد ' + U.MONTHS[+m.slice(5) - 1] + '</span>' + U.num(Store.revenue(U.mRange(m), g.id), ' ج') + '</div>' : '<div class="k gd" style="--i:3"><div class="ic">' + I('cal') + '</div><span>حصص اتسجلت</span>' + U.num(new Set(att.map(a => a.d)).size) + '</div>') + '</div>';
  const tabs = [['st', 'users', 'الطلاب'], ['sh', 'list', 'كشف الحضور'], ['gr', 'chart', 'الدرجات']].concat(App.can('money') ? [['pay', 'coins', 'الدفع']] : []);
  h += '<div class="tabs">' + tabs.map(t => '<button class="' + (tab === t[0] ? 'on' : '') + '" onclick="App.st.gt=\'' + t[0] + '\';App.render()">' + I(t[1], 'sm') + t[2] + '</button>').join('') + '</div>';
  if (!mem.length) return h + U.empty('لسه مفيش طلاب في المجموعة دي', 'users', App.can('add') ? '<button class="btn gold" onclick="SF.open(null,{gid:' + q(g.id) + '})">' + I('userplus') + 'ضيف طالب</button>' : '');
  if (tab === 'st') {
    h += (App.can('add') ? '<div class="btns" style="margin-bottom:12px"><button class="btn gold sm" onclick="SF.open(null,{gid:' + q(g.id) + '})">' + I('userplus', 'sm') + 'ضيف طالب للمجموعة</button></div>' : '') + '<div class="slist">' + mem.map((s, i) => {
      const r = Store.attRate(s.code), av = Store.avg(s.code), lv = Store.level(av), ab = Store.absences(s.code);
      return '<button class="sc" style="--i:' + Math.min(i, 25) + '" onclick="Prof.open(' + s.code + ')"><span class="av">' + U.initial(s.name) + '</span><div class="nm"><b>' + U.esc(s.name) + '</b><small>' + s.code + ' · غاب ' + ab + ' مرة</small><div class="mt">' + (av !== null ? '<span class="tag lv-' + lv[1] + '">' + lv[0] + '</span>' : '') + '</div></div><div class="pc"><b>' + (r ?? '—') + (r !== null ? '%' : '') + '</b><small>حضور</small></div><div class="pc"><b>' + (av ?? '—') + (av !== null ? '%' : '') + '</b><small>درجات</small></div></button>';
    }).join('') + '</div>';
  }
  if (tab === 'sh') {
    const days = [...new Set(att.map(a => a.d))].sort().slice(-14), by = {};
    att.forEach(a => by[a.s + '|' + a.d] = a);
    h += days.length ? '<div class="sheet"><table><tr><th>الطالب</th>' + days.map(d => '<th>ح' + Store.sessNo(g.id, d).n + '<br>' + U.SHORT[U.dayName(d)] + ' ' + U.short(d) + '</th>').join('') + '<th>حضر</th><th>غاب</th></tr>' +
      mem.map(s => { const my = days.map(d => by[s.code + '|' + d]); return '<tr onclick="Prof.open(' + s.code + ')"><td><b>' + U.esc(s.name) + '</b></td>' + my.map(a => a ? (a.st === 'p' ? '<td class="p">ح</td>' : '<td class="a">غ</td>') : '<td class="na">·</td>').join('') + '<td><b>' + my.filter(a => a && a.st === 'p').length + '</b></td><td><b>' + my.filter(a => a && a.st === 'a').length + '</b></td></tr>'; }).join('') + '</table></div><p class="mu xs fw" style="margin:8px 4px">آخر ' + days.length + ' حصة · ح = حضر · غ = غاب</p>'
      : U.empty('لسه مفيش حصص متسجلة', 'cal');
  }
  if (tab === 'gr') {
    const as = DB.assess.filter(a => a.g === g.id || (!a.g && a.grade === g.grade)).sort((a, b) => a.d.localeCompare(b.d)).slice(-10);
    h += as.length ? '<div class="sheet"><table><tr><th>الطالب</th>' + as.map(a => '<th>' + assessName(a.type) + '<br>' + U.short(a.d) + ' /' + a.max + '</th>').join('') + '<th>المتوسط</th></tr>' +
      mem.map(s => '<tr onclick="Prof.open(' + s.code + ')"><td><b>' + U.esc(s.name) + '</b></td>' + as.map(a => { const v = (DB.scores[a.id] || {})[s.code], ab = a.solo && (DB.exAtt[a.id] || {})[s.code] === 'a'; return v !== undefined ? '<td class="p">' + v + '</td>' : ab ? '<td class="a">غ</td>' : '<td class="na">·</td>'; }).join('') + '<td><b>' + (Store.avg(s.code) ?? '—') + '</b></td></tr>').join('') + '</table></div>'
      : U.empty('لسه مفيش درجات', 'chart', App.can('grades') ? '<a class="btn gold" href="#grades">' + I('plus') + 'امتحان جديد</a>' : '');
  }
  if (tab === 'pay') {
    const mm = App.st.gpm || m;
    h += '<div class="sp" style="margin-bottom:12px"><div class="mnav"><button class="btn ghost ic" onclick="App.st.gpm=U.addMonths(' + q(mm) + ',-1);App.render()">' + I('back') + '</button><b>' + U.monthName(mm) + '</b><button class="btn ghost ic" onclick="App.st.gpm=U.addMonths(' + q(mm) + ',1);App.render()">' + I('go') + '</button></div>' +
      (g.payMode === 'month' ? '<span class="tag a">' + mem.filter(s => Store.sub(s.code, mm)).length + ' / ' + mem.length + ' دفعوا</span>' : '') + '</div>';
    h += '<div class="slist">' + mem.map(s => {
      if (g.payMode === 'month') { const p = Store.sub(s.code, mm); return '<button class="sc" onclick="Store.toggleSub(' + s.code + ',' + q(mm) + ');App.refresh()"><span class="av ' + (p ? '' : 'g') + '">' + I(p ? 'check' : 'x') + '</span><div class="nm"><b>' + U.esc(s.name) + '</b><small>' + (p ? 'دفع ' + U.money(p.amt) + ' يوم ' + U.short(p.d) : 'مدفعش — دوس لما يدفع') + '</small></div></button>'; }
      const db = Store.debt(s.code); return '<button class="sc" onclick="Prof.open(' + s.code + ')"><span class="av ' + (db ? 'g' : '') + '">' + I(db ? 'clock' : 'check') + '</span><div class="nm"><b>' + U.esc(s.name) + '</b><small>' + (db ? 'عليه ' + U.money(db) : 'خالص') + '</small></div></button>';
    }).join('') + '</div>';
  }
  return h;
};
