import { z } from "zod";

import { ValidationError } from "@/lib/domain/errors";

export function validateRequest<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.infer<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new ValidationError(
      "Request validation failed",
      result.error.issues.map((issue) => ({
        path: issue.path,
        code: issue.code,
        message: issue.message,
      })),
    );
  }

  return result.data;
}

export async function validateJsonRequest<T extends z.ZodType>(
  schema: T,
  request: Request,
): Promise<z.infer<T>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Request body must contain valid JSON");
  }

  return validateRequest(schema, body);
}
