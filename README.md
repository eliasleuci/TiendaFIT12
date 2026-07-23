# FIT12 — Tienda online con Búsqueda IA ✨

Tienda propia para FIT12 con panel de administración, checkout por WhatsApp
y buscador inteligente potenciado por Claude AI.

**Stack:** React + Vite + TailwindCSS · Supabase · Netlify (funciones serverless para la IA)

---

## El único paso extra: agregar la API key en Netlify

1. Ir a tu sitio en [app.netlify.com](https://app.netlify.com)
2. **Site configuration → Environment variables → Add a variable**
3. Agregar:
   - Key: `ANTHROPIC_API_KEY`
   - Value: tu clave de Anthropic (`sk-ant-...`)
4. **Deploys → Trigger deploy → Deploy site**

Listo. El buscador IA queda funcionando.

---

## Setup completo desde cero

### 1. Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. SQL Editor → pegar `supabase/schema.sql` → ejecutar
3. SQL Editor → pegar `supabase/seed.sql` → ejecutar
4. Authentication → Users → Add user (tu cuenta de admin)
5. Project Settings → API → copiar Project URL y anon key

### 2. Variables de entorno en Netlify

En **Site configuration → Environment variables** agregar:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | Tu Project URL de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Tu anon key de Supabase |
| `VITE_WHATSAPP_NUMBER` | Tu número (ej: 5493511234567) |
| `VITE_GOOGLE_MAPS_API_KEY` | Tu key de Google Maps |
| `ANTHROPIC_API_KEY` | Tu key de Anthropic (sk-ant-...) |

### 3. Probar localmente

```bash
npm install
cp .env.example .env
# Completar .env con tus datos
npm run dev
```

Para probar la IA localmente también podés instalar Netlify CLI:
```bash
npm install -g netlify-cli
netlify dev
```
Esto levanta las funciones serverless en local igual que en producción.

---

## Estructura relevante

```
netlify/
  functions/
    ai-search.js     ← Función serverless (proxy seguro a Anthropic) ← NUEVO
netlify.toml         ← Config de build y rutas ← NUEVO
src/
  components/
    AISearch.jsx     ← Modal del buscador inteligente ← NUEVO
    Header.jsx       ← Con botón ✨ IA ← ACTUALIZADO
  pages/
    Store.jsx        ← Integra AISearch ← ACTUALIZADO
```
