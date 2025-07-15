// express js server file to llm to get context of how the backend works
//pusing 
// server.js - Main Express server file
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
let firebaseConfig;

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Running in GCP or with env var set: use application default
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
} else {
    // Running locally: use service account key
    const serviceAccount = require('./servicekey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve modified HTML files
const path = require('path');
const modifiedHtmlDir = path.join(__dirname, 'modified_html');
app.use('/modified_html', express.static(modifiedHtmlDir));

// Use routes
const reportRoutes = require('./routes/reportRoutes');
app.use('/api', reportRoutes);

// Start server
app.listen(port, () => {
    console.log(`Accessibility testing server running `);
});