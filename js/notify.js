// الإشعارات: جرس جوه السيستم + إشعار على الموبايل لأي حاجة جديدة
// - الطالب وولي الأمر: رسايل المستر، الدرجات، الحضور والغياب، الدفع
// - المستر والأسيستنت: اللي التاني سجّله (طالب جديد، تسجيل حصة، امتحان، دفع، رسالة)
const N = {
  me() { const s = App.ses; return s ? (/[?&]demo=1(&|$)/.test(location.search) ? 'demo_' : '') + s.role + '_' + s.id : ''; },
  get(k) { try { return localStorage.getItem('oa_' + k + '_' + N.me()) || ''; } catch (e) { return ''; } },
  put(k, v) { try { localStorage.setItem('oa_' + k + '_' + N.me(), v); } catch (e) { } },
  feed() {
    const s = App.ses; if (!s || !DB) return [];
    const out = [];
    if (App.staff()) {
      DB.log.forEach(x => { if (x.by === (s.role === 'teacher' ? 'teacher' : s.id)) return; out.push({ k: 'l' + x.id, at: x.at, icon: { student: 'userplus', att: 'att', exam: 'exam', pay: 'coins', post: 'send' }[x.kind] || 'bell', t: Store.byName(x.by), b: x.text, go: x.s ? 'p:' + x.s : '' }); });
    } else {
      const kid = Store.student(s.id); if (!kid) return [];
      if (DB.notif.portal) Store.postsFor(kid, s.role).forEach(p => out.push({ k: 'p' + p.id, at: p.d + ' ' + p.tm, icon: (p.files || []).length ? 'clip' : 'send', t: 'رسالة من المستر', b: (p.body || '').slice(0, 90) || (p.files[0] || {}).name, go: 'home' }));
      Store.scoresOf(kid.code, true).forEach(x => out.push({ k: 's' + x.a.id, at: x.a.d + ' ' + (x.a.closed || Store.closedAt(x.a.g, x.a.d) || '20:00'), icon: 'exam', t: 'درجة جديدة', b: x.a.title + ': ' + x.v + ' / ' + x.a.max, go: 'gr' }));
      Store.stAtt(kid.code).slice(0, 40).forEach(a => out.push({ k: 'a' + a.id, at: a.d + ' ' + (a.tm || Store.closedAt(a.g, a.d) || '20:00'), icon: a.st === 'p' ? 'check' : 'alert', t: a.st === 'p' ? 'حضر الحصة' : 'غاب عن الحصة', b: Store.gName(Store.group(a.g)) + ' · ' + U.long(a.d), go: 'att' }));
      if (s.role === 'parent') DB.subs.filter(x => x.s === kid.code).forEach(x => out.push({ k: 'm' + x.id, at: x.d + ' 12:00', icon: 'coins', t: 'اتسجل دفع الاشتراك', b: 'شهر ' + U.monthName(x.m) + ' · ' + U.money(x.amt), go: 'pay' }));
    }
    return out.sort((a, b) => b.at.localeCompare(a.at));
  },
  unread() { const seen = N.get('seen'); return N.feed().filter(x => x.at > seen).length; },
  bell(cls) { const n = N.unread(); return '<button class="ib ' + (cls || '') + '" onclick="N.open()" title="الإشعارات">' + I('bell') + (n ? '<span class="nb">' + (n > 9 ? '9+' : n) + '</span>' : '') + '</button>'; },
  open() {
    const f = N.feed().slice(0, 60), seen = N.get('seen');
    const perm = 'Notification' in window ? Notification.permission : 'none';
    U.modal('<h3>الإشعارات</h3>' +
      (perm === 'default' ? '<div class="alrt a" onclick="N.enable()"><div class="ai">' + I('bell') + '</div><div><b>فعّل إشعارات الموبايل</b><small>عشان يوصلك تنبيه أول ما حاجة جديدة تتسجل</small></div>' + I('chev', 'sm') + '</div>' : perm === 'denied' ? '<div class="warn">' + I('alert') + '<span>الإشعارات مقفولة من المتصفح. افتحها من إعدادات المتصفح ← الموقع ده ← الإشعارات.</span></div>' : '') +
      (f.map((x, i) => '<div class="alrt" style="' + (x.at > seen ? 'background:var(--gold-15)' : '') + '" onclick="N.go(' + q(x.go) + ')"><div class="ai" style="' + (x.at > seen ? '' : 'background:var(--card)') + '">' + I(x.icon) + '</div><div><b>' + U.esc(x.t) + '</b><small>' + U.esc(x.b) + '</small><small>' + U.long(x.at.slice(0, 10)) + ' · ' + U.t12(x.at.slice(11)) + '</small></div></div>').join('') || U.empty('مفيش إشعارات لسه', 'bell')));
    if (f[0]) N.put('seen', f[0].at);
    document.querySelectorAll('.nb').forEach(e => e.remove());
  },
  go(t) {
    U.close(true); if (!t) return;
    if (t.startsWith('p:')) return Prof.open(+t.slice(2));
    if (!App.staff()) { App.st.pt = t; App.render(); }
  },
  // تفعيل إشعارات الموبايل
  async enable() {
    if (!('Notification' in window)) return U.toast('المتصفح ده مش بيدعم الإشعارات', 'bad');
    const p = await Notification.requestPermission();
    if (p !== 'granted') return U.toast('الإشعارات اتقفلت', 'bad');
    N.put('notified', (N.feed()[0] || {}).at || '');
    await N.show('الإشعارات اشتغلت', 'هيوصلك تنبيه أول ما حاجة جديدة تتسجل');
    U.close(true); App.render();
  },
  async show(title, body, tag) {
    try {
      const reg = 'serviceWorker' in navigator && await navigator.serviceWorker.getRegistration();
      const o = { body, tag: tag || 'oa', icon: 'icon.svg', badge: 'icon.svg', lang: 'ar', dir: 'rtl' };
      if (reg) reg.showNotification(title, o); else new Notification(title, o);
    } catch (e) { }
  },
  // بعد أي تحديث في البيانات: ابعت إشعار باللي جديد من آخر مرة
  check() {
    if (!App.ses || !('Notification' in window) || Notification.permission !== 'granted') return;
    const last = N.get('notified'), fresh = N.feed().filter(x => x.at > last);
    if (!fresh.length) return;
    N.put('notified', fresh[0].at);
    if (fresh.length > 3) N.show('Mr. Osama Afifi', fresh.length + ' حاجات جديدة', 'oa-many');
    else fresh.reverse().forEach(x => N.show(x.t, x.b, x.k));
  },
  init() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { });
    setInterval(N.check, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) N.check(); });
  },
};
