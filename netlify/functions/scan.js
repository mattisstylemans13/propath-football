// netlify/functions/scan.js
// Meal Scanner via OpenAI Vision (gpt-4o-mini)

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
    const apiKey = process.env.OPENAI_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'OPENAI_KEY not configured' }) };
    }

    const { imageBase64, mimeType } = JSON.parse(event.body || '{}');
    if (!imageBase64) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing image data' }) };
    }

    let imageUrl = imageBase64;
    if (!imageUrl.startsWith('data:')) {
      const mt = mimeType || 'image/jpeg';
      imageUrl = `data:${mt};base64,${imageBase64}`;
    }

    const prompt = `You are a precise nutrition analyzer for an athletic football app. Analyze the meal in the image and return a JSON object with this exact shape:

{
  "name": "Short meal name",
  "items": [{"name":"chicken breast","grams":150,"kcal":248,"protein":46,"carbs":0,"fat":5}],
  "total": {"kcal":508,"protein":51,"carbs":56,"fat":6},
  "verdict": "Strong protein meal, good for post-training recovery.",
  "score": 8
}

Rules:
- Estimate portion sizes from visual cues
- All numbers are integers
- "score" is 1-10 for athletic suitability
- "verdict" is one sentence for a young football player
- If no food: return {"error":"no_food","message":"I don't see food in this image."}
- Respond with ONLY valid JSON, no markdown`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI Vision error:', errText);
      return { statusCode: response.status, headers, body: JSON.stringify({ error: 'Vision service error', detail: errText }) };
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '{}';

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch (e2) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Could not parse AI response', raw: rawText }) };
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify(parsed) };
  } catch (err) {
    console.error('Scan function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error', message: err.message }) };
  }
};
