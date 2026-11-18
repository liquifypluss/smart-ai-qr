FROM node:22-alpine AS build
WORKDIR /app
COPY database/package.json database/package-lock.json ./database/
COPY server/package.json server/package-lock.json ./server/
RUN npm ci --prefix database --no-audit --no-fund && npm ci --prefix server --no-audit --no-fund
COPY database/src ./database/src
COPY server/src ./server/src
COPY server/tsconfig.json ./server/tsconfig.json
COPY src/config/business.ts ./src/config/business.ts
COPY src/review/phrases.ts ./src/review/phrases.ts
RUN npm run build --prefix server

FROM node:22-alpine
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/server/dist ./dist
COPY src/assets ./src/assets
USER node
WORKDIR /app/server
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "../dist/server/src/index.js"]
