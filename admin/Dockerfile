FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./package.json
COPY admin/package.json admin/package-lock.json ./admin/
RUN npm ci --prefix admin --no-audit --no-fund
COPY design-system/aibawaal-super-admin/tokens.css ./design-system/aibawaal-super-admin/tokens.css
COPY admin ./admin
ARG VITE_ADMIN_API_ORIGIN
ARG VITE_PUBLIC_API_ORIGIN
ARG VITE_CUSTOMER_ORIGIN
RUN test -n "$VITE_ADMIN_API_ORIGIN" && npm run build --prefix admin

FROM nginx:1.27-alpine
COPY admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD wget -qO- http://127.0.0.1:8080/health || exit 1
