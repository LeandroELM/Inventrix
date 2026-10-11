-- Base de conocimiento del chatbot: fragmentos de los manuales con embeddings (gte-small, 384 dim).
-- Sin acceso directo: la ingesta y la búsqueda las hace service_role (Edge Function / script).

create extension if not exists vector with schema extensions;

create table public.manual_fragmentos (
  id bigint generated always as identity primary key,
  perfil text not null check (perfil in ('admin', 'operativo')),
  seccion text not null,
  contenido text not null,
  embedding extensions.vector(384) not null
);

create index manual_fragmentos_embedding_idx
  on public.manual_fragmentos using hnsw (embedding extensions.vector_cosine_ops);
create index manual_fragmentos_perfil_idx on public.manual_fragmentos (perfil);

alter table public.manual_fragmentos enable row level security;
revoke all on table public.manual_fragmentos from anon, authenticated;

-- Fragmentos más cercanos (distancia coseno) para un perfil.
create function public.buscar_manual(p_embedding extensions.vector(384), p_perfil text, p_cantidad int default 5)
returns table (seccion text, contenido text, similitud float)
language sql
stable
security definer
set search_path = ''
as $$
  select f.seccion, f.contenido, (1 - (f.embedding operator(extensions.<=>) p_embedding))::float as similitud
  from public.manual_fragmentos f
  where f.perfil = p_perfil
  order by f.embedding operator(extensions.<=>) p_embedding
  limit greatest(coalesce(p_cantidad, 5), 1);
$$;

revoke execute on function public.buscar_manual(extensions.vector, text, int) from public, anon, authenticated;
grant execute on function public.buscar_manual(extensions.vector, text, int) to service_role;
