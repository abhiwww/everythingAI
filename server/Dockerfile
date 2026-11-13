# Everyday AI Concierge — Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy source
COPY src ./src
COPY migrations ./migrations
COPY scripts ./scripts
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Runtime
ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["npm", "start"]
