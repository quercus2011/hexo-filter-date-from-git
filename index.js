/* global hexo */
/* eslint no-param-reassign:0, strict:0 */
'use strict';

const path = require('path');
const execSync = require('child_process').execSync;
const moment = require('moment-timezone');

hexo.extend.filter.register('before_post_render', data => {
  const originDate = data.date;
  const gitDate = getDate(data);
  if (gitDate && gitDate < originDate) {
    data.date = gitDate;
  }

  const originUpdated = data.updated;
  const gitUpdated = getUpdated(data);
  if (gitUpdated && gitUpdated < originUpdated) {
    data.updated = gitUpdated;
  }

  return data;
});

function getDate(data) {
  const filePath = getFilePath(data);
  const log = execSync(`git log --follow --format="%ad" -- ${filePath}`).toString().trim();
  const date = log.slice(log.lastIndexOf('\n') + 1);
  // If the file is created a moment ago, it will be an untracked file, then git can not log it
  if (date === '') {
    return undefined;
  }
  return moment(new Date(date));
}

function getUpdated(data) {
  const filePath = getFilePath(data);
  const updated = execSync(`git log --follow -1 --format="%ad" -- ${filePath}`).toString().trim();
  if (updated === '') {
    return undefined;
  }
  return moment(new Date(updated));
}

function getFilePath(data) {
  return path.resolve(hexo.config.source_dir, data.source);
}
