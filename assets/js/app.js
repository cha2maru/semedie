var channelVM = new Vue({
    el: '#channel-list',
    data: {
        channels: []
    },
    events: {
        'channel:created': function(channel) {
            this.channels.push(channel);
        }
    },
    created: function() {
        var _this = this;

        // サーバに GET /message としてリクエストする
        io.socket.get('/channel', function(res) {
            _this.channels = res;
        });

        // io.socket.on でモデルの変更イベントを監視できる
        io.socket.on('channel', function(event) {
            // event.verb が変更の種類を表す
            switch (event.verb) {
                case 'created': // created: モデルに新たなデータが追加された
                    _this.$emit('channel:created', event.data);
                    break;
            }
        });
    },
    methods: {}
});

var headerVm = new Vue({
    el: '#header',
    data: {},
    events: {},
    created: function() {},
    methods: {
        create: function(event) {
            event.preventDefault(); // submit 時のページ遷移を無効にする

            var _this = this;

            // サーバに POST /message としてリクエストする
            io.socket.post('/channel/subscribe', {
                target: this.target
            }, function(res) {
                if (res.error) {
                    return console.error(res.error);
                }

                _this.$emit('channel:created', res);
            });
        }
    }
});
