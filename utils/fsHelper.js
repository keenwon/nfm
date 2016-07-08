'use strict';

const fs = require('../lib/fs');
const config = require('../lib/config');
const path = require('path');
const moment = require('moment');
const filesize = require('filesize');
const crypto = require('crypto');

const basePath = config['fs.base'];

function md5(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}

function getFileType(mode) {
    switch (mode & 0o170000) {
        case 0o100000:
            return 'f';
        case 0o040000:
            return 'd';
        default:
            return '-';
    }
}

module.exports = {

    /**
     * 获取文件(夹)列表
     */
    getFileList: function (dir, types) {
        return fs.readdirSync(dir)
            .filter(filename => !!filename.indexOf('.'))
            .map(filename => this.getFileStat(path.resolve(dir, filename)))
            .filter(obj => types.includes(obj.type));
    },

    /**
     * 获取文件信息
     */
    getFileStat: function (filePath) {
        const stats = fs.statSync(filePath);

        return {
            id: md5(filePath), // TODO: 临时方案
            name: path.basename(filePath),
            extname: path.extname(filePath),
            path: '/' + path.relative(basePath, filePath),
            size: filesize(stats.size),
            createAt: moment(stats.birthtime).format('YY-MM-DD HH:mm:ss'),
            updateAt: moment(stats.mtime).format('YY-MM-DD HH:mm:ss'),
            type: getFileType(stats.mode)
        }
    },

    /**
     * 将path解析为基于base路径的绝对地址
     */
    resolvePath: function (p) {
        return p ? path.join(basePath, path.resolve('/', p)) : null;
    },

    /**
     * 创建文件夹
     */
    mkdir: function (dir) {
        return fs.mkdirAsync(this.resolvePath(dir));
    }

};