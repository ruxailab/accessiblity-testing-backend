# Use Puppeteer's official image which includes Chrome and all dependencies
FROM ghcr.io/puppeteer/puppeteer:22.15.0

# Switch to root user to fix permissions
USER root

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Set Node environment
ENV NODE_ENV=production

# Configure logging (optional: set to 'debug' for troubleshooting)
ENV LOG_LEVEL=info

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
