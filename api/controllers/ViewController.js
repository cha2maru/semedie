/**
 * ViewController
 *
 * @description :: Server-side logic for managing views
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
    index: function(req, res) {
        Channel.find()
            .exec(function(err, channels) {
                if (err) return res.serverError(err);
                res.view({
                    channels: channels
                });
            });
    },
    detail: function(req, res) {
        Channel.findOne(req.param('id'))
            .populate('episodes')
            .exec(
                function(err, channel) {
                    if (err) return res.serverError(err);
                    // console.log(channel);
                    res.view({
                        channel: channel
                    });
                });
    },
};
