# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first to leverage cache
COPY package*.json ./

# Copy scripts folder (required for postinstall script)
COPY scripts ./scripts

# Install dependencies
# Note: We install all dependencies including devDependencies for building
RUN npm install

# Copy source code
COPY . .

# Build the React application
RUN npm run build

# Expose the port (WeChat Cloud Hosting usually uses 80)
EXPOSE 80

# Environment variables
ENV PORT=80
ENV NODE_ENV=production
# Ensure data directory exists
ENV DATA_DIR=/app/data

# Start the server
CMD ["npm", "start"]
