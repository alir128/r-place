const TIMEOUT = process.env.IP_TIMEOUT || 300
const CANVAS_DIMENSION = process.env.CANVAS_DIMENSION || 1000
const CANVAS_KEY = 'canvas'

const Redis_handlers = {
    // get single x,y from redis
    async getXY(data, redis) {
        let color;
        try {
            if (checkDataForGet(data)) {
                var offset = (CANVAS_DIMENSION * data.y) + data.x;
                color = await redis.bitfield([CANVAS_KEY, 'GET', 'u24', '#' + offset])
                return color
            }
        } catch (e) {
            console.log(e)
            throw new Error("There was an error fetching data from Redis");
        }
        return color
    },
    // putXY() x,y update redis canvas state.
    async putXY(data, redis) {
        try {
            data = JSON.parse(data);
            if(checkDataForPut(data)) {
                // calculate the list index
                var offset = (CANVAS_DIMENSION * data.y) + data.x;
                await redis.bitfield([CANVAS_KEY, 'SET', 'u24', '#' + offset, data.color])
                return true
            }
        } catch (e) {
            console.log(e)
            throw new Error("There was an error putting data to Redis");
        }
        return false
    },
    // place ip address for 300s timeout
    async putIP(address, redis) {
        console.log(`Putting address ${address} in timeout list`)
        await redis.set([address, 0, 'EX', TIMEOUT])
    },
    // check if ip address 300s timeout expired or not.
    async checkIP(address, redis) {
        var timeout = await redis.ttl(address)
        if (timeout == -2) return {status: true}
        return {status: false, timeout: timeout}
    },
    // return the canvas.
    async getCanvas(redis) {
        let canvas
        try {
            canvas = await redis.getBuffer(CANVAS_KEY)
            if (!canvas) {
                // init redis bit field.
                var offset = (CANVAS_DIMENSION * (CANVAS_DIMENSION-1)) + (CANVAS_DIMENSION-1);
                redis.bitfield([CANVAS_KEY, 'SET', 'u24', '#' + offset, 16777215])
            }
            canvas = await redis.getBuffer(CANVAS_KEY)
        } catch(e) {
            console.log(e)
        }
        return canvas
    }
}
function checkDataForPut(data) {
    let valid = false
    try {
        valid = data.color > -1 && data.x > -1 && data.y > -1 && data.color < 16777216 && data.x < CANVAS_DIMENSION && data.y < CANVAS_DIMENSION
    } catch (e) {
        console.log(e)
    }
    return valid
}
function checkDataForGet(data) {
    let valid = false
    try {
        valid = data.x && data.y > -1 && data.x && data.y < CANVAS_DIMENSION
    } catch (e) {
        console.log(e)
    }
    return valid
}

module.exports = Redis_handlers;