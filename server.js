import 'dotenv/config';
import express from 'express';
import Ajv from 'ajv';
import { callGeminiStrict } from './gemini.js';

const app = express();
app.use(express.json());


const PORT = process.env.PORT || 3000;
console.log('GEMINI key present?', !!process.env.GEMINI_API_KEY);
console.log('N8N_BASE_URL present?', !!process.env.N8N_BASE_URL);
console.log('N8N_API_KEY present?', !!process.env.N8N_API_KEY);


app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/', (req, res) => res.send('n8n Workflow Generator (Gemini) running. Use POST /generate'));
app.get('/health', (req, res) => res.json({ ok: true, now: new Date().toISOString() }));

app.get('/preview', (req, res) => {
  const sampleWorkflow = {
    name: "Sample Sheet -> Slack",
    active: false,
    nodes: [
      {
        name: "Google Sheets Trigger",
        type: "n8n-nodes-base.googleSheets",
        typeVersion: 1,
        position: [250, 300],
        parameters: { operation: "watch", sheetId: "YOUR_SHEET_ID" }
      },
      {
        name: "Slack",
        type: "n8n-nodes-base.slack",
        typeVersion: 1,
        position: [600, 300],
        parameters: { channel: "#alerts", text: "New row: {{$json[\"values\"]}}" },
        credentials: { slackApi: "{{CREDENTIALS.slack}}" }
      }
    ],
    connections: {
      "Google Sheets Trigger": { main: [[{ node: "Slack", type: "main", index: 0 }]] }
    }
  };
  res.json(sampleWorkflow);
});

// validator, AJV to catch issues before posting to n8n
const ajv = new Ajv({ allErrors: true });
const workflowSchema = {
  type: "object",
  required: ["name", "nodes", "connections", "settings"],
  properties: {
    name: { type: "string" },
    nodes: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "type", "typeVersion", "position", "parameters"],
        properties: {
          name: { type: "string" },
          type: { type: "string" },
          typeVersion: { type: "number" },
          position: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
          parameters: { type: "object" },
          credentials: { type: "object" }
        }
      }
    },
    connections: { type: "object" },
    settings: { type: "object" }
  },
  additionalProperties: true
};
const validateAjv = ajv.compile(workflowSchema);

// create workflow in n8n via REST
async function createWorkflowInN8N(workflow) {
  const N8N_BASE_URL = process.env.N8N_BASE_URL;
  const N8N_API_KEY = process.env.N8N_API_KEY;
  if (!N8N_BASE_URL || !N8N_API_KEY) {
    throw new Error('N8N_BASE_URL or N8N_API_KEY missing in environment');
  }

  delete workflow.active;

  const url = `${N8N_BASE_URL.replace(/\/$/, '')}/workflows`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': N8N_API_KEY
    },
    body: JSON.stringify(workflow)
  });

  const payload = await resp.json().catch(() => ({ raw: 'invalid-json' }));
  if (!resp.ok) throw new Error(`n8n API error (status ${resp.status}): ${JSON.stringify(payload)}`);
  return payload;
}


app.post('/generate', async (req, res) => {
  try {
    console.log('Incoming body:', req.body);
    const prompt = req.body?.prompt;
    if (!prompt) return res.status(400).json({ error: 'prompt is required in JSON body' });

    const raw = await callGeminiStrict(prompt);
    console.log('Gemini raw (trim):', String(raw).slice(0, 1000));

    let workflow;
    try {
      workflow = JSON.parse(raw);
    } catch (err) {
      return res.status(400).json({ error: 'Gemini did not return valid JSON', raw: String(raw).slice(0,2000) });
    }

    workflow.name = workflow.name || 'Generated Workflow';
    workflow.active = !!workflow.active;
    workflow.settings = workflow.settings || {};

    const valid = validateAjv(workflow);
    if (!valid) return res.status(400).json({ error: 'Validation failed', details: validateAjv.errors });

    const created = await createWorkflowInN8N(workflow);
    return res.json({ message: 'Workflow created', n8n: created });

  } catch (err) {
    console.error('ERROR /generate:', err?.message ?? err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});


app.listen(PORT, () => console.log(`→ Generator (Gemini) running on http://localhost:${PORT}`));