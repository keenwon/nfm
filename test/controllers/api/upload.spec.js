'use strict';

const path = require('path');
const koa = require('koa');
const router = require('koa-router')();
const fs = require('fs-extra');
const FormData = require('form-data');
const { upload } = require('../../fetch');
const proxyquire = require('proxyquire').noPreserveCache();
const basePath = '/tmp/nfm-test';
const stubs = {
    '../config': {
        'fs.base': basePath,
        '@global': true
    }
};
const uploadApi = proxyquire('../../../controllers/api/upload', stubs);
const bodyParser = require('../../../lib/bodyParser');
const apiParser = require('../../../lib/apiParser');

const config = require('../../../config');
const uploadDir = config['upload.dir'];
const deployDir = config['deploy.dir'];

const mocha = require('mocha');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.should();
chai.use(chaiAsPromised);

const filesPath = path.resolve(__dirname, '../../files');
const fsExists = p => fs.existsSync(path.join(basePath, p));

describe('fs upload测试', function () {

    before('before upload测试', function () {
        // 系统启动的时候,默认会确认uploadDir存在
        // 运行测试的时候会被前面的测试删除
        // 这里单独创建一次
        fs.ensureDirSync(`${basePath}/${uploadDir}`);
        fs.copySync(path.resolve(__dirname, '../../files'), `${basePath}`);
    });

    after('after upload测试', function () {
        fs.removeSync(basePath);
    });

    beforeEach(function () {
        var app = koa();

        app.use(bodyParser);

        router.all('*', apiParser);
        router.post('/api/upload', uploadApi);

        app.use(router.routes());

        this.server = app.listen(8888);
    });

    afterEach(function () {
        this.server.close();
    });

    it('# 入参测试:path省略', function (done) {
        var form = new FormData(),
            headers = form.getHeaders();

        upload(`http://localhost:8888/api/upload`, form, headers)
            .then(response => {
                response.message.should.equal('入参错误');
                done();
            });
    });

    it('# 入参测试:path不存在', function (done) {
        var form = new FormData(),
            headers = form.getHeaders();

        form.append('path', '/aaaaa');

        upload(`http://localhost:8888/api/upload`, form, headers)
            .then(response => {
                response.message.should.equal('路径不存在');
                done();
            });
    });

    it('# 入参测试:path安全:安全path不存在', function (done) {
        var form = new FormData(),
            headers = form.getHeaders();

        form.append('path', '/dir1/../../../../aaaaa');

        upload(`http://localhost:8888/api/upload`, form, headers)
            .then(response => {
                response.message.should.equal('路径不存在');
                done();
            });
    });

    it('# 入参测试:path安全:安全path存在', function (done) {
        var form = new FormData(),
            headers = form.getHeaders();

        form.append('path', '/dir1/../../../../../dir1');
        form.append('files', fs.createReadStream(`${filesPath}/.hiddenfile1.js`));

        upload(`http://localhost:8888/api/upload`, form, headers)
            .then(() => {
                if (fsExists('/dir1/.hiddenfile1.js')) {
                    done();
                }
            });
    });

    it('# 入参测试:path安全:安全path为nfm系统目录', function (done) {
        var form = new FormData(),
            headers = form.getHeaders();

        form.append('path', `/dir1/../../../../${deployDir}`);

        upload(`http://localhost:8888/api/upload`, form, headers)
            .then(response => {
                response.message.should.equal('路径不存在');
                done();
            });
    });

    it('# 入参测试:path安全:安全path非目录', function (done) {
        var form = new FormData(),
            headers = form.getHeaders();

        form.append('path', '/dir1/../../../../../file1.js');
        form.append('files', fs.createReadStream(`${filesPath}/deploy1.js`));

        upload(`http://localhost:8888/api/upload`, form, headers)
            .then(response => {
                response.message.should.equal('路径必须是目录');
                done();
            });
    });

    it('# 入参测试:files省略', function (done) {
        var form = new FormData(),
            headers = form.getHeaders();

        form.append('path', '/dir1');

        upload(`http://localhost:8888/api/upload`, form, headers)
            .then(response => {
                response.message.should.equal('files字段为空');
                done();
            });
    });

    it('# 入参测试:files参数错误', function (done) {
        var form = new FormData(),
            headers = form.getHeaders();

        form.append('path', '/dir1');
        form.append('filessssss', fs.createReadStream(`${filesPath}/deploy1.js`));

        upload(`http://localhost:8888/api/upload`, form, headers)
            .then(response => {
                response.message.should.equal('files字段为空');
                done();
            });
    });

    it('# 上传:文件名不合法', function (done) {
        var form = new FormData(),
            headers = form.getHeaders();

        fs.writeFileSync(`${basePath}/测试.txt`, '');

        form.append('path', '/dir1');
        form.append('files', fs.createReadStream(`${basePath}/测试.txt`));

        upload(`http://localhost:8888/api/upload`, form, headers)
            .then(response => {
                response.message.should.equal('无效文件名:"测试.txt"');
                done();
            });
    });

    it('# 上传:1个文件', function (done) {
        var form = new FormData(),
            headers = form.getHeaders();

        form.append('path', '/dir1');
        form.append('files', fs.createReadStream(`${filesPath}/.hiddenfile2.js`));

        upload(`http://localhost:8888/api/upload`, form, headers)
            .then(() => {
                if (fsExists('/dir1/.hiddenfile2.js')) {
                    done();
                }
            });
    });

    it('# 上传:2个文件', function (done) {
        var form = new FormData(),
            headers = form.getHeaders();

        form.append('path', '/dir1');
        form.append('files', fs.createReadStream(`${filesPath}/backup1.js`));
        form.append('files', fs.createReadStream(`${filesPath}/backup2.js`));

        upload(`http://localhost:8888/api/upload`, form, headers)
            .then(() => {
                if (fsExists('/dir1/backup1.js')
                    && fsExists('/dir1/backup2.js')) {
                    done();
                }
            });
    });

    it('# 上传:3个文件', function (done) {
        var form = new FormData(),
            headers = form.getHeaders();

        // service/uploader的部分代码
        // 只有三个以上files和fields才能覆盖带
        form.append('path', '/dir1');
        form.append('a', 'a1');
        form.append('a', 'a2');
        form.append('a', 'a3');
        form.append('files', fs.createReadStream(`${filesPath}/backup3.js`));
        form.append('files', fs.createReadStream(`${filesPath}/deploy1.js`));
        form.append('files', fs.createReadStream(`${filesPath}/deploy2.js`));

        upload(`http://localhost:8888/api/upload`, form, headers)
            .then(() => {
                if (fsExists('/dir1/backup3.js')
                    && fsExists('/dir1/deploy1.js')
                    && fsExists('/dir1/deploy2.js')) {
                    done();
                }
            });
    });

    it('# 上传:文件不存在,直接发布', function (done) {
        var form = new FormData(),
            headers = form.getHeaders();

        form.append('path', '/dir1');
        form.append('files', fs.createReadStream(`${filesPath}/deploy_backup1.js`));

        upload(`http://localhost:8888/api/upload`, form, headers)
            .then(() => {
                if (fsExists('/dir1/deploy_backup1.js')
                    && !fsExists(`/dir1/${deployDir}/deploy_backup1.js`)) {
                    done();
                }
            });
    });

    it('# 上传:文件存在,待发布模式', function (done) {
        var form = new FormData(),
            headers = form.getHeaders();

        form.append('path', '/dir1');
        form.append('files', fs.createReadStream(`${filesPath}/file2.js`));

        upload(`http://localhost:8888/api/upload`, form, headers)
            .then(() => {
                if (fsExists('/dir1/file2.js')
                    && fsExists(`/dir1/${deployDir}/file2.js`)) {
                    done();
                }
            });
    });

});