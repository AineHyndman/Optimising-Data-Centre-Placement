# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files first to leverage caching
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port Vite runs on (usually 5173)
EXPOSE 5173

# Start the development server with host binding
CMD ["npm", "run", "dev", "--", "--host"]

