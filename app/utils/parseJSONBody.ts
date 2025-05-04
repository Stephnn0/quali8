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
  const { key } = options;

  const body = await request.json();

  if (!key) return schema.parse(body);

  const parsedKey = schema.parse(body[key]);

  return {
    [key]: parsedKey,
    unsafeBody: body,
  };
}

export { parseJSONBody };

type CommonKeys = "code" | "action" | (string & {});
