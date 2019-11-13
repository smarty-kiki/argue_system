(function () {

    var boards = {};
    var voters = {};
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

    var sumVoteResult = function (rand) {
        var vote_result = {
            left: 0,
            right: 0
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

        if (voters[rand] === undefined) {
            voters[rand] = {};
        }

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
                guid = json.guid;
                voters[rand][guid] = conn;
                vote_infos[rand][guid] = json.select;
            } else {
                boards[rand] = conn;
		log('start board: ' + rand);
            }

            sendJsonToBoard(sumVoteResult(rand));
        });

        conn.on('close', function (conn) {
            delete voters[rand][guid];
            log(request.key + ' closed...');
        });
    });
})();
