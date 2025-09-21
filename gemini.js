import 'dotenv/config';

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY missing in .env');

const DEFAULT_MODEL = 'gemini-1.5-flash';

// baseline instructions
const SYSTEM_INSTRUCTION = `You are a strict JSON-only code generator for n8n workflows.
Return exactly one valid JSON object and nothing else (no commentary, no backticks, no explanation).
Required top-level keys: "name", "nodes", "connections".
Nodes must use valid n8n node types and include: name, type, typeVersion, position, and parameters.
The "connections" object format must be exact, like this: {"Source Node Name":{"main":[[{"node":"Target Node Name","type":"main"}]]}}.
Do not return text outside the single JSON object. If asked for credentials, use placeholders like "{{CREDENTIALS.name}}".`;


export async function callGeminiStrict(userPrompt, model) {
  const contents = [
    {
      role: 'user',
      parts: [{ text: userPrompt }],
    },
  ];


  const systemInstruction = {
      role: 'system', 
      parts: [{ text: SYSTEM_INSTRUCTION }],
  };

  return callRest(model || DEFAULT_MODEL, contents, systemInstruction);
}


async function callRest(model, contents, systemInstruction) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    contents,
    systemInstruction: systemInstruction,
   };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const rawText = await resp.text();
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    throw new Error(`Non-JSON response from Gemini (status ${resp.status}): ${rawText.slice(0,1500)}`);
  }

  if (!resp.ok) {
    const msg = parsed?.error?.message || parsed?.error || JSON.stringify(parsed);
    throw new Error(`Gemini REST error (status ${resp.status}): ${msg}`);
  }

  // trying multiple common shapes to pick the generated text
  const candidate =
    parsed?.candidates?.[0]?.content?.parts?.[0]?.text ||
    parsed?.candidates?.[0]?.content?.parts?.[0] ||
    parsed?.candidates?.[0]?.content?.text ||
    parsed?.output?.[0]?.content?.parts?.[0]?.text ||
    parsed?.output?.text ||
    parsed?.text ||
    parsed?.response?.output?.text ||
    parsed?.result?.output?.text ||
    JSON.stringify(parsed);

  const text = String(candidate);

  // Extracting the first JSON substring
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return text.substring(first, last + 1);
  }
  return text;
}