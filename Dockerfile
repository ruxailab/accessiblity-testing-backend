# Use the official Node.js image

FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source files (excluding files in .dockerignore)
COPY . .

# Expose the port your app runs on
EXPOSE 8080

# Start the app
CMD ["node", "server.js"]
