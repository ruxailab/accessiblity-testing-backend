const db = require('./firebase');

async function addTestData() {
    try {
        // Reference to the 'report' collection
        const reportRef = db.collection('report');
        
        // Data to be added
        const testData = {
            data: "hello world",
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Add a new document with a generated ID
        const docRef = await reportRef.add(testData);
        
        console.log('Document written with ID: ', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error adding document: ', error);
        throw error;
    }
}

// Run the function
addTestData()
    .then(docId => console.log('Test data added successfully!'))
    .catch(error => console.error('Failed to add test data:', error));
