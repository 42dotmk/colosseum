FROM node:20-alpine as build-step

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

RUN npm run build-prod

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-step /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
