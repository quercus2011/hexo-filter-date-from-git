/* global hexo */
/* eslint no-param-reassign:0, strict:0 */
'use strict';

const path = require('path');
const execSync = require('child_process').execSync;
const moment = require('moment-timezone');

hexo.extend.filter.register('before_post_render', data => {
  const originDate = data.date;
  const gitDate = getDateOfOldestGitLog(data, '');
  if (gitDate && gitDate < originDate) {
    data.date = gitDate;
  }

  const originUpdated = data.updated;
  const gitUpdated = getDateOfOldestGitLog(data, '-1');
  if (gitUpdated && gitUpdated < originUpdated) {
    data.updated = gitUpdated;
  }

  return data;
});

function getDateOfOldestGitLog(data, opt) {
  const filePath = getFilePath(data);
  const log = execSync(`git log --follow ${opt} --format="%ad" -- ${filePath}`).toString().trim();
  const date = log.slice(log.lastIndexOf('\n') + 1);
  // If the file is created a moment ago, it will be an untracked file, then git can not log it
  if (date === '') {
    return undefined;
  }
  return moment(new Date(date));
}

function getFilePath(data) {
  return path.resolve(hexo.config.source_dir, data.source);
}
