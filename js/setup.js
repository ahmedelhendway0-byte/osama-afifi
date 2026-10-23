// خطوات الإعداد أول مرة: البيانات ← المجموعات والمواعيد ← الأسعار ← الكويز والامتحان ← المصاريف ← الرسايل ← تمام
const Wiz = {
  K: 'oa_wiz_draft',
  steps: ['أهلاً', 'المجموعات', 'الأسعار', 'الدرجات', 'المصاريف', 'الرسايل'],
  start() {
    DB = Store.blank();
    Store.ix(); Store.cache();
    Wiz.load();
    App.go('');
  },
  load() {
    try { Wiz.d = JSON.parse(localStorage.getItem(Wiz.K)); } catch (e) { Wiz.d = null; }
    if (!Wiz.d) Wiz.d = { i: 0, name: DB.teacher.name, phone: '', pw: '', places: DB.places.slice(), groups: Store.starterGroups(), split: {}, pm: {}, pr: {}, qzMax: 10, exMax: 20, qz: true, ex: false, exp: [], wa: false, portal: true, to: 'p' };
  },
  keep() { try { localStorage.setItem(Wiz.K, JSON.stringify(Wiz.d)); } catch (e) { } },
  paint() { App.paint(Wiz.render()); Wiz.after(); },
  after() { const b = document.querySelector('.wiz-b'); if (b) b.scrollTop = 0; },
  set(k, v, re) { Wiz.d[k] = v; Wiz.keep(); if (re) Wiz.paint(); },

  render() {
    if (!Wiz.d) Wiz.load();
    const d = Wiz.d, i = d.i;
    if (i >= Wiz.steps.length) return Wiz.done();
    const body = [Wiz.s0, Wiz.s1, Wiz.s2, Wiz.s3, Wiz.s4, Wiz.s5][i]();
    return '<div class="wiz"><div class="wiz-h"><div class="mini">Mr. Osama <em>Afifi</em></div><div class="steps">' + Wiz.steps.map((_, k) => '<i class="' + (k === i ? 'on' : k < i ? 'done' : '') + '"></i>').join('') + '</div></div>' +
      '<div class="wiz-b">' + body + '</div><div class="wiz-f">' + (i ? '<button class="btn ghost" onclick="Wiz.prev()">' + I('back') + '</button>' : '') +
      '<button class="btn gold" onclick="Wiz.next()">' + (i === Wiz.steps.length - 1 ? 'خلّصنا' : 'التالي') + ' ' + I('go') + '</button></div></div>';
  },
  prev() { Wiz.read(); Wiz.d.i--; Wiz.keep(); Wiz.paint(); },
  next() {
    Wiz.read();
    const d = Wiz.d;
    if (d.i === 0) {
      if (!d.name.trim()) return U.toast('اكتب اسم المستر', 'bad');
      if ((d.pw || '').length < 4) return U.toast('كلمة السر 4 حروف أو أرقام على الأقل', 'bad');
    }
    if (d.i === 1) {
      if (!d.groups.length) return U.toast('ضيف مجموعة واحدة على الأقل', 'bad');
      if (d.groups.some(g => !g.slots.length)) return U.toast('كل مجموعة محتاجة ميعاد واحد على الأقل', 'bad');
    }
    if (d.i === 2) {
      const miss = Wiz.grades().some(gr => Wiz.gGroups(gr).some(g => !(+Wiz.price(g) > 0)));
      if (miss) return U.toast('اكتب سعر كل صف', 'bad');
    }
    if (d.i === Wiz.steps.length - 1) return Wiz.finish();
    d.i++; Wiz.keep(); Wiz.paint();
  },
  // بيقرا الخانات اللي على الشاشة ويحطها في المسودة
  read() {
    const d = Wiz.d;
    document.querySelectorAll('.wiz [data-k]').forEach(e => {
      const k = e.dataset.k, v = e.type === 'checkbox' ? e.checked : e.value;
      const m = k.match(/^g(\d+)\.(\w+)(?:\.(\d+)\.(\w+))?$/);
      if (m) { const g = d.groups[+m[1]]; if (!g) return; if (m[3] !== undefined) g.slots[+m[3]][m[4]] = v; else g[m[2]] = v; return; }
      const p = k.match(/^(pr|pm|split)\.(.+)$/);
      if (p) { d[p[1]][p[2]] = p[1] === 'split' ? v : v; return; }
      const x = k.match(/^x(\d+)\.(\w+)$/);
      if (x) { d.exp[+x[1]][x[2]] = v; return; }
      d[k] = v;
    });
    Wiz.keep();
  },

  // ---------- 0: البيانات ----------
  s0() {
    const d = Wiz.d;
    return '<h1>أهلاً يا مستر</h1><p class="lead">أول حاجة: بياناتك وكلمة سر الدخول.</p><div class="panel">' +
      '<label class="f">اسم المستر</label><input class="in big" data-k="name" value="' + U.esc(d.name) + '">' +
      '<label class="f">رقم الموبايل (اختياري)</label><input class="in ltr" data-k="phone" inputmode="tel" placeholder="01xxxxxxxxx" value="' + U.esc(d.phone) + '">' +
      '<label class="f">باسورد المستر</label><input class="in big ltr" data-k="pw" type="password" placeholder="••••" value="' + U.esc(d.pw) + '"><p class="hint">هتدخل بيه من أي موبايل أو لابتوب: «المستر والأسيستنت» ← «مستر» ← الباسورد.</p></div>';
  },

  // ---------- 1: المجموعات والمواعيد ----------
  s1() {
    const d = Wiz.d, dayOpts = U.WEEK;
    return '<h1>المجموعات والمواعيد</h1><p class="lead">جهزتهالك من رسالتك. عدّل أي حاجة: الاسم، المكان، اليوم، الساعة.</p>' +
      '<div class="panel"><div class="ph"><h2>' + I('pin') + 'الأماكن</h2></div><div class="chips">' + d.places.map((p, k) => '<span class="chip on">' + U.esc(p) + (d.places.length > 1 ? '<button onclick="Wiz.delPlace(' + k + ')" style="color:var(--gold)">' + I('x', 'sm') + '</button>' : '') + '</span>').join('') +
      '<button class="chip" onclick="Wiz.addPlace()">' + I('plus') + 'مكان جديد</button></div></div>' +
      d.groups.map((g, k) => '<div class="gedit" style="--i:' + k + '"><div class="gt"><div class="gi ' + (d.places.indexOf(g.place) % 2 ? 'b' : '') + '">' + GRADE_NUM[g.grade] + '</div><div><b>' + U.esc(GRADE_SHORT[g.grade] || g.grade) + ' · ' + U.esc(g.place) + '</b></div><button class="btn soft ic" onclick="Wiz.delGroup(' + k + ')" title="حذف">' + I('trash', 'sm') + '</button></div>' +
        '<div class="row2"><div><label class="f">الصف</label><select class="in" data-k="g' + k + '.grade" onchange="Wiz.read();Wiz.paint()">' + U.opts(GRADES, g.grade) + '</select></div><div><label class="f">المكان</label><select class="in" data-k="g' + k + '.place" onchange="Wiz.read();Wiz.paint()">' + U.opts(d.places, g.place) + '</select></div></div>' +
        '<label class="f">اسم المجموعة (اختياري)</label><input class="in" data-k="g' + k + '.name" placeholder="' + U.esc((GRADE_SHORT[g.grade] || '') + ' · ' + g.place) + '" value="' + U.esc(g.name) + '">' +
        '<label class="f">المواعيد</label>' + g.slots.map((s, j) => '<div class="slotrow"><select class="in" data-k="g' + k + '.slots.' + j + '.day">' + U.opts(dayOpts, s.day) + '</select><input class="in ltr" type="time" data-k="g' + k + '.slots.' + j + '.from" value="' + s.from + '"><input class="in ltr" type="time" data-k="g' + k + '.slots.' + j + '.to" value="' + s.to + '"><button class="btn soft ic" onclick="Wiz.delSlot(' + k + ',' + j + ')">' + I('x', 'sm') + '</button></div>').join('') +
        '<button class="btn soft sm" onclick="Wiz.addSlot(' + k + ')">' + I('plus', 'sm') + 'يوم تاني</button></div>').join('') +
      '<button class="btn gold wide" onclick="Wiz.addGroup()">' + I('plus') + 'مجموعة جديدة</button>';
  },
  addPlace() { Wiz.read(); const n = prompt('اسم المكان (مثلاً: سنتر النور)'); if (n && n.trim() && !Wiz.d.places.includes(n.trim())) { Wiz.d.places.push(n.trim()); Wiz.keep(); Wiz.paint(); } },
  delPlace(k) { Wiz.read(); const p = Wiz.d.places[k]; if (Wiz.d.groups.some(g => g.place === p)) return U.toast('فيه مجموعات في المكان ده — غيّر مكانها الأول', 'bad'); Wiz.d.places.splice(k, 1); Wiz.keep(); Wiz.paint(); },
  addGroup() { Wiz.read(); const s = Store.starterGroups()[0]; s.place = Wiz.d.places[0]; s.slots = [{ day: 'السبت', from: '16:00', to: '17:30' }]; Wiz.d.groups.push(s); Wiz.keep(); Wiz.paint(); setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 50); },
  delGroup(k) { Wiz.read(); Wiz.d.groups.splice(k, 1); Wiz.keep(); Wiz.paint(); },
  addSlot(k) { Wiz.read(); const g = Wiz.d.groups[k], l = g.slots[g.slots.length - 1] || { from: '16:00', to: '17:30' }; g.slots.push({ day: 'الخميس', from: l.from, to: l.to }); Wiz.keep(); Wiz.paint(); },
  delSlot(k, j) { Wiz.read(); Wiz.d.groups[k].slots.splice(j, 1); Wiz.keep(); Wiz.paint(); },

  // ---------- 2: الأسعار ----------
  grades() { return GRADES.filter(gr => Wiz.d.groups.some(g => g.grade === gr)); },
  gGroups(gr) { return Wiz.d.groups.filter(g => g.grade === gr); },
  price(g) { const d = Wiz.d, gi = d.groups.indexOf(g); return d.split[g.grade] ? d.pr['g' + gi] : d.pr[g.grade]; },
  s2() {
    const d = Wiz.d;
    return '<h1>الأسعار</h1><p class="lead">لكل صف: الدفع شهري ولا بالحصة، والسعر كام. لو السعر مختلف من سنتر للتاني فعّل «سعر لكل مكان».</p>' +
      Wiz.grades().map((gr, k) => {
        const pm = d.pm[gr] || 'month', sp = !!d.split[gr], unit = pm === 'month' ? 'ج في الشهر' : 'ج للحصة';
        return '<div class="gedit" style="--i:' + k + '"><div class="gt"><div class="gi">' + GRADE_NUM[gr] + '</div><div><b>' + gr + '</b><small class="mu xs" style="display:block">' + Wiz.gGroups(gr).length + ' مجموعة</small></div></div>' +
          '<div class="price-row"><div><label class="f">نظام الدفع</label>' + U.seg([['month', 'شهري'], ['session', 'بالحصة']], pm, "v=>{Wiz.read();Wiz.d.pm['" + gr + "']=v;Wiz.keep();Wiz.paint()}") + '</div>' +
          (sp ? '<div></div>' : '<div><label class="f">السعر (' + unit + ')</label><input class="in big num" type="number" inputmode="numeric" min="0" data-k="pr.' + gr + '" value="' + U.esc(d.pr[gr] || '') + '" placeholder="0"></div>') + '</div>' +
          (sp ? Wiz.gGroups(gr).map(g => { const gi = d.groups.indexOf(g); return '<div class="row2" style="align-items:center;margin-top:8px"><b class="sm">' + U.esc(g.place) + '</b><input class="in num" type="number" inputmode="numeric" min="0" data-k="pr.g' + gi + '" value="' + U.esc(d.pr['g' + gi] || '') + '" placeholder="' + unit + '"></div>'; }).join('') : '') +
          (Wiz.gGroups(gr).length > 1 ? '<label class="chk"><input type="checkbox" data-k="split.' + gr + '" ' + (sp ? 'checked' : '') + ' onchange="Wiz.read();Wiz.paint()"><i>' + I('check') + '</i>سعر لكل مكان</label>' : '') + '</div>';
      }).join('');
  },

  // ---------- 3: الكويز والامتحان ----------
  s3() {
    const d = Wiz.d;
    return '<h1>الكويز والامتحان</h1><p class="lead">الدرجة النهائية الافتراضية. تقدر تغيّرها في أي امتحان بعد كده.</p><div class="panel">' +
      '<div class="row2"><div><label class="f">الكويز من كام؟</label><input class="in big num" type="number" min="1" data-k="qzMax" value="' + d.qzMax + '"></div><div><label class="f">الامتحان من كام؟</label><input class="in big num" type="number" min="1" data-k="exMax" value="' + d.exMax + '"></div></div>' +
      '<label class="chk"><input type="checkbox" data-k="qz" ' + (d.qz ? 'checked' : '') + '><i>' + I('check') + '</i>فيه كويز في كل حصة (بتكتب الدرجة وإنت بتسجّل الحضور)</label></div>' +
      '<div class="panel" style="--i:1"><div class="ph"><h2>' + I('exam') + 'الامتحان لوحده</h2></div><p class="mu fw" style="margin:0">ممكن تعمل امتحان في أي وقت من غير حصة: تختار الصف، وتسجّل اللي حضروا ودرجاتهم زي تسجيل الحصة بالظبط، والدرجات بتتحسب في مستوى الطالب.</p></div>';
  },

  // ---------- 4: المصاريف ----------
  s4() {
    const d = Wiz.d, scopes = [['', 'كل المجموعات']].concat(d.places.map(p => ['place:' + p, p]), Wiz.grades().map(g => ['grade:' + g, g]));
    return '<h1>المصاريف</h1><p class="lead">اللي بتدفعه كل شهر عشان نطرحه من الإيراد. اكتب الاسم لوحده والرقم لوحده. (تقدر تسيبها وتضيفها بعدين)</p>' +
      d.exp.map((e, k) => '<div class="gedit" style="--i:' + k + '"><div class="gt"><div class="gi">' + I('receipt', 'sm') + '</div><div><input class="in" data-k="x' + k + '.title" placeholder="اسم المصروف (مثلاً: إيجار سنتر الأسس)" value="' + U.esc(e.title) + '"></div><button class="btn soft ic" onclick="Wiz.read();Wiz.d.exp.splice(' + k + ',1);Wiz.keep();Wiz.paint()">' + I('trash', 'sm') + '</button></div>' +
        '<div class="row2"><div><label class="f">المبلغ</label><input class="in num" type="number" inputmode="numeric" min="0" data-k="x' + k + '.amt" value="' + U.esc(e.amt) + '" placeholder="0"></div><div><label class="f">على مين</label><select class="in" data-k="x' + k + '.scope">' + U.opts(scopes, e.scope) + '</select></div></div>' +
        '<label class="f">بيتحسب إزاي</label><select class="in" data-k="x' + k + '.type">' + U.opts(Object.entries(EXP_TYPES).filter(x => x[0] !== 'once'), e.type) + '</select></div>').join('') +
      '<button class="btn gold wide" onclick="Wiz.read();Wiz.d.exp.push({title:\'\',amt:\'\',type:\'month\',scope:\'\'});Wiz.keep();Wiz.paint()">' + I('plus') + 'مصروف جديد</button>' +
      '<div class="note" style="margin-top:14px;background:#ffffff14;color:var(--silver)">مثال: «إيجار سنتر الأسس» 2000 «مبلغ ثابت كل شهر» · «نسبة سنتر بيومي» 20 «على كل طالب في الشهر» على «سنتر بيومي».</div>';
  },

  // ---------- 5: الرسايل ----------
  s5() {
    const d = Wiz.d;
    return '<h1>الرسايل</h1><p class="lead">إنت اللي بتقرر. تقدر تقفلها وتفتحها من الإعدادات في أي وقت.</p><div class="panel">' +
      U.tgl(d.wa, "v=>Wiz.set('wa',v)", 'رسايل واتساب لأولياء الأمور', 'بعد تسجيل الحصة يطلعلك زرار لكل ولي أمر (غياب / تقرير). مقفولة = التسجيل بيتم عادي من غير رسايل.') +
      U.tgl(d.portal, "v=>Wiz.set('portal',v)", 'رسايل في بوابة الطالب وولي الأمر', 'تبعت رسالة أو ملف أو صورة تظهر عندهم لما يدخلوا.') + '</div>' +
      '<div class="panel" style="--i:1"><label class="f" style="margin-top:0">رسايل الواتساب بتروح لمين؟</label>' + U.seg([['p', 'ولي الأمر'], ['s', 'الطالب'], ['b', 'الاتنين']], d.to, "v=>Wiz.set('to',v,1)") + '</div>';
  },

  // ---------- تمام ----------
  done() {
    return '<div class="wiz"><div class="wiz-b" style="text-align:center"><div class="done-anim"><svg class="i" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></div>' +
      '<h1>كله جاهز يا مستر</h1><p class="lead">' + Wiz.d.groups.length + ' مجموعات اتجهزت. ابدأ ضيف طلابك.</p></div>' +
      '<div class="wiz-f"><button class="btn gold" onclick="Wiz.enter()">ادخل السيستم ' + I('go') + '</button></div></div>';
  },
  async finish() {
    const d = Wiz.d;
    DB.teacher.name = d.name.trim(); DB.teacher.phone = U.phone(d.phone); DB.teacher.pw = d.pw;
    DB.places = d.places.slice();
    DB.groups = d.groups.map((g, k) => {
      const pm = d.pm[g.grade] || 'month', pr = +Wiz.price(g) || 0;
      return { id: 'G' + (k + 1), grade: g.grade, place: g.place, name: (g.name || '').trim(), slots: g.slots.map(s => ({ day: s.day, from: s.from, to: s.to })).sort((a, b) => U.WEEK.indexOf(a.day) - U.WEEK.indexOf(b.day)),
        payMode: pm, price: pm === 'session' ? pr : 0, monthPrice: pm === 'month' ? pr : 0, qz: !!d.qz, qzMax: +d.qzMax || 10, ex: false, exMax: +d.exMax || 20, active: true };
    });
    DB.defaults = { qzMax: +d.qzMax || 10, exMax: +d.exMax || 20 };
    DB.expenses = d.exp.filter(e => e.title.trim() && +e.amt > 0).map(e => ({ id: Store.nid(), title: e.title.trim(), amt: +e.amt, type: e.type, scope: e.scope, from: U.month() }));
    DB.notif.wa = !!d.wa; DB.notif.portal = !!d.portal; DB.notif.to = d.to;
    DB.ready = true;
    if (Sync.live) {
      const b = document.querySelector('.wiz-f .btn.gold'); if (b) { b.disabled = true; b.textContent = 'بيتحفظ أونلاين…'; }
      let r; try { r = await Sync.setup(d.pw); } catch (e) { r = { ok: false, error: 'net' }; }
      if (!r.ok) { DB.ready = false; if (b) { b.disabled = false; b.textContent = 'خلّصنا'; } return U.toast(r.error === 'ready' ? 'السيستم اتعمله إعداد قبل كده — ادخل بالباسورد' : 'مفيش نت — جرّب تاني', 'bad'); }
    }
    Store.cache();
    localStorage.removeItem(Wiz.K);
    App.setSes({ role: 'teacher', id: 'teacher' });
    d.i = Wiz.steps.length; Wiz.paint();
    Wiz.confetti();
  },
  enter() { Wiz.d = null; location.hash = 'home'; App.go('home'); },
  confetti() {
    const c = document.createElement('div'); c.className = 'confetti';
    for (let k = 0; k < 70; k++) { const i = document.createElement('i'); i.style.left = Math.random() * 100 + '%'; i.style.background = ['#EAAA00', '#DDE3E8', '#fff'][k % 3]; i.style.animationDuration = 1.6 + Math.random() * 1.6 + 's'; i.style.animationDelay = Math.random() * .6 + 's'; c.appendChild(i); }
    document.body.appendChild(c); setTimeout(() => c.remove(), 4200);
  },
};
