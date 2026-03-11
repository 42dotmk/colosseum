FROM node:20

WORKDIR /exc/

ADD . .

RUN sed -i 's/\r$//' /exc/entrypoint.sh && chmod +x /exc/entrypoint.sh

RUN npm install

RUN npm install -g typescript

ENTRYPOINT ["/exc/entrypoint.sh"]