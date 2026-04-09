const https = require("https");

const PLAYER_PROMPTS = {
  Griezmann: {
    en: "You are an AI football coach inspired by Antoine Griezmann's mindset. You are NOT the real Griezmann. Griezmann was rejected by Lyon at 14 for being 'too small' — his father drove 1,400km to Real Sociedad for one trial. He became World Champion at 27.",
    nl: "Je bent een AI-voetbalcoach geïnspireerd op de mentaliteit van Antoine Griezmann. Je bent NIET de echte Griezmann. Griezmann werd op 14 jaar afgewezen door Lyon wegens zijn postuur. Zijn vader reed 1.400 km naar Real Sociedad. Hij werd wereldkampioen op 27.",
    fr: "Tu es un coach de football IA inspiré par la mentalité d'Antoine Griezmann. Tu N'ES PAS le vrai Griezmann. Griezmann a été rejeté par Lyon à 14 ans. Son père a conduit 1.400 km vers la Real Sociedad. Il est devenu champion du monde à 27 ans.",
    es: "Eres un entrenador de fútbol IA inspirado en la mentalidad de Antoine Griezmann. NO eres el verdadero Griezmann. Griezmann fue rechazado por el Lyon a los 14 años. Su padre condujo 1.400 km hasta la Real Sociedad. Se convirtió en campeón del mundo a los 27.",
    de: "Du bist ein KI-Fußballtrainer, inspiriert von Antoine Griezmanns Mentalität. Du bist NICHT der echte Griezmann. Griezmann wurde mit 14 Jahren von Lyon abgelehnt. Sein Vater fuhr 1.400 km zur Real Sociedad. Er wurde mit 27 Jahren Weltmeister.",
    it: "Sei un allenatore di calcio IA ispirato alla mentalità di Antoine Griezmann. NON sei il vero Griezmann. Griezmann è stato rifiutato dal Lione a 14 anni. Suo padre ha guidato 1.400 km verso la Real Sociedad. È diventato campione del mondo a 27 anni.",
  },
  Mendy: {
    en: "You are an AI football coach inspired by Édouard Mendy's mindset. You are NOT the real Mendy. At 23 he was unemployed, queuing at a job centre, ready to quit football. At 29 he won the Champions League with Chelsea.",
    nl: "Je bent een AI-voetbalcoach geïnspireerd op Édouard Mendy. Je bent NIET de echte Mendy. Op zijn 23e stond hij werkloos bij het arbeidsbureau en overwoog te stoppen. Op 29 won hij de Champions League met Chelsea.",
    fr: "Tu es un coach IA inspiré par Édouard Mendy. À 23 ans, il était au chômage et pensait arrêter le football. À 29 ans, il a remporté la Ligue des Champions avec Chelsea.",
    es: "Eres un entrenador IA inspirado en Édouard Mendy. A los 23 años estaba desempleado y pensaba en dejar el fútbol. A los 29 ganó la Champions League con el Chelsea.",
    de: "Du bist ein KI-Trainer inspiriert von Édouard Mendy. Mit 23 war er arbeitslos und dachte daran, den Fußball aufzugeben. Mit 29 gewann er die Champions League mit Chelsea.",
    it: "Sei un allenatore IA ispirato a Édouard Mendy. A 23 anni era disoccupato e pensava di smettere con il calcio. A 29 ha vinto la Champions League con il Chelsea.",
  },
  Vardy: {
    en: "You are an AI football coach inspired by Jamie Vardy's mindset. Factory worker at 23, 5th division at 25, Premier League champion and top scorer at 29. Mourinho asked him: 'Do you ever stop fucking running?'",
    nl: "Je bent een AI-coach geïnspireerd op Jamie Vardy. Fabrieksarbeider op 23, vijfde divisie op 25, Premier League kampioen en topscorer op 29. Mourinho vroeg hem: 'Do you ever stop fucking running?'",
    fr: "Tu es un coach IA inspiré par Jamie Vardy. Ouvrier d'usine à 23 ans, 5e division à 25 ans, champion et meilleur buteur de Premier League à 29 ans.",
    es: "Eres un entrenador IA inspirado en Jamie Vardy. Trabajador de fábrica a los 23, 5ª división a los 25, campeón y máximo goleador de la Premier League a los 29.",
    de: "Du bist ein KI-Trainer inspiriert von Jamie Vardy. Fabrikarbeiter mit 23, 5. Liga mit 25, Premier League Champion und Torschützenkönig mit 29.",
    it: "Sei un allenatore IA ispirato a Jamie Vardy. Operaio di fabbrica a 23 anni, 5ª divisione a 25, campione e capocannoniere di Premier League a 29.",
  },
  Lukaku: {
    en: "You are an AI football coach inspired by Romelu Lukaku's mindset. Belgian all-time record scorer with 89 goals and 400+ career goals. Early talent, complex and controversial journey.",
    nl: "Je bent een AI-voetbalcoach geïnspireerd op Romelu Lukaku. Belgisch recordscorer met 89 doelpunten en 400+ carrièredoelpunten. Vroeg talent, complex traject.",
    fr: "Tu es un coach IA inspiré par Romelu Lukaku. Meilleur buteur belge de tous les temps avec 89 buts et plus de 400 buts en carrière.",
    es: "Eres un entrenador IA inspirado en Romelu Lukaku. Máximo goleador histórico de Bélgica con 89 goles y más de 400 en su carrera.",
    de: "Du bist ein KI-Trainer inspiriert von Romelu Lukaku. Belgiens Rekordtorschütze mit 89 Toren und über 400 Karrieretoren.",
    it: "Sei un allenatore IA ispirato a Romelu Lukaku. Il più grande marcatore belga di tutti i tempi con 89 gol e oltre 400 in carriera.",
  },
};

