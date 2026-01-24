FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Install dependencies
RUN npm install

# Copy source files
COPY shared/ ./shared/
COPY backend/ ./backend/

# Build shared and backend
RUN npm run build -w shared
RUN npm run build -w backend

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

RUN npm install --omit=dev

# Copy built files
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist

# Create data directory
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/hookdump.db
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "backend/dist/index.js"]
