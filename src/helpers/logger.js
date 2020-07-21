
const winston = require('winston');

const { createLogger, transports } = winston;

const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.align(),
    winston.format.printf(
        info => `${info.timestamp} ${info.level}: ${info.message}`
    )
)

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.align(),
    winston.format.printf(
        info => `${info.timestamp} ${info.level}: ${info.message}`
    )
)


const logger = createLogger({
  format: fileFormat,
  transports: [
    new transports.Console({format:consoleFormat}),
    new winston.transports.File(
        {
            filename: 'Logs/error.log',
            level: 'error',
            handleExceptions: true,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }
    ),
    new winston.transports.File(
        {
            filename: 'Logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
  ]
})

module.exports = logger;