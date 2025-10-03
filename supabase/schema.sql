
-- Ejecuta esto en tu proyecto de Supabase
-- Tablas
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  display_name text not null,
  role text not null check (role in ('super_admin','admin','Instructor','PA','standard')),
  password text not null,
  created_at timestamp with time zone default now()
);

create table if not exists classes (
  id bigserial primary key,
  name text unique not null,
  created_at timestamp with time zone default now()
);

-- Un instructor puede impartir varias clases y una clase puede tener varios instructores
create table if not exists instructor_classes (
  instructor_id uuid references users(id) on delete cascade,
  class_id bigint references classes(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (instructor_id, class_id)
);

-- Props "catalogo" (string)
create table if not exists props (
  id bigserial primary key,
  name text unique not null,
  created_at timestamp with time zone default now()
);

-- Props asignados por instructor y por clase
create table if not exists class_props (
  id bigserial primary key,
  class_id bigint references classes(id) on delete cascade,
  instructor_id uuid references users(id) on delete cascade,
  prop_id bigint references props(id) on delete cascade
);

-- Imagenes por instructor+clase
create table if not exists class_images (
  id bigserial primary key,
  class_id bigint references classes(id) on delete cascade,
  instructor_id uuid references users(id) on delete cascade,
  url text not null,
  created_at timestamp with time zone default now()
);

-- Una sola nota por instructor+clase
create table if not exists class_notes (
  id bigserial primary key,
  class_id bigint references classes(id) on delete cascade,
  instructor_id uuid references users(id) on delete cascade,
  note text not null default '',
  updated_at timestamp with time zone default now()
);

-- Funcion para eliminar en cascada una clase (incluye dependientes)
create or replace function delete_class_cascade(p_class_id bigint)
returns void language plpgsql as $$
begin
  delete from class_props where class_id = p_class_id;
  delete from class_images where class_id = p_class_id;
  delete from class_notes where class_id = p_class_id;
  delete from instructor_classes where class_id = p_class_id;
  delete from classes where id = p_class_id;
end;
$$;

-- Storage bucket para imagenes
-- Crea manualmente el bucket "class-images" desde el dashboard.
-- Luego, si usas RLS en storage, habilita acceso publico de lectura a las imagenes y escritura con la clave anon si lo deseas.

-- Datos seed
insert into users (username, display_name, role, password)
values ('superadmin','Super Admin','super_admin','Qaz123*')
on conflict (username) do nothing;

-- Algunos props base
insert into props (name) values ('Mat'), ('Blocks'), ('Straps'), ('Dumbbells'), ('Bolster')
on conflict do nothing;
