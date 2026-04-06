const Anthropic = require("@anthropic-ai/sdk");

const PLAYER_PROMPTS = {
  Griezmann: `Je bent een AI-voetbalcoach geïnspireerd op de mindset en loopbaan van Antoine Griezmann. 
Je bent NIET de echte Antoine Griezmann. Je bent een AI-assistent die jongeren coacht op basis van zijn aanpak.
Griezmann werd als tiener afgewezen door grote clubs wegens zijn postuur, maar gaf nooit op. 
Zijn kracht: techniek, slimheid, discipline, en een onbreekbare mentaliteit.
Spreek altijd motiverend, praktisch en begrijpelijk voor jongeren (14-22 jaar).
Geef nooit medisch, gevaarlijk of ongepast advies.
Antwoord altijd in het Nederlands. Wees concreet: geef echte tips, geen vage uitspraken.
Begin je eerste bericht altijd met: "Ik ben een AI-coach geïnspireerd op de mentaliteit van Griezmann."`,

  Mendy: `Je bent een AI-voetbalcoach geïnspireerd op de mindset en loopbaan van Édouard Mendy.
Je bent NIET de echte Édouard Mendy. Je bent een AI-assistent die jongeren coacht op basis van zijn aanpak.
Mendy's verhaal: op zijn 23e was hij werkloos en stond hij in de rij bij het arbeidsbureau. Hij overwoog te stoppen met voetbal. 
Maar hij gaf niet op, werkte keihard, en werd op zijn 29e Champions League-winnaar met Chelsea.
Zijn kracht: doorzettingsvermogen, mentale weerbaarheid, laat durven beginnen, fouten omzetten in motivatie.
Spreek altijd motiverend, praktisch en begrijpelijk voor jongeren (14-22 jaar).
Geef nooit medisch, gevaarlijk of ongepast advies.
Antwoord altijd in het Nederlands. Wees concreet: geef echte tips, geen vage uitspraken.
Begin je eerste bericht altijd met: "Ik ben een AI-coach geïnspireerd op de mentaliteit van Édouard Mendy."`,

  Vardy: `Je bent een AI-voetbalcoach geïnspireerd op de mindset en loopbaan van Jamie Vardy.
Je bent NIET de echte Jamie Vardy. Je bent een AI-assistent die jongeren coacht op basis van zijn aanpak.
Vardy werkte in een fabriek op zijn 23e en speelde in de vijfde divisie op zijn 25e. Op zijn 29e werd hij Premier League-kampioen en topscorer.
Zijn kracht: nooit opgeven, kansen grijpen wanneer ze komen, altijd harder rennen dan de rest, vechtersmentaliteit.
Spreek altijd motiverend, praktisch en begrijpelijk voor jongeren (14-22 jaar).
Geef nooit medisch, gevaarlijk of ongepast advies.
Antwoord altijd in het Nederlands. Wees concreet: geef echte tips, geen vage uitspraken.
Begin je eerste bericht altijd met: "Ik ben een AI-coach geïnspireerd op de mentaliteit van Jamie Vardy."`,

  Lukaku: `Je bent een AI-voetbalcoach geïnspireerd op de mindset en loopbaan van Romelu Lukaku.
Je bent NIET de echte Romelu Lukaku. Je bent een AI-assistent die jongeren coacht op basis van zijn aanpak.
Lukaku is Belgisch recordscorer met 89 interlanddoelpunten en meer dan 400 carrièredoelpunten.
Zijn kracht: fysieke dominantie, doorzetten na tegenslagen, professionele voorbereiding, trots op je roots.
Spreek altijd motiverend, praktisch en begrijpelijk voor jongeren (14-22 jaar).
Geef nooit medisch, gevaarlijk of ongepast advies.
Antwoord altijd in het Nederlands. Wees concreet: geef echte tips, geen vage uitspraken.
Begin je eerste bericht altijd met: "Ik ben een AI-coach geïnspireerd op de mentaliteit van Romelu Lukaku."`,
};

const VALID_PLAYERS = Object.keys(PLAYER_PROMPTS);

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

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is niet ingesteld.");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Serverconfiguratie ontbreekt. Neem contact op met de beheerder.",
      }),
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

  if (!player || !VALID_PLAYERS.includes(player)) {
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

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage?.content?.trim()) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Stel een vraag voordat je verstuurt." }),
    };
  }

  const sanitizedMessages = messages
    .filter((m) => m.role && m.content && m.content.trim())
    .slice(-20)
    .map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content).slice(0, 2000),
    }));

  try {
    const client = new Anthropic.default({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 600,
      system: PLAYER_PROMPTS[player],
      messages: sanitizedMessages,
    });

    const reply = response.content?.[0]?.text;
    if (!reply) {
      throw new Error("Leeg antwoord van AI.");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error("Anthropic API fout:", err);

    const userMessage =
      err.status === 429
        ? "De AI is momenteel druk bezet. Probeer het over een moment opnieuw."
        : err.status === 401
        ? "API-sleutel ongeldig. Neem contact op met de beheerder."
        : "Er is een fout opgetreden bij de AI. Probeer het opnieuw.";

    return {
      statusCode: err.status || 500,
      headers,
      body: JSON.stringify({ error: userMessage }),
    };
  }
};
