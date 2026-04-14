FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY src/ ./src/
RUN mkdir -p /app/logs /app/uploads
EXPOSE 5000
USER node
CMD ["node", "src/server.js"]
