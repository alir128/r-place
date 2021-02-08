const AWS = require('aws-sdk');
const REGION = process.env.REGION || 'us-east-1'
const ENV_NAME = process.env.ENV_NAME || 'local'
const CANVAS_DIMENSION = process.env.CANVAS_DIMENSION || 1000

function Canvas() {
    AWS.config.update({region: REGION})
    this.dynamoDB = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
    this.tableName = `${ENV_NAME}_Canvas`;
}

module.exports = new Canvas();

Canvas.prototype.add = async function(data) {
    try {
        data = JSON.parse(data);
        var id = (CANVAS_DIMENSION * data.y) + data.x
    
        await this.dynamoDB.put({
            TableName: this.tableName,
            Item: {
                ID: id,
                x: data.x,
                y: data.y,
                color: data.color,
                time: Date.now()
            }
        }).promise();
    
        return id;
    } catch (e) {
        console.log(e)
        throw new Error('Failed to insert into DynamoDB.');
    }
};

Canvas.prototype.get = async function (data) {
    
    var ID = (CANVAS_DIMENSION * data.y) + data.x
    const params = {
        TableName: this.tableName,
        Key: {
            ID: ID,
        },
    };
    try {
        const data = await this.dynamoDB.get(params).promise();
        return data.Item;
    } catch(e){
        throw new Error(`There was an error fetching the data for ID: ${ID} from ${this.tableName}`);
    }
};