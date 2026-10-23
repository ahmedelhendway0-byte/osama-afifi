-- =====================================================================
-- سيستم مستر أسامة عفيفي — قاعدة بيانات Supabase
-- كل الجداول والدوال اسمها بيبدأ بـ oa_ عشان تعيش جنب سنتر هنداوي في نفس المشروع من غير ما تلمسه.
-- الصق الملف كله في Supabase ← SQL Editor ← Run (ينفع يتشغل أكتر من مرة).
-- الجداول مقفولة؛ الموقع بيكلم الدوال بس، وكل دالة بتشوف مين داخل وتديله اللي يخصه.
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

-- كل حاجة صف هنا: kind = نوعها، sid = الطالب صاحبها (لو ليها طالب)
create table if not exists public.oa_rows (
  kind text not null,
  id text not null,
  sid text,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);
create index if not exists oa_rows_sid on public.oa_rows (kind, sid);
-- الملفات والصور (بتتحمل لما حد يفتحها بس)
create table if not exists public.oa_files (id text primary key, name text, type text, size int, body text not null, created_at timestamptz not null default now());
create table if not exists public.oa_creds (kind text not null, key text not null, pw_hash text not null, primary key (kind, key));
create table if not exists public.oa_sessions (token text primary key, kind text not null, key text not null, created_at timestamptz not null default now());
create table if not exists public.oa_login_fail (k text primary key, n int not null default 0, at timestamptz not null default now());
create table if not exists public.oa_secrets (name text primary key, value text not null);

alter table public.oa_rows enable row level security;
alter table public.oa_files enable row level security;
alter table public.oa_creds enable row level security;
alter table public.oa_sessions enable row level security;
alter table public.oa_login_fail enable row level security;
alter table public.oa_secrets enable row level security;
revoke all on public.oa_rows, public.oa_files, public.oa_creds, public.oa_sessions, public.oa_login_fail, public.oa_secrets from anon, authenticated;

-- ---------------------------------------------------------------------
create or replace function public.oa_ses(p_token text) returns public.oa_sessions
language sql stable security definer set search_path = public as $$
  select * from public.oa_sessions where token = p_token and created_at > now() - interval '60 days';
$$;

create or replace function public.oa_new_session(p_kind text, p_key text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare v text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  insert into public.oa_sessions (token, kind, key) values (v, p_kind, p_key);
  return v;
end $$;

-- هل المستر عمل الإعداد أول مرة؟
create or replace function public.oa_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true, 'ready', exists (select 1 from public.oa_rows where kind = 'conf' and id = 'main'));
$$;

