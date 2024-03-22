FROM node:20

WORKDIR /exc/

ADD . .

RUN npm install

RUN npm install -g typescript

ENTRYPOINT /exc/entrypoint.sh