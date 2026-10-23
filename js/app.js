// الهيكل العام: الدخول، القوائم، التنقل بين الشاشات
const V = {}; // كل شاشة دالة بترجع HTML
const SES_KEY = window.Sync && Sync.live ? 'oa_ses_live' : 'oa_ses_v1';

const App = {
  ses: null,   // {role: teacher | assistant | student | parent, id}
  view: '',
  st: {},      // حالة الشاشات (فلاتر، اختيارات)

  init() {
    try { App.ses = JSON.parse(localStorage.getItem(SES_KEY)); } catch (e) { App.ses = null; }
    Store.load();
    // رابط دخول لقسم معين: #login-staff (المستر والأسيستنت) أو #login-family (الطلاب وأولياء الأمور)
    const lr = location.hash.match(/^#login-(staff|family|teacher|assistant|student|parent)$/);
    if (lr) { App.st.lr = /teacher|assistant/.test(lr[1]) ? 'staff' : /student|parent/.test(lr[1]) ? 'family' : lr[1]; history.replaceState(null, '', location.pathname + location.search); }
    if (window.Sync) Sync.boot();
    N.init();
    if (App.ses && (!App.valid() || (Sync.live && !Sync.token()))) App.ses = null;
    App.go(location.hash.slice(1) || '');
    window.addEventListener('hashchange', () => App.go(location.hash.slice(1)));
  },
  valid() {
    const s = App.ses; if (!DB || !s) return false;
    if (s.role === 'teacher') return true;
    if (s.role === 'assistant') return !!Store.asst(s.id);
    if (s.role === 'student') return !!Store.student(s.id);
    if (s.role === 'parent') return !!Store.student(s.id);
    return false;
  },
  setSes(s) { App.ses = s; try { s ? localStorage.setItem(SES_KEY, JSON.stringify(s)) : localStorage.removeItem(SES_KEY); } catch (e) { } },
  role() { return App.ses && App.ses.role; },
  isAsst() { return App.role() === 'assistant'; },
  staff() { return App.role() === 'teacher' || App.role() === 'assistant'; },
  can(p) { return !App.isAsst() || !!DB.perms[p]; },

  nav() {
    if (!App.staff()) return [['portal', 'home', 'الرئيسية']];
    const n = [['home', 'home', 'الرئيسية'], ['att', 'att', 'تسجيل الحصة'], ['students', 'users', 'الطلاب'], ['groups', 'layers', 'المجموعات']];
    if (App.can('grades')) n.push(['grades', 'exam', 'الامتحانات والدرجات']);
    if (App.can('money')) n.push(['money', 'wallet', 'الحسابات والمصاريف']);
    if (App.can('msgs')) n.push(['msgs', 'msg', 'الرسايل']);
    if (!App.isAsst()) n.push(['settings', 'sliders', 'الإعدادات']);
    return n;
  },
  short: { home: 'الرئيسية', att: 'الحصة', students: 'الطلاب', groups: 'المجموعات', grades: 'الدرجات', money: 'الحسابات', msgs: 'الرسايل', settings: 'الإعدادات', portal: 'الرئيسية' },

  go(view) {
    U.close(true);
    const lr = (view || '').match(/^login-(staff|family)$/);
    if (lr) { App.st.lr = lr[1]; view = ''; history.replaceState(null, '', location.pathname + location.search); }
    if (Sync.live && !App.ses) {
      // أونلاين: لو المستر لسه ماعملش الإعداد يبقى خطوات الإعداد، غير كده الدخول
      if (Sync.ready === null) { App.paint('<div class="login"><div class="lbox"><div class="logo big"><div class="mr">MR.</div><div class="nm">Osama Afifi</div><div class="lgl"></div><div class="sb">ENGLISH · PREP 1 · 2 · 3</div></div></div></div>'); Sync.status().then(() => App.go(view)); return; }
      if (!Sync.ready) { if (DB && !DB.ready) { App.paint(Wiz.render()); Wiz.after(); } else App.paint(V.welcome()); return; }
      App.paint(V.login()); return;
    }
    if (!DB && !Sync.live) { App.paint(V.welcome()); return; }
    if (DB && !DB.ready && !Sync.live) { App.paint(Wiz.render()); Wiz.after(); return; }
    if (!App.ses || !DB) { App.paint(V.login()); return; }
    const nav = App.nav(), sub = view.split('/');
    if (!nav.some(n => n[0] === sub[0])) view = nav[0][0];
    App.view = view.split('/')[0]; App.arg = view.split('/')[1] || '';
    if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view);
    App.render(true);
  },
  render(fresh) {
    const y = window.scrollY, fn = V[App.view];
    App.paint(App.shell(fn ? fn() : U.empty()));
    if (!fresh) { window.scrollTo(0, y); document.querySelector('.main').style.animation = 'none'; }
    else window.scrollTo(0, 0);
    document.querySelectorAll('.scroll-x').forEach(r => { const on = r.querySelector('.on'); if (on) r.scrollLeft += on.getBoundingClientRect().left - r.getBoundingClientRect().left - (r.clientWidth - on.offsetWidth) / 2; });
    if (V[App.view + '_after']) V[App.view + '_after']();
    U.countUp(document.querySelector('.main'));
    if (Sync.live) Sync.hydrate();
    N.check();
  },
  paint(h) { document.getElementById('app').innerHTML = h; },
  refresh() { Store.save(); App.render(); },

  who() {
    const r = App.role();
    if (r === 'teacher') return ['مستر ' + DB.teacher.name, 'English · إعدادي'];
    if (r === 'assistant') { const a = Store.asst(App.ses.id) || {}; return [a.name || 'أسيستنت', 'أسيستنت مستر ' + DB.teacher.name]; }
    if (r === 'student') { const s = Store.student(App.ses.id); return [s.name, 'طالب · ' + s.code]; }
    const k = Store.student(App.ses.id); return ['ولي أمر ' + Msg.first(k), 'كود ' + k.code];
  },
  shell(body) {
    const nav = App.nav(), w = App.who(), cur = App.view;
    const mob = App.staff() ? ['home', 'att', 'students', 'groups'].filter(k => nav.some(n => n[0] === k)) : [];
    const more = nav.filter(n => !mob.includes(n[0]));
    const title = (nav.find(n => n[0] === cur) || [])[2] || '';
    const cnt = { students: Store.active().length };
    return '<div class="app"><aside class="side"><div class="logo"><div class="mr">MR.</div><div class="nm">Osama Afifi</div><div class="lgl"></div><div class="sb">ENGLISH · PREP 1 · 2 · 3</div></div>' +
      nav.map(n => '<a href="#' + n[0] + '" class="' + (n[0] === cur ? 'on' : '') + '">' + I(n[1]) + n[2] + (cnt[n[0]] ? '<span class="cnt">' + cnt[n[0]] + '</span>' : '') + '</a>').join('') +
      '<div class="me"><div class="ib" style="background:var(--gold);color:var(--aub);font-weight:900">' + U.initial(w[0].replace(/^(مستر|ولي أمر) /, '')) + '</div><div style="flex:1;min-width:0"><b>' + U.esc(w[0]) + '</b><small>' + U.esc(w[1]) + '</small></div>' + N.bell() + '<button class="ib" onclick="App.logout()" title="خروج">' + I('logout', 'sm') + '</button></div></aside>' +
      '<div style="min-width:0"><header class="top mob"><div class="ttl">' + (cur === 'home' || cur === 'portal' ? '<div class="mini">Mr. Osama <em>Afifi</em></div>' : '<b>' + U.esc(title) + '</b>') + '</div><div class="btns">' + (window.Sync ? Sync.badge() : '') + N.bell() +
      (App.staff() ? '' : '<button class="ib" onclick="App.logout()">' + I('logout') + '</button>') + '</div></header>' +
      '<main class="main">' + body + '<div class="pw">POWERED BY <b>HINDAWY</b></div></main></div>' +
      (App.staff() ? '<nav class="bnav">' + mob.map(k => { const n = nav.find(x => x[0] === k); return '<a href="#' + k + '" class="' + (k === cur ? 'on' : '') + '">' + I(n[1]) + App.short[k] + '</a>'; }).join('') +
        '<a href="javascript:App.more()" class="' + (more.some(n => n[0] === cur) ? 'on' : '') + '">' + I('grid') + 'المزيد</a></nav>' : '') + '</div>';
  },
  more() {
    const nav = App.nav().filter(n => !['home', 'att', 'students', 'groups'].includes(n[0]));
    U.modal('<h3>المزيد</h3><div class="cards" style="grid-template-columns:1fr 1fr">' + nav.map((n, i) => '<a class="k" style="--i:' + i + '" href="#' + n[0] + '" onclick="U.close(true)"><div class="ic">' + I(n[1]) + '</div><b style="font-size:15px">' + n[2] + '</b></a>').join('') +
      '<button class="k" style="--i:' + nav.length + ';text-align:right" onclick="App.logout()"><div class="ic">' + I('logout') + '</div><b style="font-size:15px">خروج</b></button></div>');
  },
  logout() { if (window.Sync) Sync.logout(); App.setSes(null); App.st = {}; U.close(true); App.go(''); },

  // ================= الدخول =================
  async login() {
    const f = U.form('lf'), u = (f.u || '').trim(), p = (f.p || '').trim(), r = App.lrole();
    let s = null;
    if (window.Sync && Sync.live) {
      const btn = document.querySelector('#lf .btn'); if (btn) { btn.disabled = true; btn.textContent = 'بيدخل…'; }
      let res; try { res = await Sync.login(r, u, p); } catch (e) { res = { ok: false, error: 'net' }; }
      if (!res.ok) { U.toast(res.error === 'locked' ? 'محاولات كتير غلط — استنى ربع ساعة' : res.error === 'net' ? 'مفيش اتصال بالنت' : 'البيانات غلط', 'bad'); if (btn) { btn.disabled = false; btn.textContent = 'دخول'; } return; }
      s = { role: r, id: r === 'student' || r === 'parent' ? +res.key : r === 'teacher' ? 'teacher' : String(res.key).toUpperCase() };
      App.setSes(s); App.st = {}; App.go(''); return;
    }
    // المستر: الباسورد بس · الأسيستنت: الباسورد بس (كل أسيستنت ليه باسورد مختلف)
    if (r === 'teacher' && p === DB.teacher.pw) s = { role: 'teacher', id: 'teacher' };
    if (r === 'assistant') { const a = DB.assts.find(x => x.pw === p); if (a) s = { role: 'assistant', id: a.user }; }
    // الطالب وولي الأمر: كود الطالب + الرقم السري بتاعه
    if (r === 'student' || r === 'parent') { const x = Store.student(+u); if (x && x.pin === p) s = { role: r, id: x.code }; }
    if (!s) { U.toast(r === 'student' || r === 'parent' ? 'الكود أو الرقم السري غلط' : 'الباسورد غلط', 'bad'); return; }
    App.setSes(s); App.st = {}; App.go('');
  },
  // الدور المختار في الفورم: قسم المستر/الأسيستنت أو قسم الطالب/ولي الأمر
  lrole() { return App.st.lr === 'family' ? (App.st.lf || 'parent') : (App.st.ls || 'teacher'); },
};

