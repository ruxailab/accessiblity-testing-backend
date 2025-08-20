# Use Puppeteer's official image which includes Chrome and all dependencies
FROM ghcr.io/puppeteer/puppeteer:22.0.0

# Switch to root user to fix permissions
USER root

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source files (excluding files in .dockerignore)
COPY . .

# Change ownership of the app directory to the pptruser
RUN chown -R pptruser:pptruser /app

# Switch back to pptruser for security
USER pptruser

# Expose the port your app runs on
EXPOSE 8080

# Start the app
CMD ["node", "server.js"]
