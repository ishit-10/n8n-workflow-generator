# n8n Workflow Generator
It acts as an intelligent agent that generates a complete, ready-to-run n8n workflow from a single plain-text prompt. It uses Google Gemini API to interpret natural language and constructs the corresponding workflow JSON, which is then automatically created in your n8n instance via the n8n API call.
<br>

## How It Works
* <b>Receive Prompt:</b> The Node.js/Express server exposes a /generate endpoint that accepts a plain text prompt describing the desired automation.

*<b> Generate Workflow with Gemini:</b> The server sends the prompt to the Gemini API. A carefully crafted system instruction is included, which forces the model to return a response formatted as a valid n8n workflow JSON object. This instruction provides a strict schema and examples, ensuring the output is reliable.

* <b>Validate JSON:</b> Before sending the workflow to n8n, the server validates the JSON received from Gemini against a schema. This acts as a crucial quality gate, preventing malformed or incomplete workflows from being created and providing clear errors if the generation fails.

* <b>Create Workflow in n8n:</b> Once validated, the server makes a final API call to your n8n instance, passing the workflow JSON. n8n creates the new workflow, making it available on your dashboard in which we can then add required configurations and details.
<br>

## How It Improves Workflow Creation
* Speed and Efficiency: Go from an idea to a complete, structured workflow in seconds. Skip the manual process of searching for nodes, dragging them onto the canvas, and connecting them one by one.

* Natural Language First: No longer need to know the exact names of n8n nodes. Describe what you want to achieve in plain English, and the agent will find the right tools for the job.

* Accessibility: Lowers the barrier to entry for less technical users. Anyone can create powerful automations without needing to understand the intricacies of the n8n interface.

* Rapid Prototyping: Quickly scaffold complex, multi-step workflows. The generated workflow provides an excellent starting point that can be easily customized and extended.
<br>

# Deployment
## Prerequisites
* Node.js (v18 or higher)

* An n8n instance (self-hosted or cloud)

* Gemini API Key (get one from Google AI Studio)

* n8n API Key (find it in your n8n instance under Settings > API)

### Installation
### 1) Clone the repository and install the dependencies.
```bash
git clone <your-repository-url>
cd <repository-name>
npm install
```

### 2) Environment Setup
Create a .env file in the root of the project ( not commited here)
```
# .env

# Your Gemini API Key from Google AI Studio
GEMINI_API_KEY=""

# The base URL of your n8n instance's API
N8N_BASE_URL="http://localhost:5678/api/v1"

# Your n8n API Key
N8N_API_KEY=""
```

### 3) Running the Server
```
node server.js
```
The server will be running on http://localhost:3000

### 4) Generating a Workflow
To generate a workflow, send a POST request to the /generate endpoint with your prompt in the JSON body.
```
curl -X POST -H "Content-Type: application/json" \
  -d '{"prompt":"Create a workflow that starts with a webhook, then adds a new row to a Google Sheet"}' \
  http://localhost:3000/generate
```
## If successful, you will receive a confirmation message, and the new workflow will instantly appear on your n8n dashboard.








