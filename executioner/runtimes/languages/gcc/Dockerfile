FROM gcc:latest

WORKDIR /exc/

ADD . .

# runner.c is the supervisor that judges a program on CPU time (see the header of that file)
RUN sed -i 's/\r$//' /exc/entrypoint.sh /exc/runner.c && chmod +x /exc/entrypoint.sh && gcc -O2 -o /exc/runner /exc/runner.c -lm

ENTRYPOINT ["/exc/entrypoint.sh"]
