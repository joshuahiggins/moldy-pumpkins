const AWS = require('aws-sdk');
const config = require('./config');
const Promise = require('bluebird');

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
AWS.config.setPromisesDependency(Promise);

module.exports.uploadJson = (body, filePath) => {
  const params = {
    Body: body,
    Bucket: config.AWS_BUCKET,
    Key: filePath,
    ACL: 'public-read',
    CacheControl: 'max-age=86400',
    ContentType: 'application/json',
  };

  return s3.putObject(params).promise();
};
