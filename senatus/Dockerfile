FROM node:20-alpine AS builder

WORKDIR /app

COPY . .

RUN npm install

RUN npm run build

ENV NODE_ENV=production

CMD npm start