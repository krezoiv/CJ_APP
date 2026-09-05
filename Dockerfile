# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Railway inyecta las variables de entorno configuradas en el servicio como
# build args para un despliegue vía Dockerfile — esto escribe la URL pública
# real del backend directamente en el mecanismo de override ya existente
# (ver src/main.ts / src/assets/runtime-config.js), sin tocar environment.ts
# ni ningún servicio Angular. Vacío por defecto = igual que en local (usa lo
# que ya esté compilado en environment.ts).
ARG API_URL=""
RUN echo "window.__API_URL__ = '${API_URL}';" > src/assets/runtime-config.js

RUN npm run build

# Imagen final: solo Caddy sirviendo los archivos ya compilados — el builder
# `application` de Angular deja el output real en dist/.../browser/, no en
# la raíz de dist/.
FROM caddy:2-alpine AS production
COPY --from=build /app/dist/comercial-jhoel-app/browser /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile
