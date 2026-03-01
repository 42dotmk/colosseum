FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /exc/

ADD . .

RUN sed -i 's/\r$//' /exc/entrypoint.sh && chmod +x /exc/entrypoint.sh

ENTRYPOINT ["/exc/entrypoint.sh"]