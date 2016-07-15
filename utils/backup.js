'use strict';

const Promise = require('bluebird');
const fsHelper = require('./fsHelper');
const path = require('path');
const config = require('../lib/config');

const deployDir = config['deploy.dir'];
const backupDir = config['backup.dir'];
const backupMaxSize = config['backup.maxSize'];

module.exports = {

    add: function (absFilePath) {
        var { dir, base } = path.parse(absFilePath),
            absBackupFilePath = `${dir}/${backupDir}/${base}/${Date.now()}.bak`;

        return fsHelper.fs.copyAsync(absFilePath, absBackupFilePath);
    },

    getBackupList: function (absFilePath) {
        var { dir, base } = path.parse(absFilePath),
            absBackupPath = `${dir}/${backupDir}/${base}`;

        return fsHelper.fs.walkAsync(absBackupPath);
    },

    // 恢复到待发布模式
    restore: function (absFilePath, absBackupPath) {
        var { dir, base } = path.parse(absFilePath),
            absDeployFilePath = `${dir}/${deployDir}/${base}`;

        return fsHelper.copyAsync(absBackupPath, absDeployFilePath, {
            clobber: true
        });
    },

    clean: function (absFilePath) {
        var { dir, base } = path.parse(absFilePath),
            absBackupPath = `${dir}/${backupDir}/${base}`;

        return fsHelper.fs.walkAsync(absBackupPath)
            .then(files => files.sort().reverse().slice(backupMaxSize))
            .then(files => {
                if (files.length) {
                    return Promise.all(
                        files.map(file => fsHelper.removeAsync(`${absBackupPath}/${file}`))
                    );
                }
            });
    }

};