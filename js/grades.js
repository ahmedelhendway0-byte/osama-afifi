// الامتحانات والدرجات: كويزات الحصص + امتحان لوحده (بيتسجل زي الحصة: حضر/غاب + الدرجة)
const EX = {
  open() {
    const gs = Store.groups();
    U.modal('<h3>امتحان / تقييم جديد</h3><form id="exf" onsubmit="event.preventDefault();EX.create()">' +
      '<label class="f">النوع</label>' + U.radio('type', [['exam', 'امتحان'], ['quiz', 'كويز'], ['hw', 'واجب']], 'exam') +
      '<label class="f">لمين</label><select class="in" name="tgt">' + GRADES.filter(gr => gs.some(g => g.grade === gr)).map(gr => '<option value="gr:' + gr + '">' + gr + ' — كل المجموعات</option>').join('') + U.opts(gs.map(g => ['g:' + g.id, Store.gFull(g)])) + '</select>' +
      '<label class="f">الاسم (اختياري)</label><input class="in" name="title" placeholder="مثلاً: امتحان الوحدة الأولى">' +
      '<div class="row2"><div><label class="f">الدرجة النهائية</label><input class="in big num" name="max" type="number" min="1" value="' + DB.defaults.exMax + '"></div><div><label class="f">التاريخ</label><input class="in" name="d" type="date" value="' + U.today() + '"></div></div>' +
      '<div class="note" style="margin-top:12px">بعد ما تعمله هتسجّل الطلاب اللي حضروا الامتحان ودرجاتهم زي تسجيل الحصة بالظبط. اللي مجاش يتسجل غياب في الامتحان.</div>' +
      '<button class="btn aub wide" style="margin-top:16px">' + I('check') + 'يلا نبدأ</button></form>');
  },
  create() {
    const f = U.form('exf'), [k, v] = f.tgt.split(':'), g = k === 'g' ? Store.group(v) : null, grade = g ? g.grade : v;
    const a = Store.addAssess({ type: f.type, g: g ? g.id : '', grade, solo: true, max: +f.max || 20, d: f.d || U.today(), title: f.title || assessName(f.type) + ' ' + U.short(f.d || U.today()) + ' · ' + (g ? Store.gName(g) : GRADE_SHORT[grade]) });
    DB.exAtt[a.id] = {}; Store.save(); U.close(); location.hash = 'grades/' + a.id;
  },
  pick(code) {
    const a = Store.assess(+App.arg), s = Store.student(code);
    (DB.exAtt[a.id] = DB.exAtt[a.id] || {})[code] = 'p'; App.st.eq = ''; Store.save();
    U.toast(s.name.split(' ')[0] + ' — حضر الامتحان'); App.render();
    setTimeout(() => { const i = document.querySelector('[data-sc="' + code + '"]'); if (i) i.focus(); }, 60);
  },
  set(code, v) {
    const a = Store.assess(+App.arg), m = DB.exAtt[a.id] = DB.exAtt[a.id] || {};
    if (m[code] === v) delete m[code]; else m[code] = v;
    if (m[code] !== 'p' && DB.scores[a.id]) delete DB.scores[a.id][code];
    App.refresh();
  },
  score(code, el) {
    const a = Store.assess(+App.arg); Store.setScore(a.id, code, el.value);
    if (el.value !== '') (DB.exAtt[a.id] = DB.exAtt[a.id] || {})[code] = 'p';
    Store.save(); el.parentNode.classList.toggle('has', el.value !== '');
  },
  search(v) {
    App.st.eq = v; const el = document.getElementById('res'); if (!el) return;
    const a = Store.assess(+App.arg), qq = v.trim(); EX.res = [];
    if (!qq) { el.innerHTML = ''; return; }
    const mem = Store.assessMembers(a).filter(s => Att.match(s, qq)), m = DB.exAtt[a.id] || {};
    EX.res = mem.map(s => s.code);
    el.innerHTML = mem.slice(0, 6).map((s, i) => '<button class="ri' + (i ? '' : ' first') + '" onclick="EX.pick(' + s.code + ')"><span class="av">' + U.initial(s.name) + '</span><div><b>' + U.esc(s.name) + '</b><small>' + s.code + ' · ' + U.esc(Store.gName(Store.group(s.g))) + '</small></div>' + (m[s.code] === 'p' ? '<span class="tag a">حضر</span>' : '<span class="tag gl">Enter</span>') + '</button>').join('') || '<div class="ri none">مفيش طالب بالاسم ده في ' + U.esc(a.g ? Store.gName(Store.group(a.g)) : a.grade) + '</div>';
  },
  key(e) { if (e.key === 'Enter') { e.preventDefault(); if (EX.res && EX.res[0]) EX.pick(EX.res[0]); } },
  close() {
    const a = Store.assess(+App.arg), m = DB.exAtt[a.id] = DB.exAtt[a.id] || {}; let n = 0;
    Store.assessMembers(a).forEach(s => { if (!m[s.code]) { m[s.code] = 'a'; n++; } });
    const was = !!a.closed; a.closed = U.now();
    Store.log('exam', (was ? 'تعديل درجات ' : 'تسجيل ') + a.title + ' · ' + Object.keys(DB.scores[a.id] || {}).length + ' درجة');
    Store.save(); App.render(); U.toast(was ? 'اتعدلت الدرجات' : 'اتسجل الامتحان' + (n ? ' · ' + n + ' غياب' : ''));
  },
  pub(id) { const a = Store.assess(id); a.pub = !a.pub; App.refresh(); },
  del(id) { U.confirm('حذف الامتحان؟', 'هتتمسح كل درجاته.', 'احذف', () => { Store.delAssess(id); Store.save(); location.hash = 'grades'; }); },
  edit(id) {
    const a = Store.assess(id);
    U.modal('<h3>تعديل</h3><form id="eef" onsubmit="event.preventDefault();EX.saveEdit(' + id + ')"><label class="f">الاسم</label><input class="in" name="title" value="' + U.esc(a.title) + '"><div class="row2"><div><label class="f">الدرجة النهائية</label><input class="in num" name="max" type="number" min="1" value="' + a.max + '"></div><div><label class="f">التاريخ</label><input class="in" name="d" type="date" value="' + a.d + '"></div></div><button class="btn aub wide" style="margin-top:16px">حفظ</button></form>');
  },
  saveEdit(id) { const a = Store.assess(id), f = U.form('eef'); a.title = f.title || a.title; a.max = +f.max || a.max; a.d = f.d || a.d; U.close(); App.refresh(); },
};

