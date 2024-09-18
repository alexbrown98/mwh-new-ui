# syntax=docker/dockerfile:1

# Base stage: Build the application
FROM --platform=$BUILDPLATFORM node:22 AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Next.js app
RUN npm run build

# Runtime stage: Create the final image
FROM --platform=$TARGETPLATFORM node:22-slim AS runtime

WORKDIR /app

# Copy necessary files from the builder stage
COPY --from=builder /app ./

# Expose the port the app runs on
EXPOSE 3000

# Start the Next.js app
CMD ["npm", "start"]
