begin;
-- Preserve every issued/revoked record and permit a reviewed replacement after revocation.
alter table public.crism_awards drop constraint crism_awards_enrollment_id_key;
alter table public.crism_awards add column replaces_id uuid references public.crism_awards(id),add check(replaces_id is null or replaces_id<>id);
create unique index crism_one_current_award on public.crism_awards(enrollment_id) where status='issued';
create index crism_awards_replaces_idx on public.crism_awards(replaces_id);
create or replace function public.crism_freeze_curriculum() returns trigger
language plpgsql security invoker set search_path='' as $$
declare pid uuid;
begin
 if tg_table_name='crism_courses' and tg_op='UPDATE' and (to_jsonb(new)-array['lecturer_id','updated_by','revision'])=(to_jsonb(old)-array['lecturer_id','updated_by','revision']) then return new;end if;
 if tg_table_name='crism_programmes' then pid:=old.id;
 elsif tg_table_name='crism_courses' then pid:=coalesce(new.programme_id,old.programme_id);
 else select programme_id into pid from public.crism_courses where id=coalesce(new.course_id,old.course_id);end if;
 if exists(select 1 from public.crism_enrollments where programme_id=pid) then raise exception 'Enrolled curriculum is immutable; create a new programme version for changes';end if;
 return new;
end;$$;
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
  if enrol.id is null or enrol.status not in('active','completed') then raise exception 'Eligible enrollment required';end if;
  select * into aw from public.crism_awards where enrollment_id=enrol.id and status='issued';
  if aw.id is not null then return jsonb_build_object('id',aw.id,'alreadyIssued',true);end if;
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

-- Church mission reporting includes only verified donations and keeps currencies separate.
create function public.crh_mission_giving(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(x),'[]'::jsonb) from (select currency,count(*) as gifts,sum(amount) as amount from public.donations where status='successful' and metadata->>'mission_project_id'=p_id::text group by currency)x;
$$;
revoke all on function public.crh_mission_giving(uuid) from public,anon,authenticated;
grant execute on function public.crh_mission_giving(uuid) to service_role;
create index if not exists donations_mission_project_idx on public.donations((metadata->>'mission_project_id'),currency) where status='successful';
notify pgrst,'reload schema';
commit;
