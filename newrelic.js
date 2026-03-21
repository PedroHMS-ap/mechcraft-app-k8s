'use strict';

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'mechcraft-api'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  agent_enabled: process.env.NEW_RELIC_ENABLED !== 'false',
  distributed_tracing: {
    enabled: true,
  },
  application_logging: {
    enabled: true,
    forwarding: {
      enabled: true,
      max_samples_stored: 10000,
    },
    local_decorating: {
      enabled: true,
    },
    metrics: {
      enabled: true,
    },
  },
  allow_all_headers: true,
  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
  },
  attributes: {
    exclude: [
      'request.headers.authorization',
      'request.headers.cookie',
      'request.headers.x-webhook-token',
      'request.parameters.password',
      'request.parameters.token',
      'response.headers.set-cookie',
    ],
  },
};
