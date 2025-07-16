// models/firebaseReport.js
// Defines the schema/model for a Firebase accessibility report

class FirebaseReport {
    constructor({ ReportId, ReportUrl, ReportDateTime, ReportIssues, ReportIssueCount, DocumentTitle, ReportModifiedHtml = null }) {
        this.ReportId = ReportId;
        this.ReportUrl = ReportUrl;
        this.ReportDateTime = ReportDateTime;
        this.ReportIssues = ReportIssues;
        this.ReportIssueCount = ReportIssueCount;
        this.DocumentTitle = DocumentTitle;
        this.ReportModifiedHtml = ReportModifiedHtml; // Optional, can be added later
    }
}

module.exports = FirebaseReport;
