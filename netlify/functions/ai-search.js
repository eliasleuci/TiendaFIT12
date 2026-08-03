// netlify/functions/ai-search.js
// Función serverless de Netlify — recibe la consulta del cliente y el catálogo,
// llama a Claude Haiku y devuelve los IDs de productos relevantes.
// La API key de Anthropic NUNCA llega al navegador: vive solo en Netlify.

export default async (req, context) => {
  // Solo POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { query, products } = body;

  if (!query || !products || !Array.isArray(products)) {
    return new Response(JSON.stringify({ error: 'Faltan parámetros: query y products[]' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada en Netlify' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Catálogo compacto optimizado para ahorrar tokens sin perder precisión
  const catalog = products
    .map((p) => {
      const desc = p.description ? ` (${p.description.slice(0, 70).replace(/[\n\r]+/g, ' ')})` : '';
      return `${p.id}|${p.name}${desc}|${p.category}`;
    })
    .join('\n');

  const systemPrompt = `Sos FitBot, el Asistente Nutricional Inteligente de FIT12 (dietética y nutrición deportiva en Córdoba, Argentina).

Tu objetivo es ser súper útil, profesional y entusiasta. Podés responder dos tipos de consultas:
1) Búsqueda directa o Receta/Objetivo (ej: "Quiero desayunos proteicos para la semana", "Receta de pancakes fit", "Pegar receta..."): Armá el combo ideal seleccionando los productos exactos del catálogo.
2) Duda Nutricional/Deportiva (ej: "¿La proteína se toma antes o después de entrenar?", "¿Qué comer para la masa muscular?"): Explicá brevemente con fundamento científico y recomendá los productos pertinentes de FIT12.

Catálogo de FIT12 (formato: id|nombre y descripción|categoría):
${catalog}

Reglas Estrictas:
- Respondé ÚNICAMENTE con un JSON válido, sin bloques de markdown adicionales ni explicaciones fuera del JSON.
- Formato del JSON:
{
  "ids": ["id1", "id2", ...],
  "message": "Frase corta y motivadora sobre lo que armaste o encontraste",
  "recipeTitle": "Título del Combo o Receta (o nulo si es una búsqueda simple)",
  "nutriTip": "Consejo de FitBot o respuesta detallada a la duda del cliente (máx 3-4 oraciones, claro y conciso)"
}
- "ids": máximo 8-10 productos más relevantes del catálogo de FIT12. Si no hay coincidencias exactas, sugerí las mejores alternativas saludables.
- No inventes IDs ni productos que no existan en el catálogo.
- Si el usuario pega una receta custom, busca en el catálogo los ingredientes equivalente.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [{ role: 'user', content: `Consulta: "${query}"` }],
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return new Response(JSON.stringify({ error: 'Error al contactar la IA' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';

    let parsed;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error('JSON parse error from Claude:', text);
      return new Response(
        JSON.stringify({ ids: [], message: 'No encontré resultados exactos para esa consulta.', nutriTip: null, recipeTitle: null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        ids: parsed.ids || [],
        message: parsed.message || '',
        nutriTip: parsed.nutriTip || null,
        recipeTitle: parsed.recipeTitle || null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Handler error:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = {
  path: '/.netlify/functions/ai-search',
};
