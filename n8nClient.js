import 'dotenv/config';

const { N8N_BASE_URL, N8N_API_KEY } = process.env;

if (!N8N_BASE_URL || !N8N_API_KEY) {
  // don't throw on import to keep dev flow simple; createWorkflowInN8N will throw if missing.
}


export async function createWorkflowInN8N(workflow) {
  if (!N8N_BASE_URL || !N8N_API_KEY) {
    throw new Error('N8N_BASE_URL or N8N_API_KEY missing in environment');
  }

  const resp = await fetch(`${N8N_BASE_URL}/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': N8N_API_KEY
    },
    body: JSON.stringify(workflow)
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`n8n API error (status ${resp.status}): ${JSON.stringify(data)}`);
  }
  return data;
}
