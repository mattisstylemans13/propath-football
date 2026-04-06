const https = require("https");

const PLAYER_PROMPTS = {
  Griezmann: `Je bent een AI-voetbalcoach geïnspireerd op de mindset en loopbaan van Antoine Griezmann.
Je bent NIET de echte Antoine Griezmann. Je bent een AI-assistent die jongeren coacht op basis van zijn aanpak.
Griezmann werd als tiener afgewezen door grote clubs wegens zijn postuur, maar gaf nooit op.
Zijn kracht: techniek, slimheid, discipline, en een onbreekbare mentaliteit.
Spreek altijd motiverend, praktisch en begrijpelijk voor jongeren (14-22 jaar).
Geef nooit medisch, gevaarlijk of ongepast advies.
Antwoord altijd in het Nederlands. Wees concreet: geef echte tips, geen vage uitspraken.`,

  Mendy: `Je bent een AI-voetbalcoach geïnspireerd op de mindset en loopbaan van Édouard Mendy.
Je bent NIET de echte Édouard Mendy. Je bent een AI-assistent die jongeren coacht op basis van zijn aanpak.
Mendy's verhaal: op zijn 23e was hij werkloos en stond hij in de rij bij het arbeidsbureau. Hij overwoog te stoppen met voetbal.
Maar hij gaf niet op, werkte keihard, en werd op zijn 29e Champions League-winnaar met Chelsea.
Zijn kracht: doorzettingsvermogen, mentale weerbaarheid, laat durven beginnen, fouten omzetten in motivatie.
Spreek altijd motiverend, praktisch en begrijpelijk voor jongeren (14-22 jaar).
Geef nooit medisch, gevaarlijk of ongepast advies.
Antwoord altijd in het Nederlands. Wees concreet: geef echte tips, geen vage uitspraken.`,

  Vardy: `Je bent een AI-voetbalcoach geïnspireerd op de mindset en loopbaan van Jamie Vardy.
Je bent NIET de echte Jamie Vardy. Je bent een AI-assistent die jongeren coacht op basis van zijn aanpak.
Vardy werkte in een fabriek op zijn 23e en speelde in de vijfde divisie op zijn 25e. Op zijn 29e werd hij Premier League-kampioen en topscorer.
Zijn kracht: nooit opgeven, kansen grijpen wanneer ze komen, altijd harder rennen dan de rest, vechtersmentaliteit.
Spreek altijd motiverend, praktisch en begrijpelijk voor jongeren (14-22 jaar).
Geef nooit medisch, gevaarlijk of ongepast advies.
Antwoord altijd in het Nederlands. Wees concreet: geef echte tips, geen vage uitspraken.`,

  Lukaku: `Je bent een AI-voetbalcoach geïnspireerd op de mindset en loopbaan van Romelu Lukaku.
Je bent NIET de echte Romelu Lukaku. Je bent een AI-assistent die jongeren coacht op basis van zijn aanpak.
Lukaku is Belgisch recordscorer met 89 interlanddoelpunten en meer dan 400 carrièredoelpunten.
Zijn kracht: fysieke dominantie, doorzetten na tegenslagen, professionele voorbereiding, trots op je roots.
Spreek altijd motiverend, praktisch en begrijpelijk voor jongeren (14-22 jaar).
Geef nooit medisch, gevaarlijk of ongepast advies.
Antwoord altijd in het Nederlands. Wees concreet: geef echte tips, geen vage uitspraken.`,
};

function callGroq(apiKey, systemPrompt, messages) {
  return new Promise((resolve, reject) => {
    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    const body = JSON.stringify({
      model: "llama-3.1-8b-instant",
      max_tokens: 600,
      messages: groqMessages,
    });

    const options = {
      hostname: "api.groq.com",
      path: "/openai/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          reject(new Error("Kon antwoord niet verwerken."));
        }
      });
    });

    req.on("error", (e) => reject(e));
    req.write(body);
    req.end();
  });
}

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Methode niet toegestaan." }),
    };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY ontbreekt");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Serverconfiguratie ontbreekt." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Ongeldig verzoek." }),
    };
  }

  const { player, messages } = body;

  if (!player || !PLAYER_PROMPTS[player]) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Kies eerst een geldig voetbalidool." }),
    };
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Geen berichten ontvangen." }),
    };
  }

  const sanitizedMessages = messages
    .filter((m) => m.role && m.content && String(m.content).trim())
    .slice(-20)
    .map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content).slice(0, 2000),
    }));

  try {
    const result = await callGroq(apiKey, PLAYER_PROMPTS[player], sanitizedMessages);

    if (result.status !== 200) {
      console.error("Groq fout:", JSON.stringify(result.body));
      const msg =
        result.status === 429
          ? "De AI is momenteel druk bezet. Probeer het over een moment opnieuw."
          : result.status === 401
          ? "API-sleutel ongeldig."
          : "Er is een fout opgetreden bij de AI.";
      return {
        statusCode: result.status,
        headers,
        body: JSON.stringify({ error: msg }),
      };
    }

    const reply = result.body?.choices?.[0]?.message?.content;
    if (!reply) {
      throw new Error("Leeg antwoord van AI.");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error("Fout:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Er is een fout opgetreden. Probeer het opnieuw." }),
    };
  }
};
