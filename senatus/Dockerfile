FROM node:20-alpine AS builder

WORKDIR /app

COPY lib lib
COPY senatus senatus

WORKDIR /app/lib/queue
RUN npm install
RUN npm run build


WORKDIR /app/senatus
RUN npm install
RUN npm run build

ENV NODE_ENV=production

CMD npm start