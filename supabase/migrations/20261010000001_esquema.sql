-- Esquema base de Inventrix: enums, tablas, índices y trigger de perfiles.

create type public.rol_usuario as enum ('admin', 'operativo');
create type public.unidad_medida as enum ('unidad', 'libra', 'kilogramo', 'litro', 'caja', 'paquete');
create type public.tipo_movimiento as enum ('inicial', 'entrada', 'salida');
create type public.motivo_salida as enum ('venta', 'consumo_interno', 'retiro_autorizado');

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  usuario text not null unique,
  nombre text not null,
  rol public.rol_usuario not null,
  activo boolean not null default true,
  created_at timestamptz default now()
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) between 1 and 120),
  codigo text not null unique,
  unidad public.unidad_medida not null,
  existencias numeric(12,2) not null default 0 check (existencias >= 0),
  punto_pedido numeric(12,2) not null check (punto_pedido >= 0),
  activo boolean not null default true,
  motivo_baja text,
  dado_baja_por uuid references public.perfiles (id),
  dado_baja_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.movimientos (
  id bigint generated always as identity primary key,
  producto_id uuid not null references public.productos (id),
  tipo public.tipo_movimiento not null,
  cantidad numeric(12,2) not null check (cantidad > 0),
  motivo public.motivo_salida,
  existencias_antes numeric(12,2) not null,
  existencias_despues numeric(12,2) not null,
  usuario_id uuid not null references public.perfiles (id),
  created_at timestamptz not null default now()
);

create index productos_activo_nombre_idx on public.productos (activo, nombre);
create index movimientos_producto_created_idx on public.movimientos (producto_id, created_at desc);
create index movimientos_created_idx on public.movimientos (created_at desc);

create function public.tocar_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger productos_updated_at
before update on public.productos
for each row execute function public.tocar_updated_at();

create function public.crear_perfil_desde_auth() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, usuario, nombre, rol)
  values (
    new.id,
    new.raw_user_meta_data ->> 'usuario',
    new.raw_user_meta_data ->> 'nombre',
    (new.raw_user_meta_data ->> 'rol')::public.rol_usuario
  );
  return new;
end $$;

create trigger crear_perfil_desde_auth
after insert on auth.users
for each row execute function public.crear_perfil_desde_auth();
