begin;
alter table public.crism_exams add constraint crism_exam_minimum_pass check(pass_score>=50);
alter table public.crism_awards alter column issued_by drop not null;
alter table public.crism_awards add column issuance_method text not null default 'manual' check(issuance_method in('manual','automatic')),add column policy_authorized_by uuid references auth.users(id),add check((issuance_method='manual' and issued_by is not null) or (issuance_method='automatic' and policy_authorized_by is not null));
alter table public.crism_results alter column approved_by drop not null;
alter table public.crism_results add column release_method text not null default 'manual' check(release_method in('manual','automatic')),add column policy_authorized_by uuid references auth.users(id),add check((release_method='manual' and approved_by is not null) or (release_method='automatic' and policy_authorized_by is not null));
create table public.crism_settings(id integer primary key check(id=1),auto_awards boolean not null default false,authorized_by uuid references auth.users(id),authorized_at timestamptz,check(not auto_awards or (authorized_by is not null and authorized_at is not null)));
insert into public.crism_settings(id) values(1);
alter table public.crism_settings enable row level security;revoke all on public.crism_settings from anon,authenticated;grant select,update on public.crism_settings to service_role;
alter table public.crism_attempts drop constraint crism_attempts_exam_id_enrollment_id_key;
alter table public.crism_attempts add column attempt_number integer not null default 1 check(attempt_number between 1 and 13),add unique(exam_id,enrollment_id,attempt_number);
create unique index crism_single_running_attempt on public.crism_attempts(exam_id,enrollment_id) where status='started';
create table public.crism_exam_allowances(exam_id uuid not null references public.crism_exams(id),enrollment_id uuid not null references public.crism_enrollments(id),extra_attempts integer not null check(extra_attempts between 0 and 10),reason text not null,authorized_by uuid not null references auth.users(id),primary key(exam_id,enrollment_id));
alter table public.crism_exam_allowances enable row level security;revoke all on public.crism_exam_allowances from anon,authenticated;grant select,insert,update on public.crism_exam_allowances to service_role;
create index crism_exam_allowances_enrollment_idx on public.crism_exam_allowances(enrollment_id);
create index crism_exam_allowances_actor_idx on public.crism_exam_allowances(authorized_by);
alter table public.crism_submissions drop constraint crism_submissions_assignment_id_enrollment_id_key;
alter table public.crism_submissions add column submission_number integer not null default 1 check(submission_number between 1 and 13),add column assignment_snapshot jsonb,add unique(assignment_id,enrollment_id,submission_number);
create unique index crism_single_unreleased_submission on public.crism_submissions(assignment_id,enrollment_id) where released_at is null;
create table public.crism_assignment_allowances(assignment_id uuid not null references public.crism_assignments(id),enrollment_id uuid not null references public.crism_enrollments(id),extra_submissions integer not null check(extra_submissions between 0 and 10),reason text not null,authorized_by uuid not null references auth.users(id),primary key(assignment_id,enrollment_id));
alter table public.crism_assignment_allowances enable row level security;revoke all on public.crism_assignment_allowances from anon,authenticated;grant select,insert,update on public.crism_assignment_allowances to service_role;
create index crism_assignment_allowance_enrollment_idx on public.crism_assignment_allowances(enrollment_id);
create function public.crism_submit_assignment(p_actor uuid,p_assignment uuid,p_enrollment uuid,p_body text) returns uuid language plpgsql security invoker set search_path='' as $$
declare e public.crism_enrollments;a public.crism_assignments;c public.crism_courses;s public.crism_submissions;n integer;out_id uuid;
begin
 select * into e from public.crism_enrollments where id=p_enrollment and user_id=p_actor and status='active' for update;
 select * into a from public.crism_assignments where id=p_assignment;select * into c from public.crism_courses where id=a.course_id;
 if e.id is null or a.status is distinct from 'published' or c.status is distinct from 'published' or e.programme_id is distinct from c.programme_id or a.deadline is null or now()>=a.deadline then raise exception 'Submission is closed or outside your enrollment';end if;
 if length(p_body)<50 or length(p_body)>24000 then raise exception 'Use 50–24000 characters for coursework';end if;
 select * into s from public.crism_submissions where assignment_id=a.id and enrollment_id=e.id and released_at is null;
 if s.id is not null then if s.body=p_body then return s.id;else raise exception 'Your previous submission is awaiting a released grade';end if;end if;
 if exists(select 1 from public.crism_submissions where assignment_id=a.id and enrollment_id=e.id and released_at is not null and score>=50) then raise exception 'This assignment has already been passed';end if;
 select count(*) into n from public.crism_submissions where assignment_id=a.id and enrollment_id=e.id;
 if n>=3+coalesce((select extra_submissions from public.crism_assignment_allowances where assignment_id=a.id and enrollment_id=e.id),0) then raise exception 'Submission allowance reached; contact the academic office';end if;
 insert into public.crism_submissions(assignment_id,enrollment_id,body,submission_number,assignment_snapshot) values(a.id,e.id,p_body,n+1,to_jsonb(a)) returning id into out_id;
 insert into public.crism_audit(actor,action,resource,record_id) values(p_actor,'coursework_submitted','submission',out_id::text);return out_id;
