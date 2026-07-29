# --- Base Stage ---
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# --- Development Stage ---
FROM base AS development
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# --- Build Stage ---
FROM base AS build
ARG VITE_BACKEND_URL=""
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN npm run build

# --- Production Stage ---
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
