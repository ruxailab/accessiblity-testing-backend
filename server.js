// server.js - Main Express server file for accessibility testing
const express = require('express');
const cors = require('cors');
const { swaggerUi, swaggerDocument } = require('./swagger');

const app = express();
const port = process.env.PORT || 4321;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


// Use routes
const reportRoutes = require('./routes/reportRoutes');
app.use('/api', reportRoutes);

// Start server
app.listen(port, () => {
    console.log(`Accessibility testing server running `, port);
});