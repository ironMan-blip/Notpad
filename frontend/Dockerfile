FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run Vite with host set to 0.0.0.0 so it is accessible from outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
