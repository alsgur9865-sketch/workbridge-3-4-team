import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '@/config/env';
import { AppError } from '@/errors/AppError';
import { logger } from '@/lib/logger';

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  void _request;
  void _next;

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request data is invalid.',
        details: error.flatten(),
      },
    });
    return;
  }

  logger.error({ error }, 'Unhandled application error');

  response.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      ...(env.NODE_ENV === 'development' && error instanceof Error
        ? { details: error.message }
        : {}),
    },
  });
};