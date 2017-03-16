/* global hexo */
/* eslint no-param-reassign:0, strict:0, max-len:0 */
'use strict';

const assert = require('assert');
const jsYaml = require('js-yaml');
const execSync = require('child_process').execSync;
const moment = require('moment-timezone');

const rFrontMatter = /^-{3,}[\r\n](?:((\s*(\S)[^]*?(\S))?\s*)[\r\n])?-{3,}[\r\n]/u;

function parseFrontMatter(text, filePath) {
  const matching = rFrontMatter.exec(text);
  if (! matching) throw new SyntaxError(`Invalid front-matter: ${filePath}`);
  if (! matching[2]) return {};
  if (matching[3] === '{') {
    if (matching[4] !== '}') throw new SyntaxError(`Invalid JSON front-matter: ${filePath}`);
    try {
      return JSON.parse(matching[1]);
    } catch (err) {
      hexo.log.debug(err);
      throw new SyntaxError(`Invalid JSON front-matter: ${filePath}`);
    }
  } else {
    try {
      return jsYaml.safeLoad(matching[1], {
        filename: filePath,
        schema: jsYaml.CORE_SCHEMA
      });
    } catch (err) {
      hexo.log.debug(err);
      throw new SyntaxError(`Invalid YAML front-matter: ${filePath}`);
    }
  }
}

function getGitLogs(filePath, logger) {
  // If the file is created a moment ago, it will be an untracked file, then git can not log it
  try {
    const list = execSync(`git log --follow --format="%aI" -- ${filePath}`).toString().split(/\r?\n/);
    list.pop();
    const gitLogOldest = list.pop();   // may be undefined
    const gitLogNewest = list.shift(); // may be undefined
    return {
      date:    gitLogOldest,
      updated: gitLogNewest
    };
  } catch (err) {
    logger(`"git log" failed for ${filePath}: ${err}`);
    return {};
  }
}

function selectTimestamp(name, data, frontMatter, gitLogs, filePath, timezone, logger) {
  const org = data[name];
  const fm = frontMatter[name];
  const git = gitLogs[name];
  assert(org, `BUG: data.${name} should be set: ${filePath}`);
  if (fm) {
    const result = moment.tz(fm, timezone);
    logger(`select front-matter timestamp as "${name}": "${fm}" => "${result && result.format()}" for ${filePath}`);
    if (! result || ! result.isValid()) throw new Error(`Invalid timestamp "${fm}" in front-matter: ${filePath}`);
    assert(result.isSame(org), `BUG: data.${name} should be equal to "${name}" of front-matter: ${filePath}`);
    return result.tz('UTC');
  } else if (git) {
    const result = moment.tz(git, timezone);
    logger(`select git timestamp as "${name}": "${git}" => "${result && result.format()}" for ${filePath}`);
    if (! result || ! result.isValid()) throw new Error(`Invalid timestamp "${git}" in git log: ${filePath}`);
    return result.tz('UTC');
  } else {
    assert(org.isValid(), `BUG: Invalid data.${name}: "${org.format()}" for ${filePath}`);
    return org;
  }
}

hexo.extend.filter.register('before_post_render', data => {
  const logger = hexo.log.debug.bind(hexo.log);
  const timezone = hexo.config.timezone;
  const filePath = data.full_source;
  const frontMatter = parseFrontMatter(data.raw, filePath);
  const gitLogs = getGitLogs(filePath, logger);

  if (! moment.tz.zone(timezone)) throw new Error(`Invalid "timezone" in hexo configuration: "${timezone}"`);


  data.date = selectTimestamp('date', data, frontMatter, gitLogs, filePath, timezone, logger);
  data.updated = selectTimestamp('updated', data, frontMatter, gitLogs, filePath, timezone, logger);

  if (data.date.isAfter(data.updated)) hexo.log.warn(`"data.date" contradicts "data.updated": ${filePath}`);

  return data;
});
