FROM golang:alpine

RUN apk add --no-cache docker-cli

WORKDIR /app

COPY colosseum colosseum

CMD [ "ls","-la" ]

ENTRYPOINT [ "ls","-la" ]