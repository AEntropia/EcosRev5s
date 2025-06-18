import winston from 'winston';
import 'winston-cloudwatch';

const cloudWatchConfig = {
  logGroupName: 'BackMysqlAWS-Logs',
  logStreamName: 'API-Routes',
  awsRegion: 'us-east-1', 
  jsonMessage: true,
};

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.CloudWatch(cloudWatchConfig)
  ]
});

export default logger;