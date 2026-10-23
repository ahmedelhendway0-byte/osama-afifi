/* =====================================================================
   سيستم مستر أسامة عفيفي — نسخة لايف على Google Sheets (للعرض والمتابعة)
   الشيت بيقرا البيانات من Supabase كل 10 دقايق ويكتبها في تابات:
   «ملخص» · «الطلاب» · «الامتحانات» · «الحسابات» · وتاب لكل مجموعة (حضور حصة بحصة + الدرجات + الدفع)
   التعديل بيبقى من السيستم بس؛ أي تعديل هنا بيتمسح مع التحديث الجاي.

   التشغيل أول مرة:
   1) Extensions ← Apps Script ← امسح الكود اللي هناك والصق الملف ده ← Save
   2) شغّل الدالة setup (هيطلب إذن مرة واحدة ← Allow)
   3) في تاب «الإعدادات» الصق مفتاح الشيت في الخانة B2
      (المفتاح بيطلع من السيستم: المستر ← الإعدادات ← البيانات ← «مفتاح شيت جوجل»)
   4) شغّل الدالة refresh مرة، وبعد كده بيتحدّث لوحده
   ===================================================================== */
var SUPABASE_URL = "https://wxsfaqhketlmcamfuojt.supabase.co";
var SUPABASE_KEY = "sb_publishable_8sCLyZAfkPxhGKqcT3XYTQ_5orcwtCL";
var SETTINGS = "الإعدادات";
var AUB = "#3A0F34", GOLD = "#EAAA00", SILVER = "#DDE3E8";
var GRADES = ["أولى إعدادي", "تانية إعدادي", "تالتة إعدادي"];
var SHORT = { "أولى إعدادي": "أولى", "تانية إعدادي": "تانية", "تالتة إعدادي": "تالتة" };
var MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function setup() {
  var ss = SpreadsheetApp.getActive();
  if (/Untitled|بدون عنوان|جدول بيانات/.test(ss.getName())) ss.rename("مستر أسامة عفيفي - سجلات (لايف)");
  var st = ss.getSheetByName(SETTINGS) || ss.insertSheet(SETTINGS);
  st.setRightToLeft(true);
  st.getRange("A1:B4").setValues([["الإعداد", "القيمة"], ["مفتاح الشيت", st.getRange("B2").getValue() || ""], ["آخر تحديث", ""], ["الحالة", "حط المفتاح في B2 وشغّل refresh"]]);
  st.getRange("A1:B1").setFontWeight("bold").setBackground(AUB).setFontColor("#ffffff");
  st.setColumnWidth(1, 140); st.setColumnWidth(2, 460);
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "refresh") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("refresh").timeBased().everyMinutes(10).create();
  ss.toast("تمام ✅ حط مفتاح الشيت في B2 وشغّل refresh");
}

function refresh() {
  var ss = SpreadsheetApp.getActive(), st = ss.getSheetByName(SETTINGS);
  var key = st ? String(st.getRange("B2").getValue()).trim() : "";
  if (!key) { if (st) st.getRange("B4").setValue("ناقص مفتاح الشيت في B2"); return; }
  var res = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/rpc/oa_export", {
    method: "post", contentType: "application/json", muteHttpExceptions: true,
    headers: /^eyJ/.test(SUPABASE_KEY) ? { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY } : { apikey: SUPABASE_KEY },
    payload: JSON.stringify({ p_key: key })
  });
  var j = JSON.parse(res.getContentText() || "{}");
  if (!j.ok) { st.getRange("B4").setValue("المفتاح غلط أو السيرفر مش متاح (" + res.getResponseCode() + ")"); return; }
  var D = build(j.rows);
  writeSummary(ss, D); writeStudents(ss, D); writeExams(ss, D); writeMoney(ss, D);
  D.groups.forEach(function (g) { writeGroup(ss, D, g); });
  st.getRange("B3").setValue(new Date());
  st.getRange("B4").setValue("تمام · " + D.active.length + " طالب · " + D.groups.length + " مجموعة");
}

