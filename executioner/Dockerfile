FROM golang:1.24-alpine AS build

RUN apk add --no-cache ca-certificates git

WORKDIR /src

COPY executioner/go.mod executioner/go.sum ./
RUN go mod download

COPY executioner/. .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/executioner ./main.go

FROM alpine:3.21

RUN apk add --no-cache ca-certificates docker-cli

WORKDIR /app
COPY --from=build /out/executioner /app/executioner

ENTRYPOINT ["/app/executioner"]
