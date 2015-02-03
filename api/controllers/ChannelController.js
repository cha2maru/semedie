/**
 * ChannelController
 *
 * @description :: Server-side logic for managing channels
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
    subscribe: function(req, res) {
        // console.log(req.params());
        console.log(req);

        var feedurl = "http://www.nicovideo.jp/ranking/fav/daily/all?rss=2.0&lang=ja-jp";
        var channelid = 0;

        FeedService.subscribe(feedurl, function(event, data) {
            var result = {};

            switch (event) {
                case 'Channel':
                    console.log('Channel');
                    console.log(data);
                    Channel.findOrCreate({
                        xmlurl: data.xmlurl
                    }, data).exec(function(err, r) {
                        // console.log(r);
                        channelid = r.id;
                        Channel.findOne(channelid)
                            .populate('episodes')
                            .exec(function(err, result) {
                                // console.log(result);
                                console.log('getchannel:' + result.id);
                                Channel.publishCreate(result);
                                res.json(result);
                            });
                    });
                    break;
                case 'Episode':
                    data.owner = channelid;
                    Episode.findOrCreate({
                        owner: data.owner,
                        link: data.link
                    }, data).exec(function(err, r) {
                        if(err) console.error(err);
                        // console.log('item');
                    });
                    // console.log(data);
                    break;
                case 'end':
                    console.log('done:' + channelid);
                    break;
                case 'error':
                    console.error('error:' + channelid);
                    break;
                default:
            }
        });
    },
};
