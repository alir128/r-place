# How to use

```sh
docker build -t ws-rplace .
docker network create rplace
docker run -d --net=rplace --name redis redis
docker run -d --net=rplace --name rplace-server1 -p 3000:80 -e "REDIS_ENDPOINT=redis" ws-rplace
docker run -d --net=rplace --name rplace-server2 -p 3001:80 -e "REDIS_ENDPOINT=redis" ws-rplace

docker container stop rplace-server1
docker container stop rplace-server2
docker container rm rplace-server1
docker container rm rplace-server2
```

test using the following:

```sh
wscat -c ws://localhost:3000
wscat -c ws://localhost:3001
```

send message for example

`'{"x": 101, "y": 102, "color": 16777215 }'`
