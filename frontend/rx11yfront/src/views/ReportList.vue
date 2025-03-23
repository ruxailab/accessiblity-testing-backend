// src/views/ReportsList.vue
<template>
  <div class="reports-list">
    <h2>Accessibility Reports</h2>
    
    <div v-if="isLoading" class="loading">
      <p>Loading reports...</p>
    </div>
    
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>
    
    <div v-else-if="reports.length === 0" class="no-reports">
      <p>No accessibility reports found.</p>
      <router-link to="/" class="btn btn-primary">Run a New Test</router-link>
    </div>
    
    <div v-else class="reports-container">
      <table class="reports-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>URL</th>
            <th>Date</th>
            <th>Issues</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="report in reports" :key="report.id">
            <td>{{ report.id.substring(0, 8) }}...</td>
            <td class="url-cell">{{ truncateUrl(report.url) }}</td>
            <td>{{ formatDate(report.dateTime) }}</td>
            <td class="issues-cell">
              <span class="badge badge-error">{{ report.summary.errors }} Errors</span>
              <span class="badge badge-warning">{{ report.summary.warnings }} Warnings</span>
              <span class="badge badge-notice">{{ report.summary.notices }} Notices</span>
            </td>
            <td>
              <router-link :to="`/report/${report.id}`" class="btn btn-sm btn-primary">
                View
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ReportsList',
  data() {
    return {
      reports: [],
      isLoading: true,
      error: null
    };
  },
  async mounted() {
    await this.fetchReports();
  },
  methods: {
    async fetchReports() {
      try {
        const response = await axios.get('http://localhost:3000/api/reports');
        this.reports = response.data;
      } catch (error) {
        console.error('Error fetching reports:', error);
        this.error = 'Failed to load the accessibility reports';
      } finally {
        this.isLoading = false;
      }
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString();
    },
    truncateUrl(url) {
      if (url.length > 40) {
        return url.substring(0, 40) + '...';
      }
      return url;
    }
  }
}
</script>

<style scoped>
.reports-list {
  padding: 20px 0;
}

.loading, .error-message, .no-reports {
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

.no-reports {
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  text-align: center;
  padding: 30px;
}

.btn {
  display: inline-block;
  padding: 8px 12px;
  border-radius: 4px;
  text-decoration: none;
  cursor: pointer;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.reports-table {
  width: 100%;
  border-collapse: collapse;
}

.reports-table th, 
.reports-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.reports-table th {
  background-color: #f8f9fa;
  font-weight: bold;
}

.reports-table tr:hover {
  background-color: #f5f5f5;
}

.url-cell {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.issues-cell {
  white-space: nowrap;
}

.badge {
  display: inline-block;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  margin-right: 5px;
}

.badge-error {
  background-color: #f8d7da;
  color: #721c24;
}
.badge-warning {
  background-color: #fff3cd;
  color: #856404;
}

.badge-notice {
  background-color: #d1ecf1;
  color: #0c5460;
}
</style>