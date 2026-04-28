FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./

FROM base AS deps
RUN npm install

FROM deps AS build
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=build /app/dist/laneflow-studio/browser ./
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 8080
CMD ["/docker-entrypoint.sh"]