V.login = () => {
  const sec = App.st.lr === 'family' ? 'family' : 'staff', r = App.lrole();
  const R = { staff: ['shield', 'المستر والأسيستنت'], family: ['users', 'الطلاب وأولياء الأمور'] };
  const who = sec === 'staff' ? [['teacher', 'مستر'], ['assistant', 'أسيستنت']] : [['parent', 'ولي أمر'], ['student', 'طالب']];
  return '<div class="login"><div class="lbox"><div class="logo big"><div class="mr">MR.</div><div class="nm">Osama Afifi</div><div class="lgl"></div><div class="sb">ENGLISH · PREP 1 · 2 · 3</div></div>' +
    '<div class="lcard"><div class="roles two">' + Object.entries(R).map(([k, v]) => '<button class="' + (k === sec ? 'on' : '') + '" onclick="App.st.lr=\'' + k + '\';App.paint(V.login())">' + I(v[0]) + v[1] + '</button>').join('') + '</div>' +
    '<form id="lf" onsubmit="event.preventDefault();App.login()"><label class="f" style="margin-top:0">إنت مين؟</label>' +
    U.seg(who, r, "v=>{App.st." + (sec === 'staff' ? 'ls' : 'lf') + "=v;App.paint(V.login());document.querySelector('#lf input').focus()}", 'gd') +
    (sec === 'family' ? '<label class="f">كود الطالب</label><input class="in big ltr" name="u" inputmode="numeric" placeholder="1001" autocomplete="username" required>' : '') +
    '<label class="f">' + (sec === 'family' ? 'الرقم السري' : 'الباسورد') + '</label><input class="in big ltr" name="p" type="password" inputmode="' + (sec === 'family' ? 'numeric' : 'text') + '" autocomplete="current-password" required>' +
    '<p class="hint">' + (sec === 'family' ? 'الكود والرقم السري بيوصلوك من المستر. كل طالب ليه رقم سري مختلف.' : r === 'teacher' ? 'باسورد المستر.' : 'الباسورد اللي المستر إداهولك.') + '</p>' +
    '<button class="btn aub wide" style="margin-top:18px">دخول ' + I('go') + '</button></form></div><div class="pw-foot">POWERED BY HINDAWY</div></div></div>';
};

