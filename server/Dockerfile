FROM node AS build

WORKDIR /app
COPY ["package*.json*", "./"]
RUN npm install

FROM node:alpine
COPY --from=build /app .
COPY ["*.js", "./"]
RUN mkdir public
ADD ["public", "./public/"]
CMD ["node", "server.js"]
