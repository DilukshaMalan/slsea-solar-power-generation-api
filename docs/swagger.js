const swaggerJsdoc = require('swagger-jsdoc');

// Some swagger-jsdoc versions expect "definition", older ones expect
// "swaggerDefinition" — defining the spec once and passing it under
// both keys below makes this work regardless of which version npm installed.
const apiDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SLSEA Solar Generation API',
    version: '1.0.0',
    description:
      'Real-Time Solar Generation Data API for the Sri Lanka Sustainable Energy Authority. ' +
      'NB6007CEM Web API Development coursework.',
  },
  servers: [
    { url: '/', description: 'Current server' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'User login token (from /auth/login) for SLSEA analyst reads, ' +
          'OR a device api_key (issued at installation creation) for reading ingestion.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'NOT_FOUND' },
          message: { type: 'string', example: 'Resource not found.' },
          detail: { type: 'object', nullable: true },
        },
      },
    },
  },
};

const options = {
  definition: apiDefinition,
  swaggerDefinition: apiDefinition,
  // Scans every route file for @openapi JSDoc comment blocks.
  apis: ['./src/routes/*.js'],
};

const spec = swaggerJsdoc(options);

// Safety net: if swagger-jsdoc still produced a spec with no version
// field (very old versions, or apis glob matched nothing), fall back to
// the raw definition merged with an empty paths object so /docs always
// renders something valid instead of erroring.
if (!spec.openapi && !spec.swagger) {
  spec.openapi = '3.0.0';
}
if (!spec.paths) {
  spec.paths = {};
}

module.exports = spec;