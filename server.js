// express js server file to llm to get context of how the backend works
//pusing 
// server.js - Main Express server file
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { swaggerUi, swaggerDocument } = require('./swagger');


// strictly for local development uncomment this section bellow

// const serviceAccount = require('./servicekey.json');
// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
// });

// for production purpose
// Initialize Firebase Admin with Application Default Credentials
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
});

const app = express();
const port = process.env.PORT || 8080;

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