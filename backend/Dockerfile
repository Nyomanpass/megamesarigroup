# Dockerfile untuk Backend (Node.js)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Native dependencies needed by canvas/chartjs-node-canvas and python-shell.
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconf \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    pixman-dev \
    freetype-dev \
    libpng-dev \
    libreoffice \
    font-noto

# Copy package.json dan package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
