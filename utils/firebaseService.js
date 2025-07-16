// utils/firebaseService.js
// Handles all Firestore interactions for reports

const admin = require('firebase-admin');
const db = admin.firestore();

const collectionName = 'report';  //doc Ref 

/**
 * Adds a new report to Firestore
 * @param {object} firebaseReport - Instance of FirebaseReport
 * @returns {Promise<object>} The Firestore write result
 */
async function addReport(firebaseReport) {
    const reportRef = db.collection(collectionName);
    return await reportRef.add({ ...firebaseReport });
}

/**
 * Finds a report by ReportId
 * @param {string} testId
 * @returns {Promise<{doc: object, data: object}|null>} The Firestore doc and data, or null if not found
 */
async function findReportByTestId(testId) {
    const snapshot = await db.collection(collectionName).where('ReportId', '==', testId).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { doc, data: doc.data() };
}

/**
 * Updates a report document by Firestore doc id
 * @param {string} docId
 * @param {object} updateFields
 * @returns {Promise<void>}
 */
async function updateReport(docId, updateFields) {
    await db.collection(collectionName).doc(docId).update(updateFields);
}

module.exports = {
    addReport,
    findReportByTestId,
    updateReport
};
