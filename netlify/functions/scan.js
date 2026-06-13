// netlify/functions/scan.js
// Meal Scanner via OpenAI Vision — outputs ProPath-formatted response

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

    const { imageBase64, mediaType, profile, trainingType, consumed, lang } = JSON.parse(event.body || '{}');
    if (!imageBase64) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing image data' }) };
    }

    let imageUrl = imageBase64;
    if (!imageUrl.startsWith('data:')) {
      const mt = mediaType || 'image/jpeg';
      imageUrl = `data:${mt};base64,${imageBase64}`;
    }

    // Player profile context
    const p = profile || {};
    const weight = p.weight || 70;
    const height = p.height || 175;
    const age = p.age || 20;
    const gender = p.gender || 'male';
    const position = p.position || 'Midfielder';
    const day = trainingType || 'match';
    const userLang = lang || 'en';

    const prompt = `You are CalAI, an elite nutrition analyzer for an athletic football player.

PLAYER PROFILE:
- Age: ${age}, Gender: ${gender}
- Weight: ${weight}kg, Height: ${height}cm
- Position: ${position}
- Today: ${day} day (e.g. match/training/rest)

ANALYZE THE MEAL IN THE IMAGE and return ONLY this JSON object (no markdown):

{
  "scan": {
    "items": [
      {
        "name": "chicken breast",
        "grams": 150,
        "calories": 248,
        "protein": 46,
        "carbs": 0,
        "fat": 5,
        "confidence": 0.95
      }
    ],
    "totalCalories": 508,
    "totalProtein": 51,
    "totalCarbs": 56,
    "totalFat": 6
  },
  "feedback": [
    "Solid protein base — good for muscle recovery after ${day} day."
  ]
}

CRITICAL RULES:
1. Estimate REALISTIC portion sizes from visual cues (plate size, serving spoons, etc)
2. Be PRECISE with macros — use actual food database values
3. ALL numbers must be integers (no decimals)
4. "confidence" is 0.0 to 1.0 — how certain you are about that ingredient
5. "items" array must list EVERY visible ingredient separately (sauce counts!)
6. totalCalories/totalProtein/totalCarbs/totalFat MUST equal the SUM of all items
7. "feedback" is 1-2 short sentences in ${userLang === 'nl' ? 'Dutch' : userLang === 'fr' ? 'French' : userLang === 'es' ? 'Spanish' : 'English'} — give specific advice for a football player on a ${day} day
8. If NO food visible: return {"error":"no_food","message":"I don't see food in this image."}
9. RESPOND WITH ONLY THE JSON OBJECT — no markdown, no explanation`;

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
              { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
            ],
          },
        ],
        max_tokens: 1500,
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
        console.error('Could not parse:', rawText);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Could not parse AI response', raw: rawText }) };
      }
    }

    // Validate structure — if AI returned wrong format, normalize it
    if (parsed.error) {
      return { statusCode: 200, headers, body: JSON.stringify(parsed) };
    }

    // Make sure scan object exists with correct fields
    if (!parsed.scan && parsed.items) {
      // AI returned flat format — restructure to expected nested format
      parsed = {
        scan: {
          items: parsed.items.map(it => ({
            name: it.name || 'unknown',
            grams: Math.round(it.grams || 100),
            calories: Math.round(it.calories || it.kcal || 0),
            protein: Math.round(it.protein || 0),
            carbs: Math.round(it.carbs || 0),
            fat: Math.round(it.fat || 0),
            confidence: typeof it.confidence === 'number' ? it.confidence : 0.85
          })),
          totalCalories: Math.round(parsed.totalCalories || parsed.total?.kcal || 0),
          totalProtein: Math.round(parsed.totalProtein || parsed.total?.protein || 0),
          totalCarbs: Math.round(parsed.totalCarbs || parsed.total?.carbs || 0),
          totalFat: Math.round(parsed.totalFat || parsed.total?.fat || 0)
        },
        feedback: parsed.feedback || [parsed.verdict || 'Meal analyzed.']
      };
    }

    // Ensure all required fields exist
    if (parsed.scan) {
      parsed.scan.items = (parsed.scan.items || []).map(it => ({
        name: it.name || 'unknown',
        grams: Math.round(it.grams || 100),
        calories: Math.round(it.calories || it.kcal || 0),
        protein: Math.round(it.protein || 0),
        carbs: Math.round(it.carbs || 0),
        fat: Math.round(it.fat || 0),
        confidence: typeof it.confidence === 'number' ? it.confidence : 0.85
      }));

      // If totals are 0 but items have data, recalculate
      const itemSum = parsed.scan.items.reduce((acc, it) => ({
        cal: acc.cal + (it.calories || 0),
        prot: acc.prot + (it.protein || 0),
        carb: acc.carb + (it.carbs || 0),
        fat: acc.fat + (it.fat || 0)
      }), {cal:0, prot:0, carb:0, fat:0});

      if (!parsed.scan.totalCalories || parsed.scan.totalCalories === 0) {
        parsed.scan.totalCalories = itemSum.cal;
      }
      if (!parsed.scan.totalProtein || parsed.scan.totalProtein === 0) {
        parsed.scan.totalProtein = itemSum.prot;
      }
      if (!parsed.scan.totalCarbs || parsed.scan.totalCarbs === 0) {
        parsed.scan.totalCarbs = itemSum.carb;
      }
      if (!parsed.scan.totalFat || parsed.scan.totalFat === 0) {
        parsed.scan.totalFat = itemSum.fat;
      }
    }

    if (!parsed.feedback) parsed.feedback = [];

    return { statusCode: 200, headers, body: JSON.stringify(parsed) };
  } catch (err) {
    console.error('Scan function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error', message: err.message }) };
  }
};
