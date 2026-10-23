/* =====================================================================
   إعدادات السيستم — ده الملف الوحيد اللي محتاج تعدّل فيه
   ===================================================================== */
window.OA_CONFIG = {
  /* رابط مشروع Supabase والمفتاح العام (publishable).
     فاضيين "" = السيستم شغال على الجهاز ده بس (من غير نت). */
  SUPABASE_URL: "https://wxsfaqhketlmcamfuojt.supabase.co",
  SUPABASE_KEY: "sb_publishable_8sCLyZAfkPxhGKqcT3XYTQ_5orcwtCL",
  /* كل كام ثانية السيستم يجيب آخر تحديث من الداتابيز */
  PULL_SECONDS: 45,
};
/* أنهي تطبيق: "staff" (المستر والأسيستنت) أو "family" (الطلاب وأولياء الأمور — family/index.html بيحددها قبل الملف ده).
   كل تطبيق بيفتكر الدخول بتاعه لوحده، والبيانات واحدة. */
window.OA_APP = window.OA_APP || 'staff';
window.OA_SFX = window.OA_APP === 'family' ? '_fam' : '';
