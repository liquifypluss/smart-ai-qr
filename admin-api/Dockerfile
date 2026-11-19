FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY database/package.json database/package-lock.json ./database/
COPY admin-api/package.json admin-api/package-lock.json ./admin-api/
RUN npm ci --prefix database --no-audit --no-fund && npm ci --prefix admin-api --no-audit --no-fund
COPY database/src ./database/src
COPY admin-api/src ./admin-api/src
COPY admin-api/tsconfig.json ./admin-api/tsconfig.json
COPY package.json ./package.json
RUN npm run build --prefix admin-api

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
WORKDIR /app
COPY admin-api/package.json admin-api/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/admin-api/dist ./dist
USER node
WORKDIR /app/admin-api
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "../dist/admin-api/src/index.js"]
