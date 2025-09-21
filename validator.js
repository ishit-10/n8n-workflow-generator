// validator.js
import Ajv from "ajv";
const ajv = new Ajv({ allErrors: true });

const schema = {
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
          position: {
            type: "array",
            items: { type: "number" },
            minItems: 2,
            maxItems: 2
          },
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
const validateAjv = ajv.compile(schema);

export function validateWorkflow(workflow) {
  const valid = validateAjv(workflow);
  if (!valid) return { valid: false, errors: validateAjv.errors };

  const nodeNames = new Set((workflow.nodes || []).map(n => n.name));
  const connectionKeys = Object.keys(workflow.connections || {});
  for (const key of connectionKeys) {
    if (!nodeNames.has(key)) {
      return { valid: false, errors: [{ message: `connection references unknown node "${key}"` }] };
    }
  }
  return { valid: true, errors: null };
}