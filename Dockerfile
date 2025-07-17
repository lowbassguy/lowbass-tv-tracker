# Use Node.js runtime
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY simple-backend/package*.json ./simple-backend/

# Install dependencies
RUN npm install
RUN cd simple-backend && npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Expose port (Railway will set PORT environment variable)
EXPOSE 3002

# Start the backend server (which serves the built frontend)
CMD ["npm", "start", "--prefix", "simple-backend"] 