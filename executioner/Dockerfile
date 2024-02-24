FROM node:alpine

RUN apk add --no-cache docker-cli
RUN npm i -g tsx

WORKDIR /app

ADD executioner executioner
ADD lib lib

WORKDIR /app/lib/queue
RUN npm i 

RUN npm run build

WORKDIR /app/executioner
RUN npm i 

ENTRYPOINT [ "tsx", "index.ts" ]