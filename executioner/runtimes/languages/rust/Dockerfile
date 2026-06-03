FROM rust:1.67

RUN apt-get update && apt-get install -y --no-install-recommends time && rm -rf /var/lib/apt/lists/*

WORKDIR /exc/

ADD . .

RUN sed -i 's/\r$//' /exc/entrypoint.sh && chmod +x /exc/entrypoint.sh

ENTRYPOINT ["/exc/entrypoint.sh"]