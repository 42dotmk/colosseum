FROM alpine 

RUN apk add zig

WORKDIR /exc/

ADD . .

ENTRYPOINT /exc/entrypoint.sh
