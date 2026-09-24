create or replace function private.operations_riders()
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_role public.user_role := private.current_role_name();
begin
  if v_role not in ('dispatcher','owner_admin') then raise exception 'Operations access required'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'full_name',r.full_name,'phone',r.phone,'vehicle_type',r.vehicle_type,'cash_on_hand',r.cash_on_hand,'is_active',r.is_active) order by r.full_name) from public.riders r where r.is_active=true),'[]'::jsonb);
end
$function$;
revoke execute on function private.operations_riders() from public,anon,authenticated;
grant execute on function private.operations_riders() to authenticated,service_role;

create or replace function public.operations_riders()
returns jsonb language sql set search_path=''
as $function$ select private.operations_riders() $function$;
revoke all on function public.operations_riders() from public,anon;
grant execute on function public.operations_riders() to authenticated;

create or replace function private.approved_eeu_vendors()
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_role public.user_role := private.current_role_name();
begin
  if v_role not in ('dispatcher','owner_admin','rider') then raise exception 'Operations access required'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'phone',v.phone,'is_approved',v.is_approved) order by v.name) from public.eeu_vendors v where v.is_approved=true),'[]'::jsonb);
end
$function$;
revoke execute on function private.approved_eeu_vendors() from public,anon,authenticated;
grant execute on function private.approved_eeu_vendors() to authenticated,service_role;

create or replace function public.approved_eeu_vendors()
returns jsonb language sql set search_path=''
as $function$ select private.approved_eeu_vendors() $function$;
revoke all on function public.approved_eeu_vendors() from public,anon;
grant execute on function public.approved_eeu_vendors() to authenticated;
