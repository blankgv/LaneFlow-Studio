FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./

FROM base AS deps
RUN npm install

FROM deps AS build
ARG API_BASE_URL
ARG WS_BASE_URL
ENV API_BASE_URL=${API_BASE_URL}
ENV WS_BASE_URL=${WS_BASE_URL}
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=build /app/dist/laneflow-studio/browser ./
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
