const AWS = require("aws-sdk")

// URI and other properties could be load by ENV Vars or by property file (.env)
AWS.config.update({
  region: "us-east-1",
  endpoint: "http://localhost:8000"
  })

const dynamodb = new AWS.DynamoDB()

const params = {
    TableName : "local_Canvas",
    KeySchema: [{ AttributeName: "ID" , KeyType: "HASH"}],
    AttributeDefinitions: [{ AttributeName: "ID", AttributeType: "N" }],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
}

dynamodb.createTable(params, console.log)

// aws dynamodb list-tables --endpoint-url http://localhost:8000