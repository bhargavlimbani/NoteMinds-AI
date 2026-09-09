import { Type, type FunctionDeclaration, type Schema } from '@google/genai';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonSchema = Record<string, any>;

const TYPE_MAP: Record<string, Type> = {
  string: Type.STRING,
  number: Type.NUMBER,
  integer: Type.INTEGER,
  boolean: Type.BOOLEAN,
  array: Type.ARRAY,
  object: Type.OBJECT,
};

/**
 * Converts the JSON Schema published by the MCP server (tools/list) into the
 * OpenAPI-style schema Gemini expects for function declarations.
 */
export function jsonSchemaToGeminiSchema(schema: JsonSchema | undefined): Schema | undefined {
  if (!schema || typeof schema !== 'object') return undefined;

  const variants = (schema.anyOf ?? schema.oneOf) as JsonSchema[] | undefined;
  if (Array.isArray(variants)) {
    const nonNull = variants.filter((v) => v.type !== 'null');
    const converted = jsonSchemaToGeminiSchema(nonNull[0]);
    if (converted && nonNull.length !== variants.length) converted.nullable = true;
    if (converted && schema.description) converted.description = schema.description;
    return converted;
  }

  let type = schema.type;
  let nullable = false;
  if (Array.isArray(type)) {
    nullable = type.includes('null');
    type = type.find((t: string) => t !== 'null');
  }

  const out: Schema = { type: TYPE_MAP[type as string] ?? Type.STRING };
  const description: string[] = [];
  if (schema.description) description.push(String(schema.description));
  if (schema.minimum !== undefined) description.push(`minimum ${schema.minimum}`);
  if (schema.maximum !== undefined) description.push(`maximum ${schema.maximum}`);
  if (schema.default !== undefined) description.push(`default ${JSON.stringify(schema.default)}`);
  if (description.length) out.description = description.join('. ');
  if (nullable) out.nullable = true;

  if (Array.isArray(schema.enum) && out.type === Type.STRING) {
    out.enum = schema.enum.map(String);
    out.format = 'enum';
  }
  if (out.type === Type.OBJECT) {
    const properties: Record<string, Schema> = {};
    for (const [key, value] of Object.entries((schema.properties ?? {}) as Record<string, JsonSchema>)) {
      const converted = jsonSchemaToGeminiSchema(value);
      if (converted) properties[key] = converted;
    }
    out.properties = properties;
    if (Array.isArray(schema.required)) {
      const required = schema.required.filter((r: string) => r in properties);
      if (required.length) out.required = required;
    }
  }
  if (out.type === Type.ARRAY) {
    out.items = jsonSchemaToGeminiSchema(schema.items) ?? { type: Type.STRING };
  }
  return out;
}

/**
 * Turns an MCP tool definition into a Gemini function declaration.
 * `hiddenParams` (e.g. userId) are removed so the model never controls them -
 * the backend injects the authenticated user id when the tool is executed.
 */
export function mcpToolToFunctionDeclaration(tool: Tool, hiddenParams: string[] = ['userId']): FunctionDeclaration {
  const input = (tool.inputSchema ?? { type: 'object', properties: {} }) as JsonSchema;
  const properties: Record<string, JsonSchema> = { ...(input.properties ?? {}) };
  for (const hidden of hiddenParams) delete properties[hidden];
  const required = ((input.required ?? []) as string[]).filter((r) => !hiddenParams.includes(r));

  const declaration: FunctionDeclaration = { name: tool.name, description: tool.description ?? '' };
  if (Object.keys(properties).length > 0) {
    declaration.parameters = jsonSchemaToGeminiSchema({ ...input, type: 'object', properties, required });
  }
  return declaration;
}
