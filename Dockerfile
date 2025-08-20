# Use Puppeteer's official image which includes Chrome and all dependencies
FROM ghcr.io/puppeteer/puppeteer:22.0.0

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source files (excluding files in .dockerignore)
COPY . .

# Expose the port your app runs on
EXPOSE 8080

# Start the app
CMD ["node", "server.js"]
