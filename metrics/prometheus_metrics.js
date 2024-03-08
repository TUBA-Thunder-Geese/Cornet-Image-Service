const promClient = require('prom-client');

module.exports = {
    httpRequestDurationMicroseconds: new promClient.Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.1, 0.3, 1, 1.5, 3, 5, 10]
      }),


      syntaxErrorsCounter : new promClient.Counter({
        name: 'syntax_errors_total',
        help: 'Total count of syntax errors in the application',
        labelNames: ['error_type', 'error_message', 'error_stack', 'exact_time', 'service']
      })
}