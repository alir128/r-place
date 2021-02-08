const WebSocket = require('ws'),
          Redis = require('ioredis'),
          express = require('express');
const PORT=process.env.PORT || 80;
const REDIS_ENDPOINT=process.env.REDIS_ENDPOINT || 'redis';
const REDIS_PORT=process.env.REDIS_PORT || 6379;
const channel = "messages";
const cache = require('./Redis_handlers')

// INIT Dynamo
let db;
try {
    db = require('./DynamoDB_handlers');
} catch (err) {
    console.log("error connecting to DynamoDB.")
}

// INIT REDIS
let subscriber, publisher;
try {
    subscriber = new Redis(REDIS_PORT, REDIS_ENDPOINT);
    publisher = new Redis(REDIS_PORT, REDIS_ENDPOINT);
} catch (err) {
    console.log("error connecting to redis client.")
    process.exit(1);
}

subscriber.on("error", function(error) {
    console.log("error connecting to redis client exiting.")
    process.exit(1);
});

publisher.on("error", function(error) {
    console.log("error connecting to redis client exiting.")
    process.exit(1);
});

// INIT WEBSERVER AND SOCKET SERVER
const app = express();
app.use(express.json())
const server = require('http').createServer(app);

const wss = new WebSocket.Server({ server }, () => {
    console.log(`Websocket server listening on port ${PORT}`)
});

function noop() {}

function heartbeat() {
    this.isAlive = true;
}

wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', heartbeat);
    ws.on('message', async (data) => {
        var ip = ws._socket.remoteAddress;
        try {
            var jsonMsg = JSON.stringify(
                {
                    "message": data.trim(),
                    "time": new Date().toJSON()
                }
            )
            let checkIp = await cache.checkIP(ip, publisher)
            if(checkIp.status) {
                await cache.putIP(ip, publisher)
                await cache.putXY(data.toString(), publisher) ?
                    publisher.publish(channel, jsonMsg) :
                    ws.send(JSON.stringify({"error": "Invalid input."}));
                if (db) {
                    try {
                        await db.add(data.toString());
                    } catch(e) {
                        console.log(e)
                    }
                }
            } else {
                ws.send(JSON.stringify({"error": `You need to wait ${checkIp.timeout} more seconds before you fill in a new pixel.`}));
            }
        } catch (e) {
            console.log(e)
        }
    });
});

subscriber.on("message",(incomingChannel,message) => {
    if (incomingChannel === channel) {
        try {
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        } catch (e) {
            console.log(e)
        }    
    }
})

subscriber.subscribe(channel);

const interval = setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping(noop);
    });
}, 8000);

wss.on('close', () => {
    clearInterval(interval);
});

// routes
app.get('/ping', (req, res) => {
    console.log('Healthcheck passed.')
    res.status(200).send("ok");
})

app.get('/xy', async (req, res) => {
    try {
        var item = await db.get(req.body.data)
        res.json({ x: item.x , y: item.y, color: {r: (item.color >> 16) & 0xff, g: (item.color >> 8) & 0xff, b: item.color & 0xff}})
    } catch (e) {
        try {
            var color = await cache.getXY(req.body.data, publisher)
            res.json({ x: req.body.data.x , y: req.body.data.y, color: {r: (color[0] >> 16) & 0xff, g: (color[0] >> 8) & 0xff, b: color[0] & 0xff}})
        } catch (e) {
            res.status(404).json({"error": "Bad request."})
            console.log(e);
        }
    }
})

app.get('/canvas', async (req, res) => {
    let canvas
    try {
        canvas = await cache.getCanvas(publisher)
        if (canvas) {
            res.writeHead(200, {
                'Content-Length': canvas.length
            });
            res.end(canvas)
        }
    } catch(e) {
        console.log(e)
        res.status(404).json({"error": "Bad request."})
    }
    
})

app.use(express.static('public'));

app.get('/', function(req, res) {
    res.sendFile('index.html');
});

server.listen(PORT, () => {
    console.log(`Server listening at http://0.0.0.0:${PORT}`)
})