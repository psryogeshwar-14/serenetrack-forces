# Use official lightweight Node.js 22 LTS Alpine image
FROM node:22-alpine

# Set working directory inside container
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source code and seed files
COPY server/ ./server/
COPY public/ ./public/
COPY serenetrack-backup-2026-09-21.json ./

# Create data directory for persistent SQLite database
RUN mkdir -p /app/server/data

# Expose default port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Run the server
CMD ["node", "server/server.js"]
