// الديمو اللي جوه العرض: ?demo=1#demo-<الدور>-<الشاشة>  مثلاً #demo-teacher-att
// بيانات تجريبية متخزنة لوحدها (oa_db_demo) ومش بتلمس الداتابيز الحقيقية خالص.
const Demo = {
  on: /[?&]demo=1(&|$)/.test(location.search),
  NAMES: ['أحمد', 'محمد', 'يوسف', 'عمر', 'كريم', 'زياد', 'آدم', 'مازن', 'حمزة', 'علي', 'مريم', 'سلمى', 'نور', 'هنا', 'فرح', 'ملك', 'جنى', 'رقية', 'لينا', 'حبيبة'],
  LAST: ['محمد', 'أحمد', 'حسن', 'السيد', 'إبراهيم', 'محمود', 'خالد', 'عادل', 'طارق', 'سامي', 'فتحي', 'عبدالله'],
  seed() {
    let r = 7; const R = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    DB = Store.blank(); DB.ready = true; DB.teacher.pw = '1234';
    DB.groups = Store.starterGroups().map((g, i) => Object.assign(g, { id: 'G' + (i + 1), monthPrice: g.grade === 'تالتة إعدادي' ? 250 : 200 }));
    DB.groups[5].payMode = 'session'; DB.groups[5].price = 60; DB.groups[5].monthPrice = 0;
    DB.notif.wa = true;
    DB.assts = [{ user: 'A01', name: 'منة الله', phone: '01000000001', pw: '111111' }];
    DB.expenses = [
      { id: 1, title: 'إيجار سنتر الأسس', amt: 1500, type: 'month', scope: 'place:سنتر الأسس', from: '2000-01' },
      { id: 2, title: 'نسبة سنتر بيومي', amt: 20, type: 'student', scope: 'place:سنتر بيومي', from: '2000-01' },
      { id: 3, title: 'مرتب الأسيستنت', amt: 1200, type: 'month', scope: '', from: '2000-01' },
      { id: 4, title: 'طباعة مذكرات', amt: 350, type: 'once', scope: '', m: U.month() },
    ];
    Store.ix();
    const lvl = {};
    DB.groups.forEach(g => { for (let k = 0; k < 11; k++) { const girl = R() < .5, fn = Demo.NAMES[(girl ? 10 : 0) + Math.floor(R() * 10)]; const s = Store.addStudent({ name: fn + ' ' + Demo.LAST[Math.floor(R() * 12)] + ' ' + Demo.LAST[Math.floor(R() * 12)], gender: girl ? 'أنثى' : 'ذكر', g: g.id, parentPhone: '010' + String(10000000 + Math.floor(R() * 89999999)), same: R() < .6, phone: '011' + String(10000000 + Math.floor(R() * 89999999)) }); lvl[s.code] = .35 + R() * .62; } });
    DB.students[0].pin = '1234';
    const today = U.today(), m0 = U.month();
    DB.groups.forEach(g => {
      Store.members(g.id).forEach(s => { if (R() < .9) DB.subs.push({ id: Store.nid(), s: s.code, g: g.id, m: U.addMonths(m0, -1), amt: g.monthPrice, d: U.addDays(today, -25) }); if (g.payMode === 'month' && R() < .7) DB.subs.push({ id: Store.nid(), s: s.code, g: g.id, m: m0, amt: g.monthPrice, d: U.addDays(today, -Math.floor(R() * 5)) }); });
      for (let k = 28; k >= 1; k--) {
        const d = U.addDays(today, -k); if (!Store.meets(g, d)) continue;
        const q = Store.addAssess({ g: g.id, grade: g.grade, type: 'quiz', d, max: 10, title: 'كويز ' + U.short(d) + ' · ' + Store.gName(g) });
        Store.members(g.id).forEach(s => {
          const p = R() < .86, fee = g.payMode === 'month' ? 0 : g.price;
          DB.att.push({ id: Store.nid(), s: s.code, g: g.id, d, st: p ? 'p' : 'a', fee: p ? fee : 0, paid: p && R() < .9 ? fee : 0, mk: false, tm: p ? Store.slot(g, d).from : '' });
          if (p) DB.scores[q.id][s.code] = Math.max(1, Math.min(10, Math.round((lvl[s.code] + (R() - .5) * .25) * 10)));
        });
        DB.closed[g.id + '|' + d] = Store.slot(g, d).to;
      }
    });
    Store.ix();
    GRADES.forEach(gr => {
      const a = Store.addAssess({ type: 'exam', g: '', grade: gr, solo: true, max: 20, d: U.addDays(today, -6), title: 'امتحان الوحدة الأولى · ' + GRADE_SHORT[gr] }); DB.exAtt[a.id] = {}; a.closed = '19:30';
      Store.gradeMembers(gr).forEach(s => { if (R() < .88) { DB.exAtt[a.id][s.code] = 'p'; DB.scores[a.id][s.code] = Math.max(3, Math.min(20, Math.round((lvl[s.code] + (R() - .5) * .2) * 20))); } else DB.exAtt[a.id][s.code] = 'a'; });
    });
    DB.posts = [
      { id: 1, title: '', body: 'امتحان الوحدة التانية يوم الخميس الجاي إن شاء الله، ذاكروا كويس 💪', to: 'b', tgt: 'all', files: [], d: U.addDays(today, -1), tm: '20:15' },
      { id: 2, title: '', body: 'مراجعة الوحدة الأولى — Grammar + Vocabulary', to: 's', tgt: 'grade:تالتة إعدادي', files: [{ name: 'Unit-1-Revision.pdf', type: 'application/pdf', size: 245000, url: 'data:application/pdf;base64,JVBERi0xLjQK' }], d: U.addDays(today, -4), tm: '18:00' },
    ];
    DB.log = [{ id: 1, at: today + ' 12:10', by: 'A01', kind: 'student', text: 'طالب جديد: ' + DB.students[3].name, s: DB.students[3].code }, { id: 2, at: today + ' 12:05', by: 'A01', kind: 'att', text: 'تسجيل تالتة · سنتر الأسس · حضر 10' }];
    Store.cache();
  },
  // بيفتح الديمو بالدور والشاشة المطلوبين
  boot() {
    const m = location.hash.match(/^#demo-(teacher|assistant|student|parent)-([a-z_]+)(?:-(\w+))?$/);
    if (!Store.load()) Demo.seed();
    if (!m) return;
    const s0 = DB.students[0];
    App.setSes(m[1] === 'teacher' ? { role: 'teacher', id: 'teacher' } : m[1] === 'assistant' ? { role: 'assistant', id: 'A01' } : { role: m[1], id: s0.code });
    App.st = {};
    if (m[2] === 'att') { const g = Store.liveGroup() || Store.groups()[0]; App.st.ag = g.id; }
    if (m[2] === 'grades' && m[3] === 'exam') { history.replaceState(null, '', '#grades/' + DB.assess.find(a => a.solo).id); return; }
    if (m[2] === 'groups' && m[3]) { history.replaceState(null, '', '#groups/' + m[3]); return; }
    history.replaceState(null, '', '#' + m[2]);
  },
  reset() { localStorage.removeItem(DB_KEY); location.reload(); },
};
