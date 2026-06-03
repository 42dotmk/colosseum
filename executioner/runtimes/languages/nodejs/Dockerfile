FROM node:20

RUN apt-get update && apt-get install -y --no-install-recommends time && rm -rf /var/lib/apt/lists/*

WORKDIR /exc/

ADD . .

RUN sed -i 's/\r$//' /exc/entrypoint.sh && chmod +x /exc/entrypoint.sh

RUN npm install

RUN npm install -g typescript

ENTRYPOINT ["/exc/entrypoint.sh"]