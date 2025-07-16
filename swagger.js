// swagger.js
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const yaml = require('js-yaml');

// Load the YAML file
const swaggerDocument = yaml.load(fs.readFileSync('./swagger/swagger.yaml', 'utf8'));

module.exports = {
  swaggerUi,
  swaggerDocument,
};