// أول مرة خالص على الجهاز ده
V.welcome = () => '<div class="wiz"><div class="wiz-b" style="padding-top:40px"><div class="hero-logo"><div class="logo big"><div class="mr">MR.</div><div class="nm">Osama Afifi</div><div class="lgl"></div><div class="sb">ENGLISH · PREP 1 · 2 · 3</div></div></div>' +
  '<h1 style="text-align:center">أهلاً يا مستر أسامة</h1><p class="lead" style="text-align:center">سيستم الحصص بتاعك: الحضور، الامتحانات، الفلوس، والرسايل — كله في مكان واحد.</p>' +
  '<div class="feat">' + [['att', 'الحضور', 'بضغطة'], ['exam', 'الامتحانات', 'مع الحصة أو لوحدها'], ['wallet', 'الحسابات', 'الإيراد − المصاريف'], ['msg', 'الرسايل', 'للطلاب وأولياء الأمور']].map((x, i) => '<div style="--i:' + i + '">' + I(x[0]) + '<b>' + x[1] + '</b>' + x[2] + '</div>').join('') + '</div></div>' +
  '<div class="wiz-f"><button class="btn gold" onclick="Wiz.start()">يلا نبدأ ' + I('go') + '</button></div></div>';

document.addEventListener('DOMContentLoaded', App.init);