end;$$;
revoke all on function public.crism_submit_assignment(uuid,uuid,uuid,text) from public,anon,authenticated;grant execute on function public.crism_submit_assignment(uuid,uuid,uuid,text) to service_role;
create function public.crism_eligibility(p_enrollment uuid) returns jsonb language plpgsql volatile security invoker set search_path='' as $$
declare e public.crism_enrollments;c public.crism_courses;all_ready boolean:=true;ready boolean;course_count integer:=0;assignment_count integer;exam_count integer;work_avg numeric;exam_avg numeric;rows jsonb:='[]';
begin
 select * into e from public.crism_enrollments where id=p_enrollment;
 if e.id is null or e.status not in('active','completed') then return jsonb_build_object('eligible',false,'reason','Active or completed enrollment required','courses',rows);end if;
 if (select count(*) from public.crism_invoices where application_id=e.application_id and status='paid')<>2 then return jsonb_build_object('eligible',false,'reason','Both school fees must be verified','courses',rows);end if;
 for c in select * from public.crism_courses where programme_id=e.programme_id order by position loop
  course_count:=course_count+1;ready:=c.status='published';
  if (select count(*) from public.crism_lessons where course_id=c.id and status='published')<4 or exists(select 1 from public.crism_lessons l where l.course_id=c.id and l.status='published' and not exists(select 1 from public.crism_progress p where p.enrollment_id=e.id and p.lesson_id=l.id)) then ready:=false;end if;
  select count(*) into assignment_count from public.crism_assignments where course_id=c.id and status in('published','closed');
  select count(*) into exam_count from public.crism_exams where course_id=c.id and status in('published','closed');
  if assignment_count=0 or exam_count=0 then ready:=false;end if;
  if exists(select 1 from public.crism_assignments a where a.course_id=c.id and a.status in('published','closed') and not exists(select 1 from public.crism_submissions s where s.assignment_id=a.id and s.enrollment_id=e.id and s.score>=50 and s.released_at is not null and s.graded_by is not null)) then ready:=false;end if;
  if exists(select 1 from public.crism_exams x where x.course_id=c.id and x.status in('published','closed') and not exists(select 1 from public.crism_attempts a where a.exam_id=x.id and a.enrollment_id=e.id and a.status in('submitted','expired') and a.score>=x.pass_score and a.released_at is not null)) then ready:=false;end if;
  select avg(best.score) into work_avg from(select max(s.score) as score from public.crism_assignments a join public.crism_submissions s on s.assignment_id=a.id and s.enrollment_id=e.id where a.course_id=c.id and a.status in('published','closed') and s.released_at is not null group by a.id)best;
  select avg(best.score) into exam_avg from(select max(a.score) as score from public.crism_exams x join public.crism_attempts a on a.exam_id=x.id and a.enrollment_id=e.id where x.course_id=c.id and x.status in('published','closed') and a.released_at is not null and a.status in('submitted','expired') group by x.id)best;
  if work_avg is null or exam_avg is null then ready:=false;end if;
  rows:=rows||jsonb_build_array(jsonb_build_object('course_id',c.id,'ready',ready,'score',case when ready then round(.5*work_avg+.5*exam_avg)::integer else null end));
  if not ready then all_ready:=false;end if;
 end loop;
 return jsonb_build_object('eligible',all_ready and course_count>0,'reason',case when all_ready and course_count>0 then 'All payment, lesson and assessment requirements passed' else 'Complete every course and pass every required assignment and examination' end,'courses',rows);
