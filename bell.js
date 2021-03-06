/**
 * Realtime anomalies detection based on statsd, for periodic time series.
 * Copyright (c) 2014 Eleme, Inc. https://github.com/eleme/node-bell
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
 * OR OTHER DEALINGS IN THE SOFTWARE.
 */


var fs = require('fs');
var co = require('co');
var program = require('commander');
var toml = require('toml');
var alerter = require('./lib/alerter');
var analyzer = require('./lib/analyzer');
var cleaner = require('./lib/cleaner');
var configs = require('./lib/configs');
var listener = require('./lib/listener');
var webapp = require('./lib/webapp');
var version = require('./lib/version');
var util = require('./lib/util');

var log = util.log;


co(function *(){
  // argv parsing
  program
  .version(version)
  .usage('<service> [options]')
  .option('-c, --configs-path <c>', 'configs file path')
  .option('-s, --sample-configs', 'generate sample configs file')
  .option('-l, --log-level <l>', 'logging level (1~5 for fatal~debug)',
          function(val){return (parseInt(val, 10) - 1) % 5 + 1;})
  .parse(process.argv);

  log.level(util.logLevels[program.logLevel || 4]);

  if (program.sampleConfigs) {
    log.info('Generate sample.configs.toml to current directory');
    return util.copy(util.path.configs, 'sample.configs.toml');
  }

  var configsPath = program.configsPath || util.path.configs;
  var content = fs.readFileSync(configsPath).toString();
  util.updateNestedObjects(configs, toml.parse(content));

  var name = program.args[0];

  if (!name) {
    // no service name
    program.help();
  }

  var service = {
    cleaner: cleaner,
    listener: listener,
    analyzer: analyzer,
    webapp: webapp,
    alerter: alerter
  }[name];

  if (!service) {
    // invalid service name
    program.help();
  }

  // run service
  yield service.serve();
})();
