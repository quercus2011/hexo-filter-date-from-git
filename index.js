/* global hexo */
/* eslint no-param-reassign:0, strict:0 */
'use strict';

const yaml = require('yaml-front-matter');
const execSync = require('child_process').execSync;
const moment = require('moment-timezone');

hexo.extend.filter.register('before_post_render', data => {
  const frontMatter = yaml.loadFront(data.raw);
  const filePath = data.full_source;

  if (! frontMatter.date) {
    const originDate = data.date;
    const gitDate = getDateOfOldestGitLog(filePath, '');
    if (gitDate && gitDate < originDate) {
      data.date = gitDate;
    }
  }

  if (! frontMatter.updated) {
    const originUpdated = data.updated;
    const gitUpdated = getDateOfOldestGitLog(filePath, '-1');
    if (gitUpdated && gitUpdated < originUpdated) {
      data.updated = gitUpdated;
    }
  }

  return data;
});

function execSyncCasually(command) {
  try {
    return execSync(command);
  } catch(err) {
    return '';
  }
}

function getDateOfOldestGitLog(filePath, opt) {
  const log = execSyncCasually(`git log --follow ${opt} --format="%ad" -- ${filePath}`).toString().trim();
  const date = log.slice(log.lastIndexOf('\n') + 1);
  // If the file is created a moment ago, it will be an untracked file, then git can not log it
  if (date === '') {
    return undefined;
  }
  return moment(new Date(date));
}