end;$$;
revoke all on function public.crism_eligibility(uuid) from public,anon,authenticated;grant execute on function public.crism_eligibility(uuid) to service_role;
create function public.crism_try_auto_award(p_enrollment uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare settings public.crism_settings;e public.crism_enrollments;eligibility jsonb;r jsonb;result_id uuid;existing uuid;
begin
 select * into settings from public.crism_settings where id=1;
 if settings.id is null or not settings.auto_awards then return null;end if;
 select * into e from public.crism_enrollments where id=p_enrollment for update;
 if e.id is null or e.status<>'active' then return null;end if;
 select id into existing from public.crism_awards where enrollment_id=e.id and status='issued';if existing is not null then return existing;end if;
 eligibility:=public.crism_eligibility(e.id);
 for r in select value from jsonb_array_elements(eligibility->'courses') loop
  if (r->>'ready')::boolean then
   insert into public.crism_results(enrollment_id,course_id,score,feedback,approved_by,release_method,policy_authorized_by)
   values(e.id,(r->>'course_id')::uuid,(r->>'score')::integer,'Automatically computed: 50% coursework and 50% examinations; every required assessment passed.',null,'automatic',settings.authorized_by)
   on conflict(enrollment_id,course_id) do nothing;
  end if;
 end loop;
 if eligibility->>'eligible'<>'true' then return null;end if;
 if exists(select 1 from jsonb_array_elements(eligibility->'courses')x where not exists(select 1 from public.crism_results r where r.enrollment_id=e.id and r.course_id=(x->>'course_id')::uuid and r.score=(x->>'score')::integer and r.score>=50)) then return null;end if;
 insert into public.crism_awards(enrollment_id,snapshot,issued_by,issuance_method,policy_authorized_by)
 select e.id,jsonb_build_object('name',p.display_name,'programme',e.programme_snapshot->>'title','level',e.programme_snapshot->>'level','institution','Christ Reformation International School of Ministry','issuer','CRISM automatic verified-completion policy','recognition','Institutional ministry training award; not a university degree'),null,'automatic',settings.authorized_by from public.crism_profiles p where p.user_id=e.user_id returning id into result_id;
 update public.crism_enrollments set status='completed' where id=e.id;
 insert into public.crism_audit(actor,action,resource,record_id) values(null,'automatic_award_issued_under_owner_policy','award',result_id::text);
 return result_id;
end;$$;
revoke all on function public.crism_try_auto_award(uuid) from public,anon,authenticated;grant execute on function public.crism_try_auto_award(uuid) to service_role;
create function public.crism_completion_event() returns trigger language plpgsql security invoker set search_path='' as $$
begin perform public.crism_try_auto_award(new.enrollment_id);return new;end;$$;
revoke all on function public.crism_completion_event() from public,anon,authenticated;grant execute on function public.crism_completion_event() to service_role;
create trigger crism_progress_completion after insert on public.crism_progress for each row execute function public.crism_completion_event();
create trigger crism_assignment_completion after update of released_at on public.crism_submissions for each row when(new.released_at is not null and old.released_at is distinct from new.released_at) execute function public.crism_completion_event();
create trigger crism_exam_completion after update of status,released_at on public.crism_attempts for each row when(new.released_at is not null and (old.status is distinct from new.status or old.released_at is distinct from new.released_at)) execute function public.crism_completion_event();
create function public.crism_award_ready_notice() returns trigger language plpgsql security invoker set search_path='' as $$
declare mail text;
begin
 select p.email into mail from public.crism_enrollments e join public.crism_profiles p on p.user_id=e.user_id where e.id=new.enrollment_id;
 insert into public.communication_jobs(kind,email,subject,text,html,expires_at,source_key) values('registration',mail,'Your CRISM award is ready','Your verified School of Ministry award is ready. Sign in to download your certificate or diploma: https://www.christreformationhouse.org.ng/crism/portal','',now()+interval '2 days','crism-award:'||new.id) on conflict(source_key) do nothing;return new;
end;$$;
revoke all on function public.crism_award_ready_notice() from public,anon,authenticated;grant execute on function public.crism_award_ready_notice() to service_role;
create trigger crism_award_ready_notice after insert on public.crism_awards for each row execute function public.crism_award_ready_notice();
create or replace function public.crism_action(p_actor uuid,p_action text,p_id uuid,p_data jsonb default '{}') returns jsonb
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
  if exists(select 1 from public.crism_courses where programme_id=prog.id and lecturer_id=p_actor) then raise exception 'A lecturer cannot enroll for assessment in their own taught programme';end if;
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
  select * into attempt from public.crism_attempts where exam_id=ex.id and enrollment_id=enrol.id order by attempt_number desc limit 1;
  if attempt.id is not null and attempt.status='started' then
   if now()<=attempt.deadline then return jsonb_build_object('id',attempt.id);end if;
   perform public.crism_action(p_actor,'exam_submit',attempt.id,jsonb_build_object('answers',attempt.answers,'revision',attempt.revision));
  end if;
  select * into attempt from public.crism_attempts where exam_id=ex.id and enrollment_id=enrol.id and released_at is not null and score>=ex.pass_score order by score desc limit 1;
  if attempt.id is not null then return jsonb_build_object('id',attempt.id);end if;
  if now()<ex.opens_at or now()>=ex.closes_at then raise exception 'This examination is closed';end if;
  select count(*) into n from public.crism_attempts where exam_id=ex.id and enrollment_id=enrol.id;
  if n>=3+coalesce((select extra_attempts from public.crism_exam_allowances where exam_id=ex.id and enrollment_id=enrol.id),0) then raise exception 'Attempt allowance reached; contact the academic office';end if;
  insert into public.crism_attempts(exam_id,enrollment_id,questions_snapshot,deadline,attempt_number) values(ex.id,enrol.id,ex.questions,least(now()+make_interval(mins=>ex.duration_minutes),ex.closes_at),n+1) returning id into out_id;
 elsif p_action in('exam_save','exam_submit') then
  select * into attempt from public.crism_attempts where id=p_id for update;
  if attempt.id is null or not exists(select 1 from public.crism_enrollments where id=attempt.enrollment_id and user_id=p_actor and status='active') then raise exception 'Attempt not found';end if;
  if attempt.status<>'started' then return jsonb_build_object('id',attempt.id,'status',attempt.status);end if;
  if now()>attempt.deadline then
   update public.crism_attempts set status='expired',submitted_at=now(),released_at=now(),score=(select round(100.0*count(*)/jsonb_array_length(attempt.questions_snapshot))::integer from jsonb_array_elements(attempt.questions_snapshot) with ordinality q(value,idx) where attempt.answers->(q.idx::integer-1)=q.value->'answer'),revision=revision+1 where id=p_id;return jsonb_build_object('id',p_id,'status','expired');
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
   submitted_at=case when p_action='exam_submit' then now() else null end,released_at=case when p_action='exam_submit' then now() else null end,revision=revision+1 where id=p_id;out_id:=p_id;
 elsif p_action='award' then
  if not registrar or p_data->>'reviewAcknowledged' is distinct from 'true' then raise exception 'Registrar review is required';end if;
  select * into enrol from public.crism_enrollments where id=p_id for update;
  if enrol.id is null or enrol.status not in('active','completed') then raise exception 'Eligible enrollment required';end if;
  select * into aw from public.crism_awards where enrollment_id=enrol.id and status='issued';
  if aw.id is not null then return jsonb_build_object('id',aw.id,'alreadyIssued',true);end if;
  if public.crism_eligibility(enrol.id)->>'eligible'<>'true' then raise exception 'Every required lesson, assignment and examination must be completed and passed';end if;
  select count(*) into n from public.crism_courses where programme_id=enrol.programme_id and status='published';
  if n=0 or exists(select 1 from public.crism_courses c where c.programme_id=enrol.programme_id and c.status='published' and not exists(select 1 from public.crism_results r where r.enrollment_id=p_id and r.course_id=c.id and r.score>=50)) then raise exception 'All published courses need released passing results';end if;
  if exists(select 1 from public.crism_lessons l join public.crism_courses c on c.id=l.course_id where c.programme_id=enrol.programme_id and c.status='published' and l.status='published' and not exists(select 1 from public.crism_progress p where p.enrollment_id=enrol.id and p.lesson_id=l.id)) then raise exception 'Complete every required lesson';end if;
  select * into prog from public.crism_programmes where id=enrol.programme_id;
  insert into public.crism_awards(enrollment_id,replaces_id,snapshot,issued_by) select enrol.id,(select id from public.crism_awards where enrollment_id=enrol.id and status='revoked' order by issued_at desc,id desc limit 1),jsonb_build_object('name',p.display_name,'programme',enrol.programme_snapshot->>'title','level',enrol.programme_snapshot->>'level','institution','Christ Reformation International School of Ministry','issuer','Apostle Anchord Taiwo','recognition','Institutional ministry training award; not a university degree'),p_actor from public.crism_profiles p where p.user_id=enrol.user_id returning id into out_id;
  update public.crism_enrollments set status='completed' where id=enrol.id;
 elsif p_action='revoke_award' then
  if not staff or length(trim(p_data->>'reason'))<5 then raise exception 'Administrator and revocation reason required';end if;
  update public.crism_awards set status='revoked',revoked_by=p_actor,revocation_reason=p_data->>'reason',revoked_at=now() where id=p_id and status='issued' returning id into out_id;
 else raise exception 'Unknown academic action';end if;
 insert into public.crism_audit(actor,action,resource,record_id) values(p_actor,p_action,'academic',out_id::text);
 return jsonb_build_object('id',out_id);
end;$$;


create function public.crism_finalize_due_attempts() returns integer language plpgsql security invoker set search_path='' as $$
declare a public.crism_attempts;n integer:=0;
begin
 for a in select * from public.crism_attempts where status='started' and deadline<now() order by deadline for update skip locked limit 50 loop
  update public.crism_attempts set status='expired',submitted_at=now(),released_at=now(),score=(select round(100.0*count(*)/jsonb_array_length(a.questions_snapshot))::integer from jsonb_array_elements(a.questions_snapshot) with ordinality q(value,idx) where a.answers->(q.idx::integer-1)=q.value->'answer'),revision=revision+1 where id=a.id;
  insert into public.crism_audit(actor,action,resource,record_id) values(null,'exam_deadline_auto_submitted','attempt',a.id::text);n:=n+1;
 end loop;return n;
end;$$;
revoke all on function public.crism_finalize_due_attempts() from public,anon,authenticated;grant execute on function public.crism_finalize_due_attempts() to service_role;

create function public.crism_set_automation(p_actor uuid,p_enabled boolean) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.crism_roles where user_id=p_actor and role='super_admin') then raise exception 'School administrator required';end if;
 update public.crism_settings set auto_awards=p_enabled,authorized_by=p_actor,authorized_at=now() where id=1;
 insert into public.crism_audit(actor,action,resource,record_id) values(p_actor,case when p_enabled then 'automatic_awards_authorized' else 'automatic_awards_paused' end,'settings','1');
