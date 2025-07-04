
<template>
  <div class="report-detail">
    <div v-if="isLoading" class="loading">
      <p>Loading report...</p>
    </div>
    
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>
    
    <div v-else class="report-container">
      <h2>Accessibility Report</h2>
      <div class="report-meta">
        <p><strong>URL:</strong> {{ report.url }}</p>
        <p><strong>Date:</strong> {{ formatDate(report.dateTime) }}</p>
      </div>
      
      <div class="report-summary">
        <div class="summary-item" :class="{ 'has-errors': getIssueCounts().errors > 0 }">
          <span class="summary-count">{{ getIssueCounts().errors }}</span>
          <span class="summary-label">Errors</span>
        </div>
        <div class="summary-item" :class="{ 'has-warnings': getIssueCounts().warnings > 0 }">
          <span class="summary-count">{{ getIssueCounts().warnings }}</span>
          <span class="summary-label">Warnings</span>
        </div>
        <div class="summary-item" :class="{ 'has-notices': getIssueCounts().notices > 0 }">
          <span class="summary-count">{{ getIssueCounts().notices }}</span>
          <span class="summary-label">Notices</span>
        </div>
      </div>
      <div v-if="selectedIssue !== null" class="issue-details">
            <h4>Issue Details</h4>
            <div class="detail-item">
              <strong>Type:</strong> {{ report.issues[selectedIssue].type }}
            </div>
            <div class="detail-item">
              <strong>Code:</strong> {{ report.issues[selectedIssue].code }}
            </div>
            <div class="detail-item">
              <strong>Message:</strong> {{ report.issues[selectedIssue].message }}
            </div>
            <div class="detail-item">
              <strong>Context:</strong>
              <pre class="context-code">{{ report.issues[selectedIssue].context }}</pre>
            </div>
            <div class="detail-item" v-if="report.issues[selectedIssue].selector">
              <strong>Selector:</strong> 
              <code>{{ report.issues[selectedIssue].selector }}</code>
            </div>
            <div class="detail-item" v-if="report.issues[selectedIssue].runnerExtras">
              <strong>WCAG Reference:</strong>
              <a 
                :href="report.issues[selectedIssue].runnerExtras.wcagReference" 
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ report.issues[selectedIssue].runnerExtras.wcagReference }}
              </a>
            </div>
          </div>
      <div class="split-view">
        <div class="issues-panel">
          <h3>Issues</h3>
          <ul class="issues-list">
            <li 
              v-for="(issue, index) in report.issues" 
              :key="index"
              class="issue-item"
              :class="{
                'issue-error': issue.type === 'error',
                'issue-warning': issue.type === 'warning',
                'issue-notice': issue.type === 'notice',
                'active': selectedIssue === index
              }"
              @click="selectIssue(index)"
              @mouseover="highlightElement(`issue-${index}`)"
              @mouseout="unhighlightElements()"
            >
              <div class="issue-header">
                <span class="issue-number">{{ index + 1 }}</span>
                <span class="issue-type">{{ issue.type }}</span>
                <span class="issue-code">{{ issue.code }}</span>
              </div>
              <div class="issue-message">{{ issue.message }}</div>
            </li>
          </ul>
        </div>
        
        <div class="webpage-preview">
          <h3>Webpage Preview</h3>
          <div class="preview-container">
            <iframe 
              ref="previewFrame" 
              class="preview-frame" 
              sandbox="allow-same-origin allow-scripts allow-popups"
              title="Modified webpage preview with accessibility issues highlighted"
              :srcdoc="report?.modifiedHtml"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ReportDetail',
  data() {
    return {
      reportId: this.$route.params.id,
      report: null,
      isLoading: true,
      error: null,
      selectedIssue: null
    };
  },
  async mounted() {
    await this.fetchReport();
  },
  methods: {
    async fetchReport() {
      try {
        const response = await axios.get(`http://localhost:3000/api/reports/${this.reportId}`);
        this.report = response.data;
        // Wait for next tick and ensure iframe is loaded
        await this.$nextTick();
        // Add a small delay to ensure iframe is ready
        setTimeout(() => {
          this.renderModifiedHtml();
        }, 100);
      } catch (error) {
        console.error('Error fetching report:', error);
        this.error = 'Failed to load the accessibility report';
      } finally {
        this.isLoading = false;
      }
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString();
    },
    getIssueCounts() {
      if (!this.report) return { errors: 0, warnings: 0, notices: 0 };
      
      return {
        errors: this.report.issues.filter(issue => issue.type === 'error').length,
        warnings: this.report.issues.filter(issue => issue.type === 'warning').length,
        notices: this.report.issues.filter(issue => issue.type === 'notice').length
      };
    },
    selectIssue(index) {
      this.selectedIssue = index;
      this.scrollToIssue(index);
    },
    renderModifiedHtml() {
      if (!this.report?.modifiedHtml || !this.$refs.previewFrame) {
        console.warn('Required data or elements not available');
        return;
      }

      try {
        const frame = this.$refs.previewFrame;
        
        // Add listener for communication between iframe and parent
        frame.addEventListener('load', () => {
          if (!frame.contentWindow || !frame.contentDocument) {
            console.warn('iframe not ready');
            return;
          }

          frame.contentWindow.addEventListener('click', (event) => {
            const issueMarker = event.target.closest('.a11y-issue-marker');
            if (issueMarker) {
              const issueId = issueMarker.getAttribute('data-issue-id');
              const index = parseInt(issueId.replace('issue-', ''));
              this.selectIssue(index);
            }
          });
        });
      } catch (error) {
        console.error('Error setting up iframe:', error);
      }
    },
    scrollToIssue(index) {
      if (!this.report || !this.$refs.previewFrame) return;
      
      const frame = this.$refs.previewFrame;
      const frameDoc = frame.contentDocument || frame.contentWindow.document;
      
      // Find the element with the corresponding issue ID
      const element = frameDoc.querySelector(`[data-issue-id="issue-${index}"]`);
      
      if (element) {
        // Scroll the element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight the element
        this.highlightElement(`issue-${index}`);
      }
    },
    highlightElement(issueId) {
      if (!this.$refs.previewFrame) return;
      
      const frame = this.$refs.previewFrame;
      const frameDoc = frame.contentDocument || frame.contentWindow.document;
      
      // Reset all highlights first
      this.unhighlightElements();
      
      // Find and highlight the specific element
      const element = frameDoc.querySelector(`[data-issue-id="${issueId}"]`);
      
      if (element) {
        element.style.boxShadow = '0 0 0 4px rgba(255, 0, 0, 0.5)';
        element.style.zIndex = '1000';
      }
    },
    unhighlightElements() {
      if (!this.$refs.previewFrame) return;
      
      const frame = this.$refs.previewFrame;
      const frameDoc = frame.contentDocument || frame.contentWindow.document;
      
      // Reset all highlighted elements
      const elements = frameDoc.querySelectorAll('.a11y-issue');
      elements.forEach(el => {
        el.style.boxShadow = '';
        el.style.zIndex = '';
      });
    }
  }
}
</script>

