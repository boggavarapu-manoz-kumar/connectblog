FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (only production)
RUN npm ci --only=production

# Copy all source files
COPY . .

# Expose API port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
