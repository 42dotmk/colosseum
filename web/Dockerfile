FROM node:20-alpine AS build-step

ARG VITE_SENATUS_URL=https://senatus.colosseum.dev
ENV VITE_SENATUS_URL=$VITE_SENATUS_URL

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-step /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