-- الإعداد أول مرة: مسموح مرة واحدة بس (لو مفيش بيانات خالص)
create or replace function public.oa_setup(p_pw text, p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare c jsonb;
begin
  if exists (select 1 from public.oa_rows where kind = 'conf') then return jsonb_build_object('ok', false, 'error', 'ready'); end if;
  if p_pw is null or length(p_pw) < 4 then return jsonb_build_object('ok', false, 'error', 'short'); end if;
  insert into public.oa_creds (kind, key, pw_hash) values ('teacher', 'teacher', extensions.crypt(p_pw, extensions.gen_salt('bf')))
    on conflict (kind, key) do update set pw_hash = excluded.pw_hash;
  for c in select * from jsonb_array_elements(p_rows) loop
    insert into public.oa_rows (kind, id, sid, data) values (c->>'k', c->>'i', nullif(c->>'s', ''), c->'d')
      on conflict (kind, id) do update set sid = excluded.sid, data = excluded.data, updated_at = now();
  end loop;
  return jsonb_build_object('ok', true, 'token', public.oa_new_session('teacher', 'teacher'), 'role', 'teacher', 'key', 'teacher');
end $$;

-- ---------------------------------------------------------------------
-- الدخول: teacher / assistant بالباسورد بس · student / parent بكود الطالب + الرقم السري
create or replace function public.oa_login(p_role text, p_user text, p_pw text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_key text; f public.oa_login_fail; fk text;
begin
  p_user := trim(coalesce(p_user, '')); p_pw := trim(coalesce(p_pw, ''));
  fk := p_role || ':' || lower(p_user);
  select * into f from public.oa_login_fail where k = fk;
  if found and f.n >= 6 and f.at > now() - interval '15 minutes' then return jsonb_build_object('ok', false, 'error', 'locked'); end if;
  if p_role = 'teacher' then
    select key into v_key from public.oa_creds where kind = 'teacher' and pw_hash = extensions.crypt(p_pw, pw_hash);
  elsif p_role = 'assistant' then
    select c.key into v_key from public.oa_creds c, public.oa_rows r, jsonb_array_elements(coalesce(r.data->'assts', '[]'::jsonb)) x
      where c.kind = 'assistant' and c.pw_hash = extensions.crypt(p_pw, c.pw_hash) and r.kind = 'conf' and r.id = 'main' and lower(x->>'user') = c.key limit 1;
  elsif p_role in ('student', 'parent') then
    select id into v_key from public.oa_rows where kind = 'student' and id = p_user and coalesce(data->>'st', 'on') <> 'out' and data->>'pin' = p_pw;
  end if;
  if v_key is null then
    insert into public.oa_login_fail (k, n, at) values (fk, 1, now())
      on conflict (k) do update set n = case when public.oa_login_fail.at < now() - interval '15 minutes' then 1 else public.oa_login_fail.n + 1 end, at = now();
    return jsonb_build_object('ok', false);
  end if;
  delete from public.oa_login_fail where k = fk;
  return jsonb_build_object('ok', true, 'token', public.oa_new_session(p_role, v_key), 'role', p_role, 'key', v_key);
end $$;

create or replace function public.oa_logout(p_token text) returns jsonb
language sql security definer set search_path = public as $$
  delete from public.oa_sessions where token = p_token returning jsonb_build_object('ok', true);
$$;

-- ---------------------------------------------------------------------
-- تحميل البيانات: المستر والأسيستنت كله، الطالب وولي الأمر اللي يخصهم بس
create or replace function public.oa_pull(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.oa_sessions; st jsonb; g jsonb;
begin
  s := public.oa_ses(p_token);
  if s.token is null then return jsonb_build_object('ok', false, 'auth', true); end if;
  if s.kind in ('teacher', 'assistant') then
    if s.kind = 'assistant' and not exists (select 1 from public.oa_rows r, jsonb_array_elements(coalesce(r.data->'assts', '[]'::jsonb)) x where r.kind = 'conf' and lower(x->>'user') = s.key) then
      return jsonb_build_object('ok', false, 'auth', true);
    end if;
    return jsonb_build_object('ok', true, 'at', now(), 'rows', (select coalesce(jsonb_agg(jsonb_build_array(kind, id, sid, data)), '[]'::jsonb) from public.oa_rows));
  end if;
  select data into st from public.oa_rows where kind = 'student' and id = s.key;
  if st is null or coalesce(st->>'st', 'on') = 'out' then return jsonb_build_object('ok', false, 'auth', true); end if;
  select data into g from public.oa_rows where kind = 'group' and id = st->>'g';
  return jsonb_build_object('ok', true, 'at', now(), 'rows', (select coalesce(jsonb_agg(jsonb_build_array(r.kind, r.id, r.sid, r.data)), '[]'::jsonb) from public.oa_rows r
    where (r.kind = 'conf' and r.id = 'main')
       or r.kind in ('group', 'closed')
       or (r.kind = 'student' and r.id = s.key)
       or (r.kind in ('att', 'score', 'exatt') and r.sid = s.key)
       or (r.kind in ('sub', 'pay') and r.sid = s.key and s.kind = 'parent')
       or (r.kind = 'assess' and coalesce((r.data->>'pub')::boolean, true))
       or (r.kind = 'post' and (r.data->>'to' = 'b' or r.data->>'to' = case when s.kind = 'parent' then 'p' else 's' end)
           and (r.data->>'tgt' = 'all' or r.data->>'tgt' = 'st:' || s.key or r.data->>'tgt' = 'group:' || (st->>'g') or r.data->>'tgt' = 'grade:' || coalesce(g->>'grade', '')))));
end $$;

-- ---------------------------------------------------------------------
-- حفظ التعديلات: [{k,i,s,d,del}] — المستر أي حاجة، الأسيستنت الشغل اليومي بس
create or replace function public.oa_push(p_token text, p_changes jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.oa_sessions; c jsonb; k text; n int := 0; skipped int := 0;
begin
  s := public.oa_ses(p_token);
  if s.token is null then return jsonb_build_object('ok', false, 'auth', true); end if;
  if s.kind not in ('teacher', 'assistant') then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  for c in select * from jsonb_array_elements(p_changes) loop
    k := c->>'k';
    if s.kind = 'assistant' and k not in ('student', 'att', 'sub', 'pay', 'assess', 'score', 'exatt', 'closed', 'sopt', 'post', 'log') then
      skipped := skipped + 1; continue;
    end if;
    if (c->>'del') = 'true' then
      delete from public.oa_rows where kind = k and id = c->>'i';
      if k = 'post' then delete from public.oa_files where id in (select jsonb_array_elements_text(coalesce(c->'f', '[]'::jsonb))); end if;
    else
      insert into public.oa_rows (kind, id, sid, data, updated_at) values (k, c->>'i', nullif(c->>'s', ''), c->'d', now())
        on conflict (kind, id) do update set sid = excluded.sid, data = excluded.data, updated_at = now();
    end if;
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'n', n, 'skipped', skipped);
end $$;

-- ---------------------------------------------------------------------
-- الباسوردات: المستر لنفسه وللأسيستنتس · الطالب/ولي الأمر يغيّر الرقم السري بتاعه
create or replace function public.oa_set_pw(p_token text, p_kind text, p_key text, p_pw text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s public.oa_sessions;
begin
  s := public.oa_ses(p_token);
  if s.token is null then return jsonb_build_object('ok', false, 'auth', true); end if;
  p_pw := trim(coalesce(p_pw, '')); p_key := lower(p_key);
  if length(p_pw) < 4 then return jsonb_build_object('ok', false, 'error', 'short'); end if;
  if p_kind in ('student', 'parent') then
    if not (s.kind in ('teacher', 'assistant') or (s.kind in ('student', 'parent') and s.key = p_key)) then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
    update public.oa_rows set data = jsonb_set(data, '{pin}', to_jsonb(p_pw)), updated_at = now() where kind = 'student' and id = p_key;
    delete from public.oa_sessions where kind in ('student', 'parent') and key = p_key and token <> p_token;
    return jsonb_build_object('ok', true);
  end if;
  if s.kind <> 'teacher' or p_kind not in ('teacher', 'assistant') then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  if p_kind = 'teacher' then p_key := 'teacher'; end if;
  if exists (select 1 from public.oa_creds where kind in ('teacher', 'assistant') and not (kind = p_kind and key = p_key) and pw_hash = extensions.crypt(p_pw, pw_hash)) then
    return jsonb_build_object('ok', false, 'error', 'taken');
  end if;
  insert into public.oa_creds (kind, key, pw_hash) values (p_kind, p_key, extensions.crypt(p_pw, extensions.gen_salt('bf')))
    on conflict (kind, key) do update set pw_hash = excluded.pw_hash;
  delete from public.oa_sessions where kind = p_kind and key = p_key and token <> p_token;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------
-- الملفات: المستر/الأسيستنت يرفعوا، واللي داخل يقرا (لو الرسالة متبعتاله)
create or replace function public.oa_put_file(p_token text, p_name text, p_type text, p_body text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s public.oa_sessions; v text := encode(extensions.gen_random_bytes(12), 'hex');
begin
  s := public.oa_ses(p_token);
  if s.token is null or s.kind not in ('teacher', 'assistant') then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  if length(p_body) > 14000000 then return jsonb_build_object('ok', false, 'error', 'big'); end if;
  insert into public.oa_files (id, name, type, size, body) values (v, p_name, p_type, length(p_body) * 3 / 4, p_body);
  return jsonb_build_object('ok', true, 'id', v);
end $$;

create or replace function public.oa_get_file(p_token text, p_id text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.oa_sessions; f public.oa_files;
begin
  s := public.oa_ses(p_token);
  if s.token is null then return jsonb_build_object('ok', false, 'auth', true); end if;
  select * into f from public.oa_files where id = p_id;
  if f.id is null then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'name', f.name, 'type', f.type, 'body', f.body);
end $$;

-- ---------------------------------------------------------------------
-- شيت جوجل: المستر بيطلّع مفتاح من الإعدادات ويحطه في الشيت، والشيت بيقرا بيه البيانات
create or replace function public.oa_sheet_key(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s public.oa_sessions; v text;
begin
  s := public.oa_ses(p_token);
  if s.token is null or s.kind <> 'teacher' then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  select value into v from public.oa_secrets where name = 'sheets';
  if v is null then v := encode(extensions.gen_random_bytes(24), 'hex'); insert into public.oa_secrets (name, value) values ('sheets', v); end if;
  return jsonb_build_object('ok', true, 'key', v);
end $$;

create or replace function public.oa_export(p_key text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if p_key is null or not exists (select 1 from public.oa_secrets where name = 'sheets' and value = p_key) then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  return jsonb_build_object('ok', true, 'at', now(), 'rows', (select coalesce(jsonb_agg(jsonb_build_array(kind, id, sid, data)), '[]'::jsonb) from public.oa_rows where kind <> 'log'));
end $$;

-- الموقع يكلم الدوال دي بس
revoke execute on function public.oa_ses(text), public.oa_new_session(text, text) from public, anon, authenticated;
revoke execute on function public.oa_status(), public.oa_setup(text, jsonb), public.oa_login(text, text, text), public.oa_logout(text), public.oa_pull(text),
  public.oa_push(text, jsonb), public.oa_set_pw(text, text, text, text), public.oa_put_file(text, text, text, text), public.oa_get_file(text, text),
  public.oa_sheet_key(text), public.oa_export(text) from public;
grant execute on function public.oa_status(), public.oa_setup(text, jsonb), public.oa_login(text, text, text), public.oa_logout(text), public.oa_pull(text),
  public.oa_push(text, jsonb), public.oa_set_pw(text, text, text, text), public.oa_put_file(text, text, text, text), public.oa_get_file(text, text),
  public.oa_sheet_key(text), public.oa_export(text) to anon;
