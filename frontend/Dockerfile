FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm install

# Copy source files
COPY shared/ ./shared/
COPY frontend/ ./frontend/

# Build shared and frontend
RUN npm run build -w shared
RUN npm run build -w frontend

# Production stage with nginx
FROM nginx:alpine

# Copy built frontend
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
