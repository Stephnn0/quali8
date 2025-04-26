import type { ZodSchema } from "zod";

async function parseJSONBody<T extends object>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<T>;

async function parseJSONBody<T, K extends CommonKeys>( request: Request, schema: ZodSchema<T>, options: { key: K; }): Promise<{ [P in K]: T; } & { unsafeBody: Record<any,unknown>}>; // prettier-ignore

async function parseJSONBody<T>(
  request: Request,
  schema: ZodSchema<T>,
  options: { key?: string } = {},
) {
  console.log("-------------------------------parseJSONBody");
  const { key } = options;

  console.log("-------------------------------key", key);

  const body = await request.json();

  console.log("-------------------------------body", body);

  console.log("-------------------------------body", body);
  if (!key) return schema.parse(body);

  const parsedKey = schema.parse(body[key]);

  console.log("-------------------------------parsedKey", parsedKey);
  return {
    [key]: parsedKey,
    unsafeBody: body,
  };
}

export { parseJSONBody };

type CommonKeys = "code" | "action" | (string & {});
