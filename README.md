
# Wellness Class Settings

Aplicacion React + Vite + TS lista para Vercel y Supabase.
Importante: Para replicar exactamente tu estilo, reemplaza `src/styles.css` por la hoja de estilos de tu proyecto anterior (mismo nombre y ruta).

## Variables de entorno (Vite)
Crea un archivo `.env` con:
```
VITE_SUPABASE_URL=tu_url
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

En Vercel, define las mismas variables de entorno (Build & Runtime).

## Supabase
1. Crea un proyecto y ejecuta `supabase/schema.sql` en el editor SQL.
2. Crea un bucket de Storage llamado `class-images`.
3. (Opcional) Ajusta politicas de Storage para permitir subir imagenes con la clave anonima.

Usuario por defecto:
- username: `superadmin`
- password: `Qaz123*`
- rol: `super_admin`

## Scripts
- `npm i`
- `npm run dev` para desarrollo
- `npm run build` y `npm run preview` para produccion

## Roles y permisos (UI)
- super_admin/admin: CRUD de usuarios, vista Modify Class, eliminar clases y administrar contenido de cualquier instructor.
- Instructor: crear clases, asignarse a si mismo, y editar props, imagenes y nota de sus clases desde Manage Class (boton Editar). No puede ver Modify Class ni Manage Users.
- PA/standard: pueden ver Check Class Setting.

## Notas
- Esta app usa una tabla `users` propia (no auth de Supabase). En produccion, considera migrar a Auth + RLS si lo deseas.
- La funcion `delete_class_cascade` elimina dependencias de una clase.
