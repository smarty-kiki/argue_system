(function () {

    function getJsonLength(jsonData)
    {
        var length = 0;
        for (var ever in jsonData) {
            length++;
        }
        return length;
    }

    var boards = {};
    var board_request_keys = {};
    var vote_infos = {};
    var board_totals = {};

    var port = 50000;
    var webSocketServer = require('websocket').server;
    var http = require('http'); 
    var log = function (str) {
        console.log(new Date() + " " + str);
    };

    var httpServer = http.createServer(function () {});
    httpServer.listen(port, function () {
        log("Listening on port " + port);
    });

    var wsServer = new webSocketServer({
        httpServer: httpServer
    });

    var sumVoteResult = function (rand) {
        var vote_result = {
            left: 0,
            right: 0,
            vote_infos: vote_infos[rand]
        };

      　for (var guid in vote_infos[rand]) {
            vote_result[vote_infos[rand][guid]] += 1;
        }

        return vote_result;
    };

    wsServer.on('request', function (request) {
        var conn = request.accept(null, request.origin); 
        var guid, rand = request.resource;
        log(request.key + ' connected...');

        if (vote_infos[rand] === undefined) {
            vote_infos[rand] = {};
        }

        var sendJsonToBoard = function (json) {
            var msg = JSON.stringify(json);
            if (boards[rand]) {
                boards[rand].sendUTF(msg);
                log('board ' + rand + ' result sync: ' + msg);
            }
        };

        var sendJsonToConn = function (json, conn) {
            var msg = JSON.stringify(json);
            conn.sendUTF(msg);
            log('board ' + rand + ' conn send: ' + msg);
        };

        var receive = function (e) {
            var tmp = JSON.parse(e.utf8Data);
            log('receive board ' + rand + ' guid ' + tmp.guid + ' data: ' + e.utf8Data);
            return tmp;
        };

        conn.on('message', function (m) {
            if (m.type !== 'utf8') {
                return;
            }

            var json = receive(m);
            if (json.guid) {
                var len = getJsonLength(vote_infos[rand]);

                guid = json.guid;

                var reg = RegExp(/[a-zA-Z0-9]/);
                if (reg.exec(guid)) {

                  sendJsonToConn({
                    res: 0,
                    msg: '木有邀请你哦'
                  }, conn);

                } else {
                  if (len < board_totals[rand]) {
                    vote_infos[rand][guid] = json.select;

                    sendJsonToConn({
                      res: 1,
                      msg: ''
                    }, conn);
                  } else if (len == board_totals[rand] && vote_infos[rand][guid]) {
                    vote_infos[rand][guid] = json.select;

                    sendJsonToConn({
                      res: 1,
                      msg: ''
                    }, conn);
                  } else {
                    sendJsonToConn({
                      res: 0,
                      msg: '超过了参与投票人数'
                    }, conn);
                  }
                }
            } else {
                boards[rand] = conn;
                board_totals[rand] = json.total;
                board_request_keys[request.key] = true;
                log('start board: ' + rand + ' option total: ' + json.total);
                if (json.vote_infos) {
                  vote_infos[rand] = json.vote_infos;
                  log('retry board: ' + rand + ' init data: ' + JSON.stringify(json.vote_infos));
                }
            }

            sendJsonToBoard(sumVoteResult(rand));
        });

        conn.on('close', function (conn) {
            log(request.key + ' closed...');
            if (board_request_keys[request.key]) {
                delete boards[rand];
                delete board_request_keys[request.key];
                delete vote_infos[rand];
                delete board_totals[rand];
            }
        });
    });
})();
