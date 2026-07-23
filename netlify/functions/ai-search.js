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

  // Catálogo compacto para no desperdiciar tokens
  const catalog = products
    .map((p) => `${p.id}|${p.name}${p.description ? ' - ' + p.description : ''}|${p.category}`)
    .join('\n');

  const systemPrompt = `Sos el asistente de búsqueda de FIT12, una dietética en Córdoba, Argentina.
Tu única tarea es encontrar productos relevantes para lo que pide el cliente.

Catálogo (formato: id|nombre y descripción|categoría):
${catalog}

Reglas:
- Respondé SOLO con un JSON válido, sin texto adicional, sin markdown, sin explicaciones.
- El JSON debe tener esta forma exacta: {"ids": ["id1", "id2", ...], "message": "texto breve"}
- "ids": lista de IDs de productos relevantes (máximo 12). Si no hay nada relevante, devolvé [].
- "message": una frase corta y amigable explicando qué encontraste (ej: "Encontré 5 suplementos que te pueden servir 💪").
- Pensá en sinónimos, usos y categorías relacionadas. Ej: "proteína" → Whey, creatina, colágeno.
- Si la búsqueda es vaga (ej: "algo dulce", "para el mate"), sé creativo pero relevante.
- No menciones precios ni inventés productos que no estén en el catálogo.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        messages: [{ role: 'user', content: `Busco: "${query}"` }],
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
        JSON.stringify({ ids: [], message: 'No encontré resultados para esa búsqueda.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ids: parsed.ids || [], message: parsed.message || '' }),
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