// ----------------------------------------------------------------- البيانات
function build(rows) {
  var D = { conf: {}, groups: [], students: [], att: [], subs: [], pays: [], assess: [], scores: {}, exatt: {}, expenses: [], G: {}, S: {}, A: {} };
  rows.forEach(function (r) {
    var k = r[0], x = r[3];
    if (k === "conf") D.conf = x;
    else if (k === "group") { D.groups.push(x); D.G[x.id] = x; }
    else if (k === "student") { D.students.push(x); D.S[x.code] = x; }
    else if (k === "att") D.att.push(x);
    else if (k === "sub") D.subs.push(x);
    else if (k === "pay") D.pays.push(x);
    else if (k === "assess") { D.assess.push(x); D.A[x.id] = x; }
    else if (k === "score") (D.scores[x.a] = D.scores[x.a] || {})[x.s] = x.v;
    else if (k === "exatt") (D.exatt[x.a] = D.exatt[x.a] || {})[x.s] = x.v;
    else if (k === "expense") D.expenses.push(x);
  });
  D.groups = D.groups.filter(function (g) { return g.active !== false; })
    .sort(function (a, b) { return GRADES.indexOf(a.grade) - GRADES.indexOf(b.grade) || String(a.place).localeCompare(String(b.place)); });
  D.active = D.students.filter(function (s) { return s.st !== "out"; });
  return D;
}
function ymd(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd"); }
function month() { return ymd(new Date()).slice(0, 7); }
function mName(m) { return MONTHS[+m.slice(5) - 1] + " " + m.slice(0, 4); }
function addMonths(m, n) { var d = new Date(+m.slice(0, 4), +m.slice(5) - 1 + n, 1); return ymd(d).slice(0, 7); }
function gName(g) { return g ? (g.name || (SHORT[g.grade] || g.grade) + " · " + g.place) : "—"; }
function sheet(ss, name) { var sh = ss.getSheetByName(name) || ss.insertSheet(name); sh.clear(); sh.clearConditionalFormatRules(); sh.setRightToLeft(true); return sh; }
function header(sh, cols, row) {
  sh.getRange(row || 1, 1, 1, cols.length).setValues([cols]).setFontWeight("bold").setBackground(AUB).setFontColor("#ffffff");
  sh.setFrozenRows(row || 1);
}
function put(sh, rows, from) { if (rows.length) sh.getRange(from || 2, 1, rows.length, rows[0].length).setValues(rows); }
function attOf(D, code) { return D.att.filter(function (a) { return a.s === code; }); }
function rate(list) { return list.length ? Math.round(list.filter(function (a) { return a.st === "p"; }).length / list.length * 100) + "%" : "—"; }
function avg(D, code) {
  var v = []; D.assess.forEach(function (a) { var x = (D.scores[a.id] || {})[code]; if (x !== undefined && x !== "") v.push(x / a.max * 100); });
  return v.length ? Math.round(v.reduce(function (p, c) { return p + c; }, 0) / v.length) + "%" : "—";
}
function paid(D, code, m) { return D.subs.some(function (x) { return x.s === code && x.m === m; }); }
function debt(D, code) {
  var s = D.S[code], d = +(s && s.debt0) || 0;
  D.att.forEach(function (a) { if (a.s === code) d += (a.fee || 0) - (a.paid || 0); });
  D.pays.forEach(function (p) { if (p.s === code) d -= p.amt; });
  return Math.max(0, d);
}
function inM(d, m) { return String(d).slice(0, 7) === m; }
function revenue(D, m, gid) {
  var v = 0;
  D.att.forEach(function (a) { if ((!gid || a.g === gid) && inM(a.d, m)) v += a.paid || 0; });
  D.subs.forEach(function (x) { if ((!gid || x.g === gid) && inM(x.d, m)) v += x.amt || 0; });
  if (!gid) D.pays.forEach(function (p) { if (!p.waive && inM(p.d, m)) v += p.amt || 0; });
  return v;
}
function scopeGroups(D, scope) {
  if (!scope) return null; var k = scope.split(":")[0], v = scope.slice(k.length + 1), out = {};
  D.groups.forEach(function (g) { if ((k === "place" && g.place === v) || (k === "grade" && g.grade === v) || (k === "group" && g.id === v)) out[g.id] = 1; });
  return out;
}
function expCalc(D, e, m) {
  if ((e.from && e.from > m) || (e.to && e.to < m)) return 0;
  var gs = scopeGroups(D, e.scope), amt = +e.amt || 0;
  if (e.type === "month") return amt;
  if (e.type === "once") return e.m === m ? amt : 0;
  if (e.type === "student") return amt * D.active.filter(function (s) { return !gs || gs[s.g]; }).length;
  if (e.type === "attend") return amt * D.att.filter(function (a) { return a.st === "p" && inM(a.d, m) && (!gs || gs[a.g]); }).length;
  return 0;
}
function expenses(D, m) { return D.expenses.reduce(function (p, e) { return p + expCalc(D, e, m); }, 0); }

// ----------------------------------------------------------------- التابات
function writeSummary(ss, D) {
  var sh = sheet(ss, "ملخص"), m = month(), rev = revenue(D, m), exp = expenses(D, m);
  var t = (D.conf.teacher || {}).name || "أسامة عفيفي";
  sh.getRange("A1").setValue("مستر " + t + " · " + mName(m) + " · آخر تحديث " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm")).setFontWeight("bold").setFontSize(13).setFontColor(AUB);
  sh.getRange(2, 1, 2, 5).setValues([["الطلاب", "المجموعات", "الإيراد (ج)", "المصاريف (ج)", "الصافي (ج)"], [D.active.length, D.groups.length, rev, exp, rev - exp]]);
  sh.getRange(2, 1, 1, 5).setFontWeight("bold").setBackground(GOLD).setFontColor(AUB);
  sh.getRange(3, 1, 1, 5).setFontWeight("bold").setFontSize(14);
  header(sh, ["المجموعة", "المكان", "المواعيد", "الطلاب", "حصص الشهر", "نسبة الحضور", "دفعوا الشهر", "إيراد الشهر (ج)"], 5);
  sh.setFrozenRows(0);
  put(sh, D.groups.map(function (g) {
    var mem = D.active.filter(function (s) { return s.g === g.id; }), att = D.att.filter(function (a) { return a.g === g.id && inM(a.d, m); }), days = {};
    att.forEach(function (a) { days[a.d] = 1; });
    return [gName(g), g.place, (g.slots || []).map(function (s) { return s.day + " " + s.from; }).join(" · "), mem.length, Object.keys(days).length, rate(att),
      g.payMode === "month" ? mem.filter(function (s) { return paid(D, s.code, m); }).length + " / " + mem.length : "بالحصة", revenue(D, m, g.id)];
  }), 6);
  sh.autoResizeColumns(1, 8);
}

function writeStudents(ss, D) {
  var sh = sheet(ss, "الطلاب"), m = month();
  header(sh, ["الكود", "الطالب", "المجموعة", "تليفون ولي الأمر", "تليفون الطالب", "حضر", "غاب", "نسبة الحضور", "متوسط الدرجات", "دفع " + MONTHS[+m.slice(5) - 1], "آجل (ج)", "الحالة"]);
  put(sh, D.students.slice().sort(function (a, b) { return a.code - b.code; }).map(function (s) {
    var a = attOf(D, s.code), g = D.G[s.g];
    return [s.code, s.name, gName(g), "'" + (s.parentPhone || ""), "'" + (s.same ? "نفس ولي الأمر" : (s.phone || "")), a.filter(function (x) { return x.st === "p"; }).length, a.filter(function (x) { return x.st === "a"; }).length,
      rate(a), avg(D, s.code), g && g.payMode === "month" ? (paid(D, s.code, m) ? "مدفوع" : "مش مدفوع") : "بالحصة", debt(D, s.code), s.st === "out" ? "منسحب" : "نشط"];
  }));
  var n = D.students.length;
  if (n) sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("مش مدفوع").setBackground("#fdf0c7").setFontColor(AUB).setRanges([sh.getRange(2, 10, n, 1)]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("منسحب").setFontColor("#9a8a97").setRanges([sh.getRange(2, 12, n, 1)]).build()]);
  sh.autoResizeColumns(1, 12);
}

function writeExams(ss, D) {
  var sh = sheet(ss, "الامتحانات");
  header(sh, ["التاريخ", "الامتحان", "النوع", "لمين", "من كام", "عدد الدرجات", "المتوسط", "أعلى درجة", "غابوا"]);
  put(sh, D.assess.slice().sort(function (a, b) { return b.d.localeCompare(a.d); }).map(function (a) {
    var v = Object.keys(D.scores[a.id] || {}).map(function (k) { return D.scores[a.id][k]; }), ab = Object.keys(D.exatt[a.id] || {}).filter(function (k) { return D.exatt[a.id][k] === "a"; }).length;
    return [a.d, a.title, { quiz: "كويز", exam: "امتحان", hw: "واجب" }[a.type] || "تقييم", a.g ? gName(D.G[a.g]) : a.grade, a.max, v.length,
      v.length ? Math.round(v.reduce(function (p, c) { return p + c; }, 0) / v.length / a.max * 100) + "%" : "—", v.length ? Math.max.apply(null, v) : "—", a.solo ? ab : "—"];
  }));
  sh.autoResizeColumns(1, 9);
}

function writeMoney(ss, D) {
  var sh = sheet(ss, "الحسابات"), m = month();
  header(sh, ["الشهر", "الإيراد (ج)", "المصاريف (ج)", "الصافي (ج)"]);
  var rows = []; for (var i = 5; i >= 0; i--) { var x = addMonths(m, -i), r = revenue(D, x), e = expenses(D, x); rows.push([mName(x), r, e, r - e]); }
  put(sh, rows);
  sh.getRange(9, 1, 1, 4).setValues([["مصاريف " + mName(m), "بيتحسب إزاي", "على مين", "القيمة (ج)"]]).setFontWeight("bold").setBackground(GOLD).setFontColor(AUB);
  var T = { month: "ثابت كل شهر", student: "على كل طالب (شهري)", attend: "على كل طالب في الحصة", once: "مرة واحدة" };
  var ex = D.expenses.map(function (e) { return [e.title, T[e.type] || e.type, e.scope ? e.scope.split(":").slice(1).join(":") : "كل المجموعات", expCalc(D, e, m)]; }).filter(function (r) { return r[3] > 0; });
  put(sh, ex, 10);
  if (ex.length) sh.getRange(10 + ex.length, 1, 1, 4).setValues([["الإجمالي", "", "", expenses(D, m)]]).setFontWeight("bold");
  sh.autoResizeColumns(1, 4);
}

// تاب المجموعة: الصفوف = الطلاب، الأعمدة = الحصص (ح / غ) + الحضور + المتوسط + الدفع
function writeGroup(ss, D, g) {
  var sh = sheet(ss, gName(g).slice(0, 90)), m = month();
  var mem = D.active.filter(function (s) { return s.g === g.id; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  var att = D.att.filter(function (a) { return a.g === g.id; }), all = {};
  att.forEach(function (a) { all[a.d] = 1; });
  var days = Object.keys(all).sort(), shown = days.slice(-16), by = {};
  att.forEach(function (a) { by[a.s + "|" + a.d] = a; });
  header(sh, ["الكود", "الطالب"].concat(shown.map(function (d) { return "ح" + (days.indexOf(d) + 1) + " " + d.slice(8) + "/" + d.slice(5, 7); }))
    .concat(["نسبة الحضور", "متوسط الدرجات", g.payMode === "month" ? "دفع " + MONTHS[+m.slice(5) - 1] : "آجل (ج)"]));
  var rows = mem.map(function (s) {
    var a = attOf(D, s.code);
    return [s.code, s.name].concat(shown.map(function (d) { var x = by[s.code + "|" + d]; return x ? (x.st === "p" ? "ح" : "غ") : ""; }))
      .concat([rate(a), avg(D, s.code), g.payMode === "month" ? (paid(D, s.code, m) ? "مدفوع" : "مش مدفوع") : debt(D, s.code)]);
  });
  put(sh, rows);
  if (rows.length && shown.length) {
    var rg = sh.getRange(2, 3, rows.length, shown.length);
    sh.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("غ").setBackground("#fdf0c7").setFontColor(AUB).setRanges([rg]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("ح").setFontColor(AUB).setBold(true).setRanges([rg]).build()]);
    sh.setColumnWidths(3, shown.length, 58);
  }
  sh.setFrozenColumns(2); sh.autoResizeColumn(2);
}
