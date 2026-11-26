begin;
create table public.crism_profiles (
 user_id uuid primary key references auth.users(id),email text not null unique,display_name text not null check(length(display_name) between 2 and 120),
 country text not null default '',language text not null default 'en' check(language in('en','yo','ig','ha','fr')),timezone text not null default 'Africa/Lagos',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.crism_roles (
 user_id uuid not null references auth.users(id),role text not null check(role in('super_admin','registrar','admissions','lecturer')),
 granted_by uuid not null references auth.users(id),created_at timestamptz not null default now(),primary key(user_id,role)
);
create table public.crism_programmes (
 id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 3 and 160),level text not null check(level in('Certificate','Diploma')),
 description text not null,requirements text not null,duration_weeks integer not null check(duration_weeks between 1 and 156),
 fee_minor bigint not null default 2000000 check(fee_minor between 1 and 1000000000),currency text not null default 'NGN' check(currency='NGN'),
 status text not null default 'draft' check(status in('draft','published','archived')),policy_acknowledged boolean not null default false,
 revision integer not null default 1,updated_by uuid not null references auth.users(id),updated_at timestamptz not null default now(),
 check(status<>'published' or policy_acknowledged)
);
create table public.crism_intakes (
 id uuid primary key default gen_random_uuid(),programme_id uuid not null references public.crism_programmes(id),name text not null,
 opens_at timestamptz not null,closes_at timestamptz,starts_on date,capacity integer not null check(capacity between 1 and 1000),
 status text not null default 'draft' check(status in('draft','open','closed')),revision integer not null default 1,updated_by uuid not null references auth.users(id),
 check(opens_at<closes_at),check(closes_at::date<=starts_on)
);
create table public.crism_courses (
 id uuid primary key default gen_random_uuid(),programme_id uuid not null references public.crism_programmes(id),code text not null,title text not null,description text not null,
 position integer not null check(position between 1 and 100),status text not null default 'draft' check(status in('draft','published','archived')),
 lecturer_id uuid references auth.users(id),revision integer not null default 1,updated_by uuid not null references auth.users(id),
 unique(programme_id,code),unique(programme_id,position)
);
create table public.crism_lessons (
 id uuid primary key default gen_random_uuid(),course_id uuid not null references public.crism_courses(id),title text not null,body text not null,
 scripture text not null,position integer not null check(position between 1 and 200),status text not null default 'draft' check(status in('draft','published','archived')),
 revision integer not null default 1,updated_by uuid not null references auth.users(id),unique(course_id,position)
);
create table public.crism_classes (
 id uuid primary key default gen_random_uuid(),course_id uuid not null references public.crism_courses(id),title text not null,starts_at timestamptz not null,ends_at timestamptz not null,
 meeting_url text not null check(meeting_url like 'https://www.christreformationhouse.org.ng/meetings/%'),
 status text not null default 'draft' check(status in('draft','published','cancelled')),revision integer not null default 1,updated_by uuid not null references auth.users(id),check(starts_at<ends_at)
);
create table public.crism_resources (
 id uuid primary key default gen_random_uuid(),title text not null,author text not null,description text not null,url text not null,rights_note text not null,
 status text not null default 'draft' check(status in('draft','published','archived')),rights_acknowledged boolean not null default false,
 revision integer not null default 1,updated_by uuid not null references auth.users(id),check(status<>'published' or rights_acknowledged)
);
create index crism_classes_course_idx on public.crism_classes(course_id);
create table public.crism_applications (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),intake_id uuid not null references public.crism_intakes(id),
 statement text not null check(length(statement) between 50 and 8000),qualifications text not null check(length(qualifications) between 2 and 4000),
 consent_at timestamptz not null,status text not null default 'payment_pending' check(status in('payment_pending','submitted','under_review','offered','rejected','accepted','withdrawn')),
 decision_reason text,reviewed_by uuid references auth.users(id),reviewed_at timestamptz,revision integer not null default 1,created_at timestamptz not null default now(),
 unique(user_id,intake_id)
);
create table public.crism_enrollments (
 id uuid primary key default gen_random_uuid(),application_id uuid not null unique references public.crism_applications(id),user_id uuid not null references auth.users(id),
 programme_id uuid not null references public.crism_programmes(id),intake_id uuid not null references public.crism_intakes(id),
 status text not null default 'active' check(status in('active','completed','withdrawn')),programme_snapshot jsonb not null,
 created_at timestamptz not null default now(),unique(user_id,intake_id)
);
create table public.crism_progress (
 enrollment_id uuid not null references public.crism_enrollments(id),lesson_id uuid not null references public.crism_lessons(id),completed_at timestamptz not null default now(),
 primary key(enrollment_id,lesson_id)
);
create table public.crism_assignments (
 id uuid primary key default gen_random_uuid(),course_id uuid not null references public.crism_courses(id),title text not null,instructions text not null,
 deadline timestamptz,status text not null default 'draft' check(status in('draft','published','closed')),revision integer not null default 1,updated_by uuid not null references auth.users(id),check(status<>'published' or deadline is not null)
);
create table public.crism_submissions (
 id uuid primary key default gen_random_uuid(),assignment_id uuid not null references public.crism_assignments(id),enrollment_id uuid not null references public.crism_enrollments(id),
 body text not null check(length(body) between 50 and 24000),submitted_at timestamptz not null default now(),score integer check(score between 0 and 100),
 feedback text,graded_by uuid references auth.users(id),released_at timestamptz,revision integer not null default 1,unique(assignment_id,enrollment_id)
);
create table public.crism_exams (
 id uuid primary key default gen_random_uuid(),course_id uuid not null references public.crism_courses(id),title text not null,
 questions jsonb not null check(jsonb_typeof(questions)='array' and jsonb_array_length(questions) between 3 and 60),
 duration_minutes integer not null check(duration_minutes between 5 and 180),pass_score integer not null check(pass_score between 1 and 100),
 opens_at timestamptz,closes_at timestamptz,status text not null default 'draft' check(status in('draft','published','closed')),
 revision integer not null default 1,updated_by uuid not null references auth.users(id),check(opens_at<closes_at),check(status<>'published' or (opens_at is not null and closes_at is not null))
);
create table public.crism_attempts (
 id uuid primary key default gen_random_uuid(),exam_id uuid not null references public.crism_exams(id),enrollment_id uuid not null references public.crism_enrollments(id),
 questions_snapshot jsonb not null,answers jsonb not null default '[]',started_at timestamptz not null default now(),deadline timestamptz not null,
 status text not null default 'started' check(status in('started','submitted','expired')),submitted_at timestamptz,score integer check(score between 0 and 100),
 released_at timestamptz,revision integer not null default 1,unique(exam_id,enrollment_id)
);
create table public.crism_results (
 enrollment_id uuid not null references public.crism_enrollments(id),course_id uuid not null references public.crism_courses(id),
 score integer not null check(score between 0 and 100),feedback text not null,approved_by uuid not null references auth.users(id),released_at timestamptz not null default now(),
 revision integer not null default 1,primary key(enrollment_id,course_id)
);
create table public.crism_awards (
 id uuid primary key default gen_random_uuid(),enrollment_id uuid not null unique references public.crism_enrollments(id),
 verification_token uuid not null unique default gen_random_uuid(),serial bigint generated always as identity unique,
 status text not null default 'issued' check(status in('issued','revoked')),snapshot jsonb not null,issued_by uuid not null references auth.users(id),
 issued_at timestamptz not null default now(),revoked_by uuid references auth.users(id),revocation_reason text,revoked_at timestamptz
);
create table public.crism_invoices (
 id uuid primary key default gen_random_uuid(),application_id uuid not null references public.crism_applications(id),user_id uuid not null references auth.users(id),
 purpose text not null check(purpose in('application','tuition_certification')),base_ngn_minor bigint not null check(base_ngn_minor>0),
 currency text not null default 'NGN' check(currency in('NGN','USD','GBP','EUR','GHS','ZAR','KES')),amount_minor bigint not null check(amount_minor>0),
 fx_rate numeric not null default 1,fx_as_of timestamptz,tx_ref text not null unique,charge_id text unique,customer_id text,transfer jsonb,
 payment_method text,status text not null default 'draft' check(status in('draft','initializing','pending','paid','failed','needs_review')),
 paid_at timestamptz,created_at timestamptz not null default now(),unique(application_id,purpose)
);
create index crism_invoices_user_idx on public.crism_invoices(user_id);
create index crism_invoices_status_idx on public.crism_invoices(status);
create table public.crism_audit (
 id bigint generated always as identity primary key,actor uuid references auth.users(id),action text not null,resource text not null,record_id text,
 created_at timestamptz not null default now()
);
-- All academic data stays server-only. Public projections and owned records pass through verified Express routes.
do $$declare t text;begin foreach t in array array['crism_profiles','crism_roles','crism_programmes','crism_intakes','crism_courses','crism_lessons','crism_classes','crism_resources','crism_applications','crism_enrollments','crism_progress','crism_assignments','crism_submissions','crism_exams','crism_attempts','crism_results','crism_awards','crism_invoices','crism_audit'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select,insert,update on public.%I to service_role',t);
 end loop;end $$;
revoke update on public.crism_audit from service_role;
grant usage,select on sequence public.crism_awards_serial_seq,public.crism_audit_id_seq to service_role;
create index crism_intakes_programme_idx on public.crism_intakes(programme_id);
create index crism_courses_lecturer_idx on public.crism_courses(lecturer_id);
create index crism_lessons_course_idx on public.crism_lessons(course_id);
create index crism_applications_intake_idx on public.crism_applications(intake_id,status);
create index crism_enrollments_user_idx on public.crism_enrollments(user_id,status);
create index crism_enrollments_programme_idx on public.crism_enrollments(programme_id,intake_id);
create index crism_progress_lesson_idx on public.crism_progress(lesson_id);
create index crism_assignments_course_idx on public.crism_assignments(course_id);
create index crism_submissions_enrollment_idx on public.crism_submissions(enrollment_id);
create index crism_exams_course_idx on public.crism_exams(course_id);
create index crism_attempts_enrollment_idx on public.crism_attempts(enrollment_id);
create index crism_results_course_idx on public.crism_results(course_id);
create index crism_roles_granted_idx on public.crism_roles(granted_by);
create index crism_audit_created_idx on public.crism_audit(created_at desc);
-- Multi-record admission, timed examinations and award eligibility are transactional.
create function public.crism_action(p_actor uuid,p_action text,p_id uuid,p_data jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare app public.crism_applications; intake public.crism_intakes; prog public.crism_programmes; enrol public.crism_enrollments;
 ex public.crism_exams; attempt public.crism_attempts; course public.crism_courses; aw public.crism_awards;
 staff boolean; registrar boolean; admission boolean; n integer; v_score integer; out_id uuid; a jsonb; q jsonb; i integer;
begin
 if not exists(select 1 from public.crism_profiles where user_id=p_actor) then raise exception 'Confirmed identity required';end if;
 select exists(select 1 from public.crism_roles where user_id=p_actor and role='super_admin'),exists(select 1 from public.crism_roles where user_id=p_actor and role in('super_admin','registrar')),exists(select 1 from public.crism_roles where user_id=p_actor and role in('super_admin','registrar','admissions')) into staff,registrar,admission;
 if p_action='apply' then
  select * into intake from public.crism_intakes where id=p_id for update;
  select * into prog from public.crism_programmes where id=intake.programme_id;
  if intake.status is distinct from 'open' or prog.status is distinct from 'published' or now()<intake.opens_at or (intake.closes_at is not null and now()>=intake.closes_at) then raise exception 'This intake is not open';end if;
  if not exists(select 1 from public.crism_profiles where user_id=p_actor) or p_data->>'consent' is distinct from 'true' then raise exception 'Complete your profile and consent';end if;
  insert into public.crism_applications(user_id,intake_id,statement,qualifications,consent_at) values(p_actor,p_id,p_data->>'statement',p_data->>'qualifications',now()) returning id into out_id;
  insert into public.crism_invoices(application_id,user_id,purpose,base_ngn_minor,amount_minor,tx_ref) values(out_id,p_actor,'application',250000,250000,'crh-a-'||gen_random_uuid());
 elsif p_action='decision' then
  if not admission then raise exception 'Admissions permission required';end if;
  select * into app from public.crism_applications where id=p_id for update;
  if app.id is null or app.revision is distinct from (p_data->>'revision')::integer or app.status not in('submitted','under_review') or p_data->>'status' not in('under_review','offered','rejected') or length(trim(p_data->>'reason'))<3 then raise exception 'Invalid or stale admission decision';end if;
  update public.crism_applications set status=p_data->>'status',decision_reason=p_data->>'reason',reviewed_by=p_actor,reviewed_at=now(),revision=revision+1 where id=p_id;out_id:=p_id;
  if p_data->>'status'='offered' then
   select * into intake from public.crism_intakes where id=app.intake_id;
   select * into prog from public.crism_programmes where id=intake.programme_id;
   insert into public.crism_invoices(application_id,user_id,purpose,base_ngn_minor,amount_minor,tx_ref) values(app.id,app.user_id,'tuition_certification',prog.fee_minor,prog.fee_minor,'crh-a-'||gen_random_uuid());
  end if;
 elsif p_action='accept' then
  select * into app from public.crism_applications where id=p_id and user_id=p_actor for update;
  if app.id is null then raise exception 'Application not found';end if;
  select * into enrol from public.crism_enrollments where application_id=app.id;
  if enrol.id is not null then return jsonb_build_object('id',enrol.id);end if;
  if app.status<>'offered' or p_data->>'acceptTerms' is distinct from 'true' then raise exception 'An offer and acceptance are required';end if;
  select * into intake from public.crism_intakes where id=app.intake_id for update;
  select * into prog from public.crism_programmes where id=intake.programme_id;
  if prog.status<>'published' then raise exception 'Programme is unavailable';end if;
  if (select count(*) from public.crism_invoices where application_id=app.id and status='paid')<>2 then raise exception 'Verified application and tuition payments are required';end if;
  if not exists(select 1 from public.crism_courses where programme_id=prog.id and status='published') or exists(select 1 from public.crism_courses c where c.programme_id=prog.id and (c.status<>'published' or (select count(*) from public.crism_lessons l where l.course_id=c.id and l.status='published')<4)) then raise exception 'The complete approved curriculum must be published first';end if;
  if (select count(*) from public.crism_enrollments where intake_id=intake.id and status='active')>=intake.capacity then raise exception 'This intake is full';end if;
  insert into public.crism_enrollments(application_id,user_id,programme_id,intake_id,programme_snapshot) values(app.id,p_actor,prog.id,intake.id,to_jsonb(prog)) returning id into out_id;
  update public.crism_applications set status='accepted',revision=revision+1 where id=app.id;
 elsif p_action='exam_start' then
  select * into ex from public.crism_exams where id=p_id;
  select * into course from public.crism_courses where id=ex.course_id;
  select * into enrol from public.crism_enrollments where id=(p_data->>'enrollment_id')::uuid and user_id=p_actor and programme_id=course.programme_id and status='active' for update;
  if enrol.id is null or ex.status is distinct from 'published' or course.status<>'published' then raise exception 'Enrolled access is required';end if;
  select * into attempt from public.crism_attempts where exam_id=ex.id and enrollment_id=enrol.id;
  if attempt.id is not null then return jsonb_build_object('id',attempt.id);end if;
  if now()<ex.opens_at or now()>=ex.closes_at then raise exception 'This examination is closed';end if;
  insert into public.crism_attempts(exam_id,enrollment_id,questions_snapshot,deadline) values(ex.id,enrol.id,ex.questions,least(now()+make_interval(mins=>ex.duration_minutes),ex.closes_at)) returning id into out_id;
 elsif p_action in('exam_save','exam_submit') then
  select * into attempt from public.crism_attempts where id=p_id for update;
  if attempt.id is null or not exists(select 1 from public.crism_enrollments where id=attempt.enrollment_id and user_id=p_actor and status='active') then raise exception 'Attempt not found';end if;
  if attempt.status<>'started' then return jsonb_build_object('id',attempt.id,'status',attempt.status);end if;
  if now()>attempt.deadline then
   update public.crism_attempts set status='expired',submitted_at=now(),score=(select round(100.0*count(*)/jsonb_array_length(attempt.questions_snapshot))::integer from jsonb_array_elements(attempt.questions_snapshot) with ordinality q(value,idx) where attempt.answers->(q.idx::integer-1)=q.value->'answer'),revision=revision+1 where id=p_id;return jsonb_build_object('id',p_id,'status','expired');
  end if;
  if attempt.revision is distinct from (p_data->>'revision')::integer then raise exception 'This attempt changed; reload before saving';end if;
  a:=p_data->'answers';n:=jsonb_array_length(attempt.questions_snapshot);
  if jsonb_typeof(a)<>'array' or jsonb_array_length(a)<>n then raise exception 'Invalid answer count';end if;
  v_score:=0;
  for i in 0..n-1 loop
   if a->i<>'null'::jsonb and (jsonb_typeof(a->i)<>'number' or (a->>i)!~'^[0-3]$') then raise exception 'Invalid answer';end if;
   if p_action='exam_submit' and a->i='null'::jsonb then raise exception 'Answer every question';end if;
   if a->i=attempt.questions_snapshot->i->'answer' then v_score:=v_score+1;end if;
  end loop;
  update public.crism_attempts set answers=a,status=case when p_action='exam_submit' then 'submitted' else 'started' end,
   score=case when p_action='exam_submit' then round(100.0*v_score/n)::integer else null end,
   submitted_at=case when p_action='exam_submit' then now() else null end,revision=revision+1 where id=p_id;out_id:=p_id;
 elsif p_action='award' then
  if not registrar or p_data->>'reviewAcknowledged' is distinct from 'true' then raise exception 'Registrar review is required';end if;
  select * into enrol from public.crism_enrollments where id=p_id for update;
  if enrol.id is null or enrol.status<>'active' then raise exception 'Active enrollment required';end if;
  select count(*) into n from public.crism_courses where programme_id=enrol.programme_id and status='published';
  if n=0 or exists(select 1 from public.crism_courses c where c.programme_id=enrol.programme_id and c.status='published' and not exists(select 1 from public.crism_results r where r.enrollment_id=p_id and r.course_id=c.id and r.score>=50)) then raise exception 'All published courses need released passing results';end if;
  if exists(select 1 from public.crism_lessons l join public.crism_courses c on c.id=l.course_id where c.programme_id=enrol.programme_id and c.status='published' and l.status='published' and not exists(select 1 from public.crism_progress p where p.enrollment_id=enrol.id and p.lesson_id=l.id)) then raise exception 'Complete every required lesson';end if;
  select * into prog from public.crism_programmes where id=enrol.programme_id;
  insert into public.crism_awards(enrollment_id,snapshot,issued_by) select enrol.id,jsonb_build_object('name',p.display_name,'programme',enrol.programme_snapshot->>'title','level',enrol.programme_snapshot->>'level','institution','Christ Reformation International School of Ministry','issuer','Apostle Anchord Taiwo','recognition','Institutional ministry training award; not a university degree'),p_actor from public.crism_profiles p where p.user_id=enrol.user_id returning id into out_id;
  update public.crism_enrollments set status='completed' where id=enrol.id;
 elsif p_action='revoke_award' then
  if not staff or length(trim(p_data->>'reason'))<5 then raise exception 'Administrator and revocation reason required';end if;
  update public.crism_awards set status='revoked',revoked_by=p_actor,revocation_reason=p_data->>'reason',revoked_at=now() where id=p_id and status='issued' returning id into out_id;
 else raise exception 'Unknown academic action';end if;
 insert into public.crism_audit(actor,action,resource,record_id) values(p_actor,p_action,'academic',out_id::text);
 return jsonb_build_object('id',out_id);
end;$$;
revoke all on function public.crism_action(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.crism_action(uuid,text,uuid,jsonb) to service_role;
create function public.crism_settle_invoice(p_id uuid,p_charge text) returns void
language plpgsql security invoker set search_path='' as $$
declare inv public.crism_invoices;
begin
 select * into inv from public.crism_invoices where id=p_id for update;
 if inv.id is null or inv.status='paid' then return;end if;
 if inv.status not in('initializing','pending','needs_review') or p_charge !~ '^chg_[A-Za-z0-9_-]+$' then raise exception 'Invoice cannot be settled';end if;
 update public.crism_invoices set status='paid',charge_id=p_charge,paid_at=now() where id=p_id;
 if inv.purpose='application' then update public.crism_applications set status='submitted',revision=revision+1 where id=inv.application_id and status='payment_pending';end if;
 insert into public.crism_audit(action,resource,record_id) values('provider_verified_settlement','invoice',p_id::text);
end;$$;
revoke all on function public.crism_settle_invoice(uuid,text) from public,anon,authenticated;
grant execute on function public.crism_settle_invoice(uuid,text) to service_role;
create function public.crism_freeze_curriculum() returns trigger
language plpgsql security invoker set search_path='' as $$
declare pid uuid;
begin
 if tg_table_name='crism_programmes' then pid:=old.id;
 elsif tg_table_name='crism_courses' then pid:=coalesce(new.programme_id,old.programme_id);
 else select programme_id into pid from public.crism_courses where id=coalesce(new.course_id,old.course_id);end if;
 if exists(select 1 from public.crism_enrollments where programme_id=pid) then raise exception 'Enrolled curriculum is immutable; create a new programme version for changes';end if;
 return new;
end;$$;
revoke all on function public.crism_freeze_curriculum() from public,anon,authenticated;
grant execute on function public.crism_freeze_curriculum() to service_role;
create trigger crism_programme_frozen before update on public.crism_programmes for each row execute function public.crism_freeze_curriculum();
create trigger crism_course_frozen before insert or update on public.crism_courses for each row execute function public.crism_freeze_curriculum();
create trigger crism_lesson_frozen before insert or update on public.crism_lessons for each row execute function public.crism_freeze_curriculum();
create function public.crism_invoice_customer(p_id uuid) returns table(email text)
language sql security invoker set search_path='' as $$select u.email from public.crism_invoices i join public.crism_profiles u on u.user_id=i.user_id where i.id=p_id$$;
revoke all on function public.crism_invoice_customer(uuid) from public,anon,authenticated;
grant execute on function public.crism_invoice_customer(uuid) to service_role;
create function public.crism_role_change(p_actor uuid,p_email text,p_role text,p_active boolean) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare target uuid;
begin
 perform pg_advisory_xact_lock(24711821);
 if not exists(select 1 from public.crism_roles where user_id=p_actor and role='super_admin') then raise exception 'School administrator required';end if;
 select user_id into target from public.crism_profiles where lower(email)=lower(p_email);
 if target is null then raise exception 'The staff member must create and confirm an account first';end if;
 if p_role not in('super_admin','registrar','admissions','lecturer') then raise exception 'Invalid role';end if;
 if p_active then insert into public.crism_roles(user_id,role,granted_by) values(target,p_role,p_actor) on conflict do nothing;
 else
  if p_role='super_admin' and (select count(*) from public.crism_roles where role='super_admin')<=1 then raise exception 'The last administrator cannot be removed';end if;
  delete from public.crism_roles where user_id=target and role=p_role;
 end if;
 insert into public.crism_audit(actor,action,resource,record_id) values(p_actor,case when p_active then 'grant_' else 'revoke_' end||p_role,'role',target::text);
 return jsonb_build_object('saved',true,'user_id',target);
end;$$;
revoke all on function public.crism_role_change(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.crism_role_change(uuid,text,text,boolean) to service_role;
create function public.crism_editor_audit() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.crism_audit(actor,action,resource,record_id) values(new.updated_by,lower(tg_op),tg_table_name,new.id::text);return new;
end;$$;
revoke all on function public.crism_editor_audit() from public,anon,authenticated;
grant execute on function public.crism_editor_audit() to service_role;
do $$declare t text;begin foreach t in array array['crism_programmes','crism_intakes','crism_courses','crism_lessons','crism_classes','crism_resources','crism_assignments','crism_exams'] loop
 execute format('create trigger crism_editor_audit after insert or update on public.%I for each row execute function public.crism_editor_audit()',t);
end loop;end $$;
create function public.crism_submission_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare a public.crism_assignments;e public.crism_enrollments;c public.crism_courses;
begin
 select * into a from public.crism_assignments where id=new.assignment_id;
 select * into e from public.crism_enrollments where id=new.enrollment_id;
 select * into c from public.crism_courses where id=a.course_id;
 if a.status is distinct from 'published' or now()>=a.deadline or e.status is distinct from 'active' or e.programme_id is distinct from c.programme_id then raise exception 'Submission is closed or outside this enrollment';end if;
 return new;
end;$$;
revoke all on function public.crism_submission_guard() from public,anon,authenticated;
grant execute on function public.crism_submission_guard() to service_role;
create trigger crism_submission_guard before insert on public.crism_submissions for each row execute function public.crism_submission_guard();
create function public.crism_curriculum_signature(p_id uuid) returns text language sql stable security invoker set search_path='' as $$
select md5(coalesce((select to_jsonb(p)::text from public.crism_programmes p where p.id=p_id),'')||coalesce((select string_agg(to_jsonb(c)::text,'|' order by c.id) from public.crism_courses c where c.programme_id=p_id),'')||coalesce((select string_agg(to_jsonb(l)::text,'|' order by l.id) from public.crism_lessons l join public.crism_courses c on c.id=l.course_id where c.programme_id=p_id),''))
$$;
revoke all on function public.crism_curriculum_signature(uuid) from public,anon,authenticated;
grant execute on function public.crism_curriculum_signature(uuid) to service_role;
create function public.crism_approve_curriculum(p_actor uuid,p_id uuid,p_signature text,p_ack boolean) returns void language plpgsql security invoker set search_path='' as $$
declare p public.crism_programmes;minimum integer;
begin
 if not p_ack or not exists(select 1 from public.crism_roles where user_id=p_actor and role in('super_admin','registrar')) then raise exception 'Academic approval required';end if;
 select * into p from public.crism_programmes where id=p_id for update;
 perform 1 from public.crism_courses where programme_id=p_id for update;
 perform 1 from public.crism_lessons where course_id in(select id from public.crism_courses where programme_id=p_id) for update;
 if p.id is null or p_signature is distinct from public.crism_curriculum_signature(p_id) then raise exception 'Curriculum changed; review the saved version again';end if;
 minimum:=case when p.level='Certificate' then 6 else 12 end;
 if (select count(*) from public.crism_courses where programme_id=p_id)<minimum then raise exception 'Complete the required programme courses first';end if;
 if exists(select 1 from public.crism_courses c where programme_id=p_id and ((select count(*) from public.crism_lessons l where l.course_id=c.id and length(l.body)>=300)<4 or not exists(select 1 from public.crism_assignments where course_id=c.id) or not exists(select 1 from public.crism_exams where course_id=c.id))) then raise exception 'Every course needs four complete lessons, an assignment and an examination';end if;
 update public.crism_courses set status='published',revision=revision+1,updated_by=p_actor where programme_id=p_id;
 update public.crism_lessons set status='published',revision=revision+1,updated_by=p_actor where course_id in(select id from public.crism_courses where programme_id=p_id);
 update public.crism_programmes set status='published',policy_acknowledged=true,revision=revision+1,updated_by=p_actor where id=p_id;
 insert into public.crism_audit(actor,action,resource,record_id) values(p_actor,'curriculum_academically_approved','programme',p_id::text);
end;$$;
revoke all on function public.crism_approve_curriculum(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.crism_approve_curriculum(uuid,uuid,text,boolean) to service_role;
create function public.crism_backup() returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('format','CRISM-academic-backup-v1','created_at',now(),'tables',jsonb_build_object('crism_profiles',coalesce((select jsonb_agg(t) from public.crism_profiles t),'[]'::jsonb),'crism_roles',coalesce((select jsonb_agg(t) from public.crism_roles t),'[]'::jsonb),'crism_programmes',coalesce((select jsonb_agg(t) from public.crism_programmes t),'[]'::jsonb),'crism_intakes',coalesce((select jsonb_agg(t) from public.crism_intakes t),'[]'::jsonb),'crism_courses',coalesce((select jsonb_agg(t) from public.crism_courses t),'[]'::jsonb),'crism_lessons',coalesce((select jsonb_agg(t) from public.crism_lessons t),'[]'::jsonb),'crism_classes',coalesce((select jsonb_agg(t) from public.crism_classes t),'[]'::jsonb),'crism_resources',coalesce((select jsonb_agg(t) from public.crism_resources t),'[]'::jsonb),'crism_applications',coalesce((select jsonb_agg(t) from public.crism_applications t),'[]'::jsonb),'crism_enrollments',coalesce((select jsonb_agg(t) from public.crism_enrollments t),'[]'::jsonb),'crism_progress',coalesce((select jsonb_agg(t) from public.crism_progress t),'[]'::jsonb),'crism_assignments',coalesce((select jsonb_agg(t) from public.crism_assignments t),'[]'::jsonb),'crism_submissions',coalesce((select jsonb_agg(t) from public.crism_submissions t),'[]'::jsonb),'crism_exams',coalesce((select jsonb_agg(t) from public.crism_exams t),'[]'::jsonb),'crism_attempts',coalesce((select jsonb_agg(t) from public.crism_attempts t),'[]'::jsonb),'crism_results',coalesce((select jsonb_agg(t) from public.crism_results t),'[]'::jsonb),'crism_awards',coalesce((select jsonb_agg(t) from public.crism_awards t),'[]'::jsonb),'crism_invoices',coalesce((select jsonb_agg(t) from public.crism_invoices t),'[]'::jsonb),'crism_audit',coalesce((select jsonb_agg(t) from public.crism_audit t),'[]'::jsonb)))$$;
revoke all on function public.crism_backup() from public,anon,authenticated;
grant execute on function public.crism_backup() to service_role;
create function public.crism_queue_notice() returns trigger language plpgsql security invoker set search_path='' as $$
declare mail text;subject_line text;message text;source text;
begin
 select email into mail from public.crism_profiles where user_id=new.user_id;
 if mail is null then return new;end if;
 if tg_table_name='crism_invoices' then
  if new.status<>'paid' or old.status='paid' then return new;end if;
  subject_line:='CRISM school payment receipt';source:='crism-invoice:'||new.id;
  message:=format(E'Your school payment has been verified.\n\nPurpose: %s\nAmount: %s %s\nReference: %s\n\nOpen your school portal for your receipt and next step: https://www.christreformationhouse.org.ng/crism/portal\n\nThis is a school payment receipt, not a church donation receipt.',replace(new.purpose,'_',' '),new.currency,to_char(new.amount_minor::numeric/100,'FM999999999990.00'),new.tx_ref);
 else
  if new.status=old.status or new.status not in('submitted','offered','rejected','accepted') then return new;end if;
  subject_line:='CRISM application update';source:='crism-application:'||new.id||':'||new.revision;
  message:=format(E'Your CRISM application status is now: %s.\n\nOpen your private school portal for the academic decision and next steps: https://www.christreformationhouse.org.ng/crism/portal\n\nReference: %s\n\nThis transactional message does not subscribe you to ministry campaigns.',replace(new.status,'_',' '),new.id);
 end if;
 insert into public.communication_jobs(kind,email,subject,text,html,expires_at,source_key) values('registration',mail,subject_line,message,'',now()+interval '2 days',source) on conflict(source_key) do nothing;
 return new;
end;$$;
revoke all on function public.crism_queue_notice() from public,anon,authenticated;
grant execute on function public.crism_queue_notice() to service_role;
create trigger crism_invoice_receipt after update on public.crism_invoices for each row execute function public.crism_queue_notice();
create trigger crism_application_notice after update on public.crism_applications for each row execute function public.crism_queue_notice();
-- Index relationship lookups without changing any pre-existing ministry table.
do $$declare r record;begin
 for r in select c.relname as tab,a.attname as col from pg_constraint f join pg_class c on c.oid=f.conrelid join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum=f.conkey[1]
 where f.contype='f' and n.nspname='public' and c.relname like 'crism_%' and array_length(f.conkey,1)=1 and not exists(select 1 from pg_index i where i.indrelid=c.oid and i.indkey[0]=f.conkey[1])
 loop execute format('create index if not exists %I on public.%I(%I)',r.tab||'_'||r.col||'_fk_idx',r.tab,r.col);end loop;
end $$;
notify pgrst,'reload schema';
commit;
