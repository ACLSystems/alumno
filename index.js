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

app.set('port', process.env.PORT || 3050);

var server = app.listen(app.get('port'),() => {
  console.log('Listening on port ' + server.address().port);
  logger.info('Listening on port ' + server.address().port);
});
