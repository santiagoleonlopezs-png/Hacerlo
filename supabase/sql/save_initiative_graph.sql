-- Atomic graph replacement. Uses existing edit permissions and row-level security.
create or replace function public.save_initiative_graph(p_initiative uuid, p_nodes jsonb, p_edges jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare expected_nodes integer; expected_edges integer; affected integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 if jsonb_typeof(p_nodes) is distinct from 'array' or jsonb_typeof(p_edges) is distinct from 'array' then
  raise exception 'Graph nodes and edges must be arrays' using errcode = '22023';
 end if;
 perform 1 from public.initiatives i where i.id=p_initiative and public.can_edit_org(i.organization_id) for update;
 if not found then raise exception 'Initiative unavailable or not editable' using errcode = '42501'; end if;
 expected_nodes:=jsonb_array_length(p_nodes); expected_edges:=jsonb_array_length(p_edges);
 if exists (
  select 1 from jsonb_to_recordset(p_edges) as e(source_node_id uuid,target_node_id uuid)
  where not exists (select 1 from jsonb_to_recordset(p_nodes) as n(id uuid) where n.id=e.source_node_id)
     or not exists (select 1 from jsonb_to_recordset(p_nodes) as n(id uuid) where n.id=e.target_node_id)
 ) then raise exception 'Every edge must reference nodes in this graph' using errcode = '22023'; end if;

 delete from public.graph_edges g where g.initiative_id=p_initiative
 and not exists (select 1 from jsonb_to_recordset(p_edges) as e(id uuid) where e.id=g.id);
 insert into public.graph_nodes as g (id,initiative_id,label,node_type,attributes)
 select n.id,p_initiative,n.label,n.node_type,coalesce(n.attributes,'{}'::jsonb)
 from jsonb_to_recordset(p_nodes) as n(id uuid,label text,node_type text,attributes jsonb)
 on conflict (id) do update set label=excluded.label,node_type=excluded.node_type,attributes=g.attributes||excluded.attributes
 where g.initiative_id=p_initiative;
 get diagnostics affected = row_count;
 if affected<>expected_nodes then raise exception 'Graph node identifiers are not available' using errcode = '42501'; end if;

 insert into public.graph_edges as g (id,initiative_id,source_node_id,target_node_id,relation_type,measure_type,measure_value,measure_unit,evidence_kind,evidence_notes,attributes)
 select e.id,p_initiative,e.source_node_id,e.target_node_id,e.relation_type,e.measure_type,e.measure_value,e.measure_unit,coalesce(e.evidence_kind,'declared'),e.evidence_notes,coalesce(e.attributes,'{}'::jsonb)
 from jsonb_to_recordset(p_edges) as e(id uuid,source_node_id uuid,target_node_id uuid,relation_type text,measure_type text,measure_value numeric,measure_unit text,evidence_kind text,evidence_notes text,attributes jsonb)
 on conflict (id) do update set source_node_id=excluded.source_node_id,target_node_id=excluded.target_node_id,relation_type=excluded.relation_type,
 measure_type=excluded.measure_type,measure_value=excluded.measure_value,measure_unit=excluded.measure_unit,evidence_kind=excluded.evidence_kind,
 evidence_notes=excluded.evidence_notes,attributes=g.attributes||excluded.attributes
 where g.initiative_id=p_initiative;
 get diagnostics affected = row_count;
 if affected<>expected_edges then raise exception 'Graph edge identifiers are not available' using errcode = '42501'; end if;
 delete from public.graph_nodes g where g.initiative_id=p_initiative
 and not exists (select 1 from jsonb_to_recordset(p_nodes) as n(id uuid) where n.id=g.id);
end;
$$;
revoke all on function public.save_initiative_graph(uuid,jsonb,jsonb) from public, anon;
grant execute on function public.save_initiative_graph(uuid,jsonb,jsonb) to authenticated;
