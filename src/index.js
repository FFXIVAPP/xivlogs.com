const {
  Server
} = require('hapi');

const Good = require('good');
const Inert = require('inert');
const Vision = require('vision');

const HapiSwagger = require('hapi-swagger');
const Pack = require('../package.json');
const CatboxRedis = require('catbox-redis');

const Limiter = require('./plugins/limiter/');

const fs = require('fs');
const path = require('path');

const CONTROLLER_PATH = './controllers/';

const server = new Server({
  cache: [{
    name: 'redisCache',
    engine: CatboxRedis,
    host: '127.0.0.1',
    partition: 'cache'
  }],
  connections: {
    router: {
      isCaseSensitive: false,
      stripTrailingSlash: true
    },
    routes: {
      cors: {
        credentials: true
      },
      security: {
        xframe: false
      },
      files: {
        relativeTo: __dirname
      },
      validate: {
        options: {
          allowUnknown: true,
          abortEarly: false
        }
      },
      response: {
        modify: true,
        options: {
          stripUnknown: true,
          abortEarly: false
        }
      }
    }
  }
});

const LoggingOptions = require('./configuration/logging.js');

const serverLog = (tags, data = {}) => {
  let loggingResult = data;
  if (server && server.plugins.good) {
    if (data.constructor !== {}.constructor) {
      loggingResult = {
        [typeof loggingResult]: loggingResult
      };
    }
    const loggingItem = {
      messsage: {
        module: Pack.name,
        data: loggingResult
      }
    };
    server.log(tags, loggingItem);
  } else {
    console.log(tags, loggingResult);
  }
};

const handleError = (err, fatal) => {
  serverLog('error', `${err.message}\n${err.stack}`);
  if (fatal) {
    process.exit(1);
  }
};

module.exports = function (startServer = true) {
  server.on('request-error', (request, err) => {
    serverLog('debug', 'request-error');
    handleError(err);
  });
  process.on('uncaughtException', (err) => {
    serverLog('debug', 'uncaughtException');
    handleError(err, true);
  });
  process.on('SIGTERM', () => {
    serverLog('debug', 'shutting down');
    process.exit();
  });
  server.connection({
    host: '0.0.0.0',
    port: 10001
  });
  const plugins = [{
    register: Good,
    options: LoggingOptions
  }, {
    register: Inert
  }, {
    register: Vision
  }, {
    register: HapiSwagger,
    options: {
      documentationPath: '/docs',
      info: {
        title: 'XIVLOGS',
        version: Pack.version
      },
      schemes: ['https']
    }
  }, {
    register: Limiter,
    options: Config.LimiterOptions
  }];
  server.register(plugins, (err) => {
    if (err) {
      serverLog('debug', 'registerError');
      handleError(err, true);
      return;
    }

    // SETUP ROUTES
    fs.readdir(path.resolve(__dirname, CONTROLLER_PATH), (err, files) => {
      if (err) {
        throw err;
      }
      files.forEach((file) => {
        require(path.resolve(__dirname, CONTROLLER_PATH, file)).setupRoutes(server); // eslint-disable-line global-require
      });
    });

    if (startServer) {
      server.start((err) => {
        if (err) {
          serverLog('debug', 'startError');
          handleError(err, true);
          return;
        }
        console.log('Server Running @', server.info.uri);
      });
    }
  });
  return server;
};
