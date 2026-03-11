FROM gcc:latest

WORKDIR /exc/

ADD . .

RUN sed -i 's/\r$//' /exc/entrypoint.sh && chmod +x /exc/entrypoint.sh

ENTRYPOINT ["/exc/entrypoint.sh"]