const winston = require('winston');
require('winston-daily-rotate-file');
const app = require('./app');

var transport = new(winston.transports.DailyRotateFile) ({
  filename: './logs/log',
  datePattern: 'yyyy-MM-dd.',
  prepend: true,
  localTime: true,
  level: process.env.ENV === 'development' ? 'debug' : 'info'
});

var logger = new(winston.Logger) ({
  transports: [
    transport
  ]
});

app.listen(3050,() => {
  logger.info('Server ready and listenning on port 3050');
});