V.grades = () => {
  if (App.arg && Store.assess(+App.arg)) return V.exam(Store.assess(+App.arg));
  const fg = App.st.xg || '', list = DB.assess.filter(a => !fg || a.grade === fg).sort((a, b) => b.d.localeCompare(a.d) || b.id - a.id);
  const grs = GRADES.filter(gr => DB.groups.some(g => g.grade === gr));
  let h = '<div class="dtop"><h1 style="font-size:24px">الامتحانات والدرجات</h1><button class="btn gold" onclick="EX.open()">' + I('plus') + 'امتحان جديد</button></div>' +
    '<div class="panel hide-d" style="background:var(--aub);color:#fff;padding:16px"><div class="sp"><div><b style="font-size:16px">امتحان لوحده؟</b><p class="fw sm" style="margin:2px 0 0;color:var(--silver)">من غير حصة — تسجّل الحضور والدرجات</p></div><button class="btn gold" onclick="EX.open()">' + I('plus') + 'امتحان جديد</button></div></div>' +
    '<div class="scroll-x"><button class="chip ' + (fg ? '' : 'on') + '" onclick="App.st.xg=\'\';App.render()">الكل</button>' + grs.map(gr => '<button class="chip ' + (fg === gr ? 'on' : '') + '" onclick="App.st.xg=' + q(gr) + ';App.render()">' + gr + '</button>').join('') + '</div>';
  if (!list.length) return h + U.empty('لسه مفيش امتحانات. الكويزات بتتعمل لوحدها لما تكتب درجة في تسجيل الحصة.', 'exam', '<button class="btn gold" onclick="EX.open()">' + I('plus') + 'امتحان جديد</button>');
  h += '<div class="slist">' + list.map((a, i) => {
    const n = Object.keys(DB.scores[a.id] || {}).length, av = Store.assessAvg(a), tot = Store.assessMembers(a).length;
    return '<button class="sc" style="--i:' + Math.min(i, 25) + '" onclick="location.hash=\'grades/' + a.id + '\'"><span class="av ' + (a.type === 'exam' ? 'lg' : '') + '" style="' + (a.type === 'exam' ? 'width:42px;height:42px;font-size:15px;border-radius:14px' : '') + '">' + I(a.type === 'exam' ? 'exam' : a.type === 'hw' ? 'edit' : 'check') + '</span><div class="nm"><b>' + U.esc(a.title) + '</b><small>' + assessName(a.type) + ' · ' + U.long(a.d) + ' · من ' + a.max + '</small><div class="mt">' + (a.solo ? '<span class="tag gl">لوحده</span>' : '<span class="tag o">مع الحصة</span>') + (a.pub ? '' : '<span class="tag g">' + I('eyeoff') + 'مخفي</span>') + '</div></div>' +
      '<div class="pc"><b>' + n + '/' + tot + '</b><small>درجات</small></div><div class="pc"><b>' + (av ?? '—') + (av !== null ? '%' : '') + '</b><small>المتوسط</small></div></button>';
  }).join('') + '</div>';
  return h;
};