end;$$;
revoke all on function public.crism_set_automation(uuid,boolean) from public,anon,authenticated;grant execute on function public.crism_set_automation(uuid,boolean) to service_role;
create index crism_awards_policy_authority_idx on public.crism_awards(policy_authorized_by);
create index crism_results_policy_authority_idx on public.crism_results(policy_authorized_by);
create or replace function public.crism_backup() returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('format','CRISM-academic-backup-v1','created_at',now(),'tables',jsonb_build_object('crism_profiles',coalesce((select jsonb_agg(t) from public.crism_profiles t),'[]'::jsonb),'crism_roles',coalesce((select jsonb_agg(t) from public.crism_roles t),'[]'::jsonb),'crism_settings',coalesce((select jsonb_agg(t) from public.crism_settings t),'[]'::jsonb),'crism_programmes',coalesce((select jsonb_agg(t) from public.crism_programmes t),'[]'::jsonb),'crism_intakes',coalesce((select jsonb_agg(t) from public.crism_intakes t),'[]'::jsonb),'crism_courses',coalesce((select jsonb_agg(t) from public.crism_courses t),'[]'::jsonb),'crism_lessons',coalesce((select jsonb_agg(t) from public.crism_lessons t),'[]'::jsonb),'crism_classes',coalesce((select jsonb_agg(t) from public.crism_classes t),'[]'::jsonb),'crism_resources',coalesce((select jsonb_agg(t) from public.crism_resources t),'[]'::jsonb),'crism_applications',coalesce((select jsonb_agg(t) from public.crism_applications t),'[]'::jsonb),'crism_enrollments',coalesce((select jsonb_agg(t) from public.crism_enrollments t),'[]'::jsonb),'crism_progress',coalesce((select jsonb_agg(t) from public.crism_progress t),'[]'::jsonb),'crism_assignments',coalesce((select jsonb_agg(t) from public.crism_assignments t),'[]'::jsonb),'crism_assignment_allowances',coalesce((select jsonb_agg(t) from public.crism_assignment_allowances t),'[]'::jsonb),'crism_submissions',coalesce((select jsonb_agg(t) from public.crism_submissions t),'[]'::jsonb),'crism_exams',coalesce((select jsonb_agg(t) from public.crism_exams t),'[]'::jsonb),'crism_exam_allowances',coalesce((select jsonb_agg(t) from public.crism_exam_allowances t),'[]'::jsonb),'crism_attempts',coalesce((select jsonb_agg(t) from public.crism_attempts t),'[]'::jsonb),'crism_results',coalesce((select jsonb_agg(t) from public.crism_results t),'[]'::jsonb),'crism_awards',coalesce((select jsonb_agg(t) from public.crism_awards t),'[]'::jsonb),'crism_invoices',coalesce((select jsonb_agg(t) from public.crism_invoices t),'[]'::jsonb),'crism_audit',coalesce((select jsonb_agg(t) from public.crism_audit t),'[]'::jsonb)))$$;
notify pgrst,'reload schema';
commit;
