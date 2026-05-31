// netlify/functions/chat.js
// AI Coach via Google Gemini 1.5 Flash (free tier with higher quotas)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'GEMINI_API_KEY not configured' }) };
    }

    const { messages, systemPrompt } = JSON.parse(event.body || '{}');
    if (!messages || !Array.isArray(messages)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
    }

    const contents = messages
      .filter((m) => m.role && m.content)
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const body = {
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 400,
        topP: 0.9,
      },
    };

    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    // Try multiple models in order — fallback if one quota is exhausted
    const models = ['gemini-1.5-flash-latest', 'gemini-1.5-flash-8b', 'gemini-2.0-flash-lite'];
    let lastError = null;

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { statusCode: 200, headers, body: JSON.stringify({ reply, content: reply, model }) };
      }

      const errText = await response.text();
      lastError = { status: response.status, text: errText, model };
      console.error(`Model ${model} failed:`, errText);

      // If it's not a quota error, stop trying other models
      if (response.status !== 429 && response.status !== 403) break;
    }

    return {
      statusCode: lastError?.status || 500,
      headers,
      body: JSON.stringify({ error: 'All Gemini models exhausted', detail: lastError }),
    };
  } catch (err) {
    console.error('Chat function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error', message: err.message }) };
  }
};
