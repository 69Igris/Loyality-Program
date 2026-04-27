import { ZodError } from 'zod';

// Wrap a Zod schema to validate req.body. On failure, returns 400 with field-level errors.
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Invalid request body.',
          fields: error.errors.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      next(error);
    }
  };
}
