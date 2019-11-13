(function () {

    var board = null;
    var voters = [];
    var vote_infos = {};

    var port = 4321;
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

    var sumVoteResult = function () {
        var vote_result = {
            left: 0,
            right: 0
        };

      　for (var guid in vote_infos) {
            vote_result[vote_infos[guid]] += 1;
        }

        return vote_result;
    };

    wsServer.on('request', function (request) {
        var conn = request.accept(null, request.origin); 
        var guid;
        log(request.key + ' connected...');

        var sendJsonToBoard = function (json) {
            var msg = JSON.stringify(json);
            board && board.sendUTF(msg);
        };

        var receive = function (e) {
            return JSON.parse(e.utf8Data);
        };

        conn.on('message', function (m) {
            if (m.type !== 'utf8') {
                return;
            }

            var json = receive(m);
            if (json.data.voter) {
                voters[guid] = conn;
            } else {
                board = conn;
            }

            guid = json.data.guid;
            vote_infos[guid] = json.data.select;
          
            sendJsonToBoard(sumVoteResult());
        });

        conn.on('close', function (conn) {
            delete voters[guid];
            log(request.key + ' closed...');
        });
    });
})();
