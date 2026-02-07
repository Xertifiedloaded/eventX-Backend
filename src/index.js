const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');

let server;
const PORT = process.env.PORT || config.port || 3000;

mongoose
  .connect(config.mongoose.url, config.mongoose.options)
  .then(() => {
    logger.info('Connected to MongoDB');

    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error('MongoDB connection error:', err);
    process.exit(1); 
  });

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close(() => {
      logger.info('Server closed due to SIGTERM');
    });
  }
});
