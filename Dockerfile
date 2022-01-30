FROM node:16

WORKDIR /app

COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json
COPY ./tsconfig.json /app/tsconfig.json

RUN npm i -g typescript

ENTRYPOINT [ "node", "/app/dist" ]