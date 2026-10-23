// بوابة الطالب وولي الأمر: كل واحد يشوف اللي يخصه بس
V.portal = () => {
  const ses = App.ses, parent = ses.role === 'parent';
  const kids = [Store.student(ses.id)];
  const kid = kids[0], g = Store.group(kid.g), tab = App.st.pt || 'home';
  const rate = Store.attRate(kid.code), av = Store.avg(kid.code, true), lv = Store.level(av), A = Store.stAtt(kid.code), ab = A.filter(a => a.st === 'a').length;
  const posts = DB.notif.portal ? Store.postsFor(kid, ses.role) : [];
  let h = kids.length > 1 ? '<div class="scroll-x">' + kids.map(k => '<button class="chip ' + (k === kid ? 'on' : '') + '" onclick="App.st.pk=' + k.code + ';App.render()">' + U.esc(k.name.split(' ').slice(0, 2).join(' ')) + '</button>').join('') + '</div>' : '';
  h += '<div class="kid"><div style="position:relative;z-index:1"><p style="margin:0">' + (parent ? 'ولي أمر' : 'أهلاً يا') + '</p><h1>' + U.esc(parent ? kid.name : Msg.first(kid)) + '</h1><p>كود ' + kid.code + ' · ' + U.esc(g ? Store.gFull(g) : '') + '</p>' +
    (g ? '<div class="btns" style="margin-top:10px">' + g.slots.map(s => '<span class="tag g">' + s.day + ' ' + U.t12(s.from) + '</span>').join('') + '<span class="tag" style="background:#ffffff22;color:#fff">' + I('pin') + U.esc(g.place) + '</span></div>' : '') + '</div></div>';
  h += '<div class="rings">' + U.ring(rate, 'الحضور') + U.ring(av, 'الدرجات', 'g') + '<div class="ring"><div style="height:64px;display:grid;place-items:center"><span class="tag lv-' + lv[1] + '" style="font-size:15px;padding:6px 14px">' + lv[0] + '</span></div><span>المستوى</span></div></div>';
  h += '<div class="tabs">' + [['home', 'send', 'الرسايل' + (posts.length ? ' (' + posts.length + ')' : '')], ['gr', 'chart', 'الدرجات'], ['att', 'cal', 'الحضور']].concat(parent ? [['pay', 'coins', 'الدفع']] : []).map(t => '<button class="' + (tab === t[0] ? 'on' : '') + '" onclick="App.st.pt=\'' + t[0] + '\';App.render()">' + I(t[1], 'sm') + t[2] + '</button>').join('') + '</div>';
  if (tab === 'home') h += posts.map((x, i) => V.post(x, i)).join('') || U.empty('لسه مفيش رسايل من المستر', 'send');
  if (tab === 'gr') { const S = Store.scoresOf(kid.code, true); h += S.length ? '<div class="panel">' + U.bars(S.slice(-8).map(x => Math.round(x.v / x.a.max * 100)), S.slice(-8).map(x => U.short(x.a.d)), 100) + S.slice().reverse().map(x => '<div class="ln"><span><b>' + U.esc(x.a.title) + '</b><small>' + assessName(x.a.type) + ' · ' + U.long(x.a.d) + '</small></span><span class="tag lv-' + Store.level(x.v / x.a.max * 100)[1] + '">' + x.v + ' / ' + x.a.max + '</span></div>').join('') + '</div>' : U.empty('لسه مفيش درجات', 'chart'); }
  if (tab === 'att') h += '<div class="panel"><div class="sp" style="margin-bottom:12px"><b>حضر ' + (A.length - ab) + ' · غاب ' + ab + '</b><span class="mu sm">من ' + A.length + ' حصة</span></div>' + (A.length ? '<div class="hist">' + A.map(a => '<span class="' + (a.st === 'a' ? 'a' : '') + '"><b>' + U.short(a.d) + '</b>' + U.SHORT[U.dayName(a.d)] + ' · ' + (a.st === 'p' ? 'حضر' : 'غاب') + '</span>').join('') + '</div>' : U.empty('لسه مفيش حصص', 'cal')) + '</div>';
  if (tab === 'pay') {
    const ms = [...Array(6)].map((_, i) => U.addMonths(U.month(), -i)), db = Store.debt(kid.code);
    h += '<div class="panel">' + (g && g.payMode === 'month' ? '<div class="hist">' + ms.map(m => { const p = Store.sub(kid.code, m); return '<span class="' + (p ? '' : 'a') + '"><b>' + U.MONTHS[+m.slice(5) - 1] + '</b>' + (p ? 'مدفوع' : 'مش مدفوع') + '</span>'; }).join('') + '</div>' : '') +
      '<div class="ln" style="margin-top:10px"><span>' + (g && g.payMode === 'month' ? 'الاشتراك الشهري' : 'سعر الحصة') + '</span><b>' + U.money(g ? Store.gPrice(g) : 0) + '</b></div>' + (db ? '<div class="ln"><span>عليه</span><b>' + U.money(db) + '</b></div>' : '') + '</div>';
  }
  h += '<details class="panel" style="margin-top:16px"><summary class="fw" style="cursor:pointer">' + I('key', 'sm') + ' تغيير الرقم السري</summary><p class="mu fw sm">الرقم السري ده بيدخل بيه الطالب وولي الأمر الاتنين — لو غيّرته عرّف التاني.</p><form id="ppf" class="row2" style="align-items:end" onsubmit="event.preventDefault();V.ppw()"><input class="in ltr" name="pw" type="password" inputmode="numeric" placeholder="الرقم السري الجديد" minlength="4"><button class="btn aub">حفظ</button></form></details>';
  return h;
};
V.ppw = async () => {
  const p = U.form('ppf').pw; if (!p || p.length < 4) return U.toast('4 حروف أو أرقام على الأقل', 'bad');
  if (await Store.setPw(App.ses.role, String(App.ses.id), p)) { App.render(); U.toast('اتغيرت'); }
};