<style scoped>
.report-detail {
  padding: 20px 0;
}

.loading, .error-message {
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.loading {
  background-color: #f8f9fa;
  border: 1px solid #ddd;
}

.error-message {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.report-meta {
  margin-bottom: 20px;
}

.report-summary {
  display: flex;
  margin-bottom: 20px;
}

.summary-item {
  flex: 1;
  padding: 15px;
  border-radius: 4px;
  text-align: center;
  margin-right: 10px;
  background-color: #f8f9fa;
}

.summary-item:last-child {
  margin-right: 0;
}

.summary-count {
  display: block;
  font-size: 24px;
  font-weight: bold;
}

.summary-label {
  display: block;
  font-size: 14px;
  color: #666;
}

.has-errors {
  background-color: #f8d7da;
  color: #721c24;
}

.has-warnings {
  background-color: #fff3cd;
  color: #856404;
}

.has-notices {
  background-color: #d1ecf1;
  color: #0c5460;
}

.split-view {
  display: flex;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.issues-panel {
  width: 50%;
  padding: 15px;
  background-color: #fff;
  border-right: 1px solid #ddd;
  overflow-y: auto;
  height: 600px;
}

.webpage-preview {
  width: 50%;
  background-color: #fff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-container {
  flex: 1;
  overflow: hidden;
  padding: 0 15px 15px;
}

.preview-frame {
  width: 100%;
  height: 540px;
  border: 1px solid #ddd;
  background-color: #fff;
}

.issues-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.issue-item {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.issue-item:hover, .issue-item.active {
  background-color: #f5f5f5;
}

.issue-item.issue-error {
  border-left: 4px solid #dc3545;
}

.issue-item.issue-warning {
  border-left: 4px solid #ffc107;
}

.issue-item.issue-notice {
  border-left: 4px solid #17a2b8;
}

.issue-header {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.issue-number {
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  background-color: #333;
  color: white;
  border-radius: 50%;
  margin-right: 10px;
  font-size: 12px;
}

.issue-type {
  text-transform: uppercase;
  font-size: 12px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 10px;
}

.issue-error .issue-type {
  background-color: #f8d7da;
  color: #721c24;
}

.issue-warning .issue-type {
  background-color: #fff3cd;
  color: #856404;
}

.issue-notice .issue-type {
  background-color: #d1ecf1;
  color: #0c5460;
}

.issue-code {
  font-size: 12px;
  color: #666;
}

.issue-message {
  font-size: 14px;
}

.issue-details {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  margin-top: 20px;
}

.detail-item {
  margin-bottom: 10px;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.context-code {
  padding: 10px;
  background-color: #f1f1f1;
  border-radius: 4px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 150px;
  overflow-y: auto;
}

h3 {
  padding: 15px;
  margin: 0;
  background-color: #f8f9fa;
  border-bottom: 1px solid #ddd;
}
</style>
