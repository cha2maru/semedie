/**
 * Channel.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

module.exports = {

    attributes: {
        title: 'string',
        description: 'string',
        link: 'string',
        date: 'date',
        xmlurl: 'string',
        // image: 'string',
        episodes: {
            collection: 'episode',
            via: 'owner'
        }
    }
};