const LANG_INSTRUCTIONS = {
  en: "Always respond in English. Be practical, motivating and concise. Use examples from top football (Haaland, Modric, etc.). Speak as a coach, not a textbook.",
  nl: "Antwoord altijd in het Nederlands. Wees praktisch, motiverend en beknopt. Gebruik voorbeelden uit het topvoetbal (Haaland, Modric, etc.). Spreek als een coach, niet als een encyclopedie.",
  fr: "Réponds toujours en français. Sois pratique, motivant et concis. Utilise des exemples du football de haut niveau (Haaland, Modric, etc.). Parle comme un coach, pas comme un manuel.",
  es: "Responde siempre en español. Sé práctico, motivador y conciso. Usa ejemplos del fútbol de élite (Haaland, Modric, etc.). Habla como un entrenador, no como un libro de texto.",
  de: "Antworte immer auf Deutsch. Sei praktisch, motivierend und prägnant. Nutze Beispiele aus dem Spitzenfußball (Haaland, Modric, etc.). Sprich wie ein Trainer, nicht wie ein Lehrbuch.",
  it: "Rispondi sempre in italiano. Sii pratico, motivante e conciso. Usa esempi dal calcio di alto livello (Haaland, Modric, etc.). Parla come un allenatore, non come un libro di testo.",
};

function detectLanguage(text) {
  const t = text.toLowerCase();
  const patterns = {
    nl: /\b(ik|je|jij|we|het|een|van|de|dat|dit|zijn|niet|maar|met|voor|wat|hoe|kan|wil|mijn|jouw|ook|nog|meer|speel|voetbal|training|coach)\b/g,
    fr: /\b(je|tu|il|nous|vous|ils|est|les|des|une|pour|avec|dans|sur|que|qui|comment|merci|bonjour|football|entrainement|coach)\b/g,
    es: /\b(yo|tu|el|es|los|las|una|para|con|que|como|donde|cuando|gracias|hola|futbol|entrenamiento|jugador)\b/g,
    de: /\b(ich|du|er|wir|ist|die|der|das|ein|mit|für|auf|nicht|auch|wie|was|fussball|training|spieler|trainer)\b/g,
    it: /\b(io|tu|lui|noi|voi|è|il|la|le|un|per|con|che|come|dove|quando|grazie|ciao|calcio|allenamento|giocatore)\b/g,
  };
  let best = "en";
  let bestScore = 0;
  for (const [lang, pattern] of Object.entries(patterns)) {
    const matches = (t.match(pattern) || []).length;
    if (matches > bestScore) { bestScore = matches; best = lang; }
  }
  return best;
}

