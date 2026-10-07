import swaggerJsdoc from 'swagger-jsdoc';

export const openApiSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'WorkBridge API',
      version: '0.1.0',
      description: 'REST API for the WorkBridge freelance project platform.',
    },
    servers: [
      {
        url: 'http://localhost:4000/api/v1',
        description: 'Local development',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/**/*.ts'],
});
