/* jslint node: true */
/* jslint esnext: true */

var AWS = require("aws-sdk");
AWS.config.update({region: "us-east-1"});
const tableName = "HeyHonFeedback";

var dbHelper = function () { };
var docClient = new AWS.DynamoDB.DocumentClient();

dbHelper.prototype.addUser = (userId, profileEmail) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            Item: {
              'UserId' : userId,
              'profileEmail': profileEmail
            }
        };
        docClient.put(params, (err, data) => {
            if (err) {
                console.log("Unable to add user to dynamo =>", JSON.stringify(err))
                return reject("Unable to add user");
            }
            console.log("Saved Data, ", JSON.stringify(data));
            resolve(data);
        });
    });
}

dbHelper.prototype.updateFeedback = (userId, happy) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            Key: {'UserId' : userId},
            UpdateExpression: 'set happy = :h',
            ExpressionAttributeValues: { ':h' : happy}
            
        };
        docClient.update(params, (err, data) => {
            if (err) {
                console.log("Unable to add feedback to user =>", JSON.stringify(err))
                return reject("Unable to add feedback");
            }
            console.log("Saved Data, ", JSON.stringify(data));
            resolve(data);
        });
    });
}

dbHelper.prototype.updateEmail = (userId, profileEmail) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            Key: {'UserId' : userId},
            UpdateExpression: 'set profileEmail = :p',
            ExpressionAttributeValues: { ':p' : profileEmail}

        };
        docClient.update(params, (err, data) => {
            if (err) {
                console.log("Unable to add email to user =>", JSON.stringify(err))
                return reject("Unable to add email");
            }
            console.log("Saved user's email, ", JSON.stringify(data));
            resolve(data);
        });
    });
}


dbHelper.prototype.checkUser = (userId) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            Key: {'UserId': userId}
        }
        docClient.get(params, (err, data) => {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            } 
            console.log("GetItem succeeded:", JSON.stringify(data.Item, null, 2));
            resolve(data.Item)
            
        })
    });
}


module.exports = new dbHelper();