// شاشة الامتحان: زي تسجيل الحصة
V.exam = a => {
  const mem = Store.assessMembers(a).sort((x, y) => x.name.localeCompare(y.name, 'ar')), m = DB.exAtt[a.id] || {}, S = DB.scores[a.id] || {};
  const pres = mem.filter(s => m[s.code] === 'p' || S[s.code] !== undefined).length, abs = mem.filter(s => m[s.code] === 'a').length, av = Store.assessAvg(a);
  const sorted = Object.values(S).sort((x, y) => y - x);
  let h = '<a class="btn soft sm" href="#grades" style="margin-bottom:12px">' + I('back', 'sm') + 'كل الامتحانات</a>' +
    '<div class="panel" style="padding:14px"><div class="sp"><div><h2 style="font-size:19px">' + U.esc(a.title) + '</h2><p class="mu fw sm" style="margin:2px 0 0">' + assessName(a.type) + ' · ' + U.long(a.d) + ' · ' + U.esc(a.g ? Store.gFull(Store.group(a.g)) : a.grade + ' (كل المجموعات)') + ' · من ' + a.max + '</p></div>' +
    '<div class="btns"><button class="btn soft sm" onclick="EX.pub(' + a.id + ')">' + I(a.pub ? 'eye' : 'eyeoff', 'sm') + (a.pub ? 'ظاهر للطلاب' : 'مخفي عن الطلاب') + '</button><button class="btn soft ic" onclick="EX.edit(' + a.id + ')">' + I('edit', 'sm') + '</button><button class="btn soft ic" onclick="EX.del(' + a.id + ')">' + I('trash', 'sm') + '</button></div></div></div>';
  if (a.closed) h += '<div class="closed">' + I('check') + '<b>الامتحان اتسجل الساعة ' + U.t12(a.closed) + '</b></div>';
  if (a.solo) h += '<div class="search">' + I('search') + '<input id="q" placeholder="الكود أو الاسم — اللي حضر الامتحان" autocomplete="off" value="' + U.esc(App.st.eq || '') + '" oninput="EX.search(this.value)" onkeydown="EX.key(event)"></div><div id="res" class="res"></div>';
  h += '<div class="stat"><span>الطلاب<b>' + mem.length + '</b></span><span>حضروا<b>' + pres + '</b></span>' + (a.solo ? '<span>غابوا<b>' + abs + '</b></span>' : '') + '<span>المتوسط<b>' + (av ?? '—') + (av !== null ? '%' : '') + '</b></span>' + (sorted.length ? '<span>أعلى درجة<b>' + sorted[0] + '</b></span>' : '') + '</div>';
  h += mem.length ? '<div class="roster">' + mem.map((s, i) => {
    const st = a.solo ? m[s.code] || (S[s.code] !== undefined ? 'p' : '') : (S[s.code] !== undefined ? 'p' : ''), v = S[s.code] ?? '';
    return '<div class="st ' + st + '" style="--i:' + Math.min(i, 20) + '"><div class="t" onclick="Prof.open(' + s.code + ')"><span class="av">' + U.initial(s.name) + '</span><div class="nm"><b>' + U.esc(s.name) + '</b><small>' + s.code + (a.g ? '' : ' · ' + U.esc(Store.gName(Store.group(s.g)))) + '</small></div>' + (v !== '' ? '<span class="tag lv-' + Store.level(v / a.max * 100)[1] + '">' + U.pct(v, a.max) + '%</span>' : '') + '</div>' +
      '<div class="acts">' + (a.solo ? '<button class="tog ' + (st === 'p' ? 'p' : '') + '" onclick="EX.set(' + s.code + ',\'p\')">' + I('check') + 'حضر</button><button class="tog ' + (st === 'a' ? 'a' : '') + '" onclick="EX.set(' + s.code + ',\'a\')">' + I('x') + 'غاب</button>' : '') +
      (st !== 'a' ? '<label class="score ' + (v !== '' ? 'has' : '') + '" style="flex:1">الدرجة<input data-sc="' + s.code + '" type="number" inputmode="decimal" min="0" max="' + a.max + '" placeholder="—" value="' + v + '" onchange="EX.score(' + s.code + ',this)">/' + a.max + '</label>' : '') + '</div></div>';
  }).join('') + '</div>' : U.empty('مفيش طلاب في الصف ده لسه', 'users');
  if (a.solo && mem.length) h += '<div class="savebar"><button class="btn gold" onclick="EX.close()">' + I('save') + (a.closed ? 'حفظ التعديلات' : 'تسجيل الامتحان') + '</button></div>';
  return h;
};
V.grades_after = () => { const i = document.getElementById('q'); if (i && App.st.eq) { i.focus(); EX.search(App.st.eq); } };
