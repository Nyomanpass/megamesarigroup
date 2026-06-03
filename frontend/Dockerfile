# Dockerfile untuk Frontend (React dengan Vite)
FROM node:22-alpine as build

# Set working directory
WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_UPLOADS_URL=/uploads
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_UPLOADS_URL=$VITE_UPLOADS_URL

# Copy package.json dan package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage dengan nginx
FROM nginx:alpine

# Copy built assets dari build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