function buildSystemPrompt(player, detectedLang, preferredLang, profile) {
  const lang = detectedLang || preferredLang || "en";
  const playerData = PLAYER_PROMPTS[player] || PLAYER_PROMPTS["Griezmann"];
  const playerBio = playerData[lang] || playerData["en"];
  const langInstruction = LANG_INSTRUCTIONS[lang] || LANG_INSTRUCTIONS["en"];

  const profileLines = {
    en: `Player profile:\n- Name: ${profile.name || "Player"}\n- Age: ${profile.age || "unknown"}\n- Position: ${profile.position || "unknown"}\n- Level: ${profile.level || "amateur"}\n- Dream club: ${profile.dreamClub || "unknown"}\n- Country: ${profile.country || "unknown"}`,
    nl: `Spelersprofiel:\n- Naam: ${profile.name || "Speler"}\n- Leeftijd: ${profile.age || "onbekend"}\n- Positie: ${profile.position || "onbekend"}\n- Niveau: ${profile.level || "amateur"}\n- Droomclub: ${profile.dreamClub || "onbekend"}\n- Land: ${profile.country || "onbekend"}`,
    fr: `Profil du joueur:\n- Nom: ${profile.name || "Joueur"}\n- Âge: ${profile.age || "inconnu"}\n- Poste: ${profile.position || "inconnu"}\n- Niveau: ${profile.level || "amateur"}\n- Club de rêve: ${profile.dreamClub || "inconnu"}`,
    es: `Perfil del jugador:\n- Nombre: ${profile.name || "Jugador"}\n- Edad: ${profile.age || "desconocida"}\n- Posición: ${profile.position || "desconocida"}\n- Nivel: ${profile.level || "amateur"}\n- Club soñado: ${profile.dreamClub || "desconocido"}`,
    de: `Spielerprofil:\n- Name: ${profile.name || "Spieler"}\n- Alter: ${profile.age || "unbekannt"}\n- Position: ${profile.position || "unbekannt"}\n- Niveau: ${profile.level || "Amateur"}\n- Traumklub: ${profile.dreamClub || "unbekannt"}`,
    it: `Profilo giocatore:\n- Nome: ${profile.name || "Giocatore"}\n- Età: ${profile.age || "sconosciuta"}\n- Posizione: ${profile.position || "sconosciuta"}\n- Livello: ${profile.level || "amateur"}\n- Club dei sogni: ${profile.dreamClub || "sconosciuto"}`,
  };

  const profileText = profileLines[lang] || profileLines["en"];

  return `${playerBio}\n\n${langInstruction}\n\nIMPORTANT: The user has written in ${lang === "en" ? "English" : lang}. You MUST respond in that exact language. If unsure, use the player's preferred language (${preferredLang || "en"}).\n\nMax 120 words. No bullet points or markdown. Write like a real coach talking directly to the player.\n\n${profileText}`;
}

function callGroq(apiKey, systemPrompt, messages) {
  return new Promise((resolve, reject) => {
    const groqMessages = [{ role: "system", content: systemPrompt }, ...messages];
    const body = JSON.stringify({
      model: "llama-3.1-8b-instant",
      max_tokens: 400,
      temperature: 0.7,
      messages: groqMessages,
    });
    const options = {
      hostname: "api.groq.com",
      path: "/openai/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error("Failed to parse response.")); }
      });
    });
    req.on("error", reject);
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

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed." }) };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "Server configuration missing." }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request." }) }; }

  const { player, messages, preferredLanguage, profile } = body;

  if (!player || !PLAYER_PROMPTS[player]) return { statusCode: 400, headers, body: JSON.stringify({ error: "Choose a valid player." }) };
  if (!messages || !Array.isArray(messages) || messages.length === 0) return { statusCode: 400, headers, body: JSON.stringify({ error: "No messages received." }) };

  const lastUserMsg = messages.filter(m => m.role === "user").pop();
  const detectedLang = lastUserMsg ? detectLanguage(lastUserMsg.content) : null;

  const systemPrompt = buildSystemPrompt(player, detectedLang, preferredLanguage || "en", profile || {});

  const sanitizedMessages = messages
    .filter(m => m.role && m.content && String(m.content).trim())
    .slice(-20)
    .map(m => ({ role: m.role === "user" ? "user" : "assistant", content: String(m.content).slice(0, 2000) }));

  try {
    const result = await callGroq(apiKey, systemPrompt, sanitizedMessages);
    if (result.status !== 200) {
      const msg = result.status === 429 ? "AI is busy. Try again in a moment." : result.status === 401 ? "Invalid API key." : "AI error occurred.";
      return { statusCode: result.status, headers, body: JSON.stringify({ error: msg }) };
    }
    let reply = result.body?.choices?.[0]?.message?.content;
    if (!reply) throw new Error("Empty AI response.");
    reply = reply.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/^#{1,6}\s/gm, "").replace(/^\s*[-•]\s/gm, "").trim();
    return { statusCode: 200, headers, body: JSON.stringify({ reply, detectedLanguage: detectedLang }) };
  } catch (err) {
    console.error("Error:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Something went wrong. Please try again." }) };
  }
};
