# FIT12 — Tienda online

Tienda propia para FIT12, con panel de administración y checkout por WhatsApp.
Reemplaza a AgilPedido: vos cargás/editás los productos desde `/admin` y el
cliente arma el pedido y te lo manda por WhatsApp.

**Stack:** React + Vite + TailwindCSS · Supabase (base de datos y login del admin) · Deploy en Vercel.

Ya viene cargada con tu catálogo actual: **226 productos en 14 categorías**,
sacados de tu AgilPedido (`supabase/seed.sql`).

---

## 1. Crear el proyecto en Supabase

1. Andá a [supabase.com](https://supabase.com) → **New project** (el plan free alcanza para arrancar).
2. Una vez creado, andá a **SQL Editor** → **New query**.
3. Pegá el contenido de `supabase/schema.sql` y ejecutalo (crea las tablas `categories` y `products`, y los permisos de seguridad).
4. Abrí una segunda query nueva, pegá el contenido de `supabase/seed.sql` y ejecutalo. Esto carga tus 226 productos.
5. Andá a **Authentication → Users → Add user** y creá un usuario con tu email y una contraseña. Con esa cuenta vas a entrar a `/admin`. (No hace falta que el cliente final tenga cuenta, solo vos.)
6. Andá a **Project Settings → API** y copiá:
   - `Project URL`
   - `anon public` key

## 2. Configurar el proyecto localmente

```bash
npm install
cp .env.example .env
```

Editá `.env` y completá:

```
VITE_SUPABASE_URL=el Project URL que copiaste
VITE_SUPABASE_ANON_KEY=la anon key que copiaste
VITE_WHATSAPP_NUMBER=5493511234567   # tu número, código de país + área + número, sin "+"
```

Probalo local:

```bash
npm run dev
```

- Tienda: `http://localhost:5173`
- Admin: `http://localhost:5173/admin` (login con el usuario que creaste en el paso 1.5)

## 3. Deploy a Vercel

1. Subí este proyecto a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com) → **New Project** → importá el repo.
3. En **Environment Variables** cargá las mismas 3 variables del `.env`.
4. Deploy. Vercel te da una URL tipo `fit12.vercel.app`.
5. Para tu dominio propio: **Project Settings → Domains** en Vercel, agregá tu dominio y seguí las instrucciones de DNS.

No hace falta Railway para este proyecto: al ser un sitio estático (React + Supabase directo desde el navegador) Vercel alcanza y es más simple. Guardá Railway para si más adelante necesitás un backend propio (por ejemplo, para lógica de facturación).

## 4. Uso diario

- **Cargar o editar productos:** entrá a `tu-dominio.com/admin`, botón "+ Nuevo producto" o "Editar" en cada fila.
- **Ocultar un producto sin borrarlo** (por ejemplo si se agotó): destildá "Activo" en la tabla — desaparece de la tienda pero queda guardado.
- **Categorías:** se administran desde el panel lateral del admin (agregar, renombrar, eliminar).
- **Pedidos:** no quedan guardados en ninguna base — el cliente arma el carrito y al tocar "Enviar pedido por WhatsApp" se abre WhatsApp con el detalle y el total ya escritos, listo para mandar.

## 5. Estructura del proyecto

```
src/
  components/       Header, Hero, ProductCard, CartDrawer, etc.
  components/admin/ Formulario de producto y manejo de categorías
  context/          Carrito (localStorage) y sesión de admin (Supabase Auth)
  lib/               Cliente de Supabase, hook de catálogo, configuración
  pages/            Store (tienda), AdminLogin, AdminDashboard
supabase/
  schema.sql        Tablas + seguridad (RLS)
  seed.sql          Carga inicial de tus 226 productos
```

## Próximos pasos posibles (no incluidos todavía)

- Fotos de producto (Supabase Storage) — hoy los productos son solo texto/precio, igual que en AgilPedido.
- Precio diferenciado mayorista/minorista, si en algún momento lo necesitás.
- Cobro online con Mercado Pago.
- Historial de pedidos guardado en base (hoy el pedido "vive" solo en el mensaje de WhatsApp).
