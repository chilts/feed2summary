var fs = require('fs');
var http = require('http');
var https = require('https');

var async = require('async');
var sax = require('sax');

var filename = process.argv[2];
var data = fs.readFileSync(filename, 'utf8');

var feeds = data.split(/\n/);
var errors = [];

// save all of the items we find
var items = [];
var debug = function(msg) {
    if ( false ) {
        console.log(msg);
    }
};
var log = function(msg) {
    console.log(msg);
}

async.eachSeries(
    feeds,
    function(feed, done) {
        // if we're in development mode, just fetch one in every 20 feeds
        // if ( process.env.NODE_ENV === 'development' && Math.random() < 0.98 ) {
        //     return done();
        // }

        // if feed is a blank line, then just done()
        if ( !feed.match(/\S/) ) {
            return done();
        }

        // if feed begins with //, then just done()
        if ( feed.match(/^\s*\#/) ) {
            return done();
        }

        // remember some state when parsing the file
        var type = 'unknown';
        var title;
        var link;
        var text; // the text in the last tag
        var state = 'new';

        log('-------------------------------------------------------------------------------');
        log('Fetching ' + feed);

        // ToDo: create an XML streaming parser and save each item to the 'entries'
        var parser = sax.createStream(false);
        parser.onend = function() {
            log('Finished ' + feed);
        };

        parser.on("opentag", function (node) {
            debug('Detected open tag : ' + node.name);

            if ( type === 'unknown' && node.name === 'RSS' ) {
                log('Detected RSS feed\n');
                type = 'rss';
            }
            if ( type === 'unknown' && node.name === 'FEED' ) {
                log('Detected Atom feed\n');
                type = 'atom';
            }

            // ok, let's look for an ITEM (if rss)
            if ( type === 'rss' && node.name === 'ITEM' ) {
                debug('Detected opening <item>');
                state = 'gotitemstart';
                title = undefined;
                link = undefined;
            }

            // ok, let's look for an <entry> (if atom)
            if ( type === 'atom' && node.name === 'ENTRY' ) {
                debug('Detected opening <entry>');
                state = 'gotitemstart';
                title = undefined;
                link = undefined;
            }

            // let's also look for a <link> (if atom)
            if ( type === 'atom' && state === 'gotitemstart' && node.name === 'LINK' ) {
                debug('Found link : ' + node.attributes.HREF);
                link = node.attributes.HREF;
            }
        });

        parser.on("closetag", function (node) {
            debug('Detected close tag : ' + node);

            // if we have seen an <item>, then we should see a <title> and <link>
            if ( type === 'rss' && state === 'gotitemstart' && node === 'TITLE' ) {
                debug('Saving title : ' + text);
                title = text;
            }
            if ( type === 'rss' && state === 'gotitemstart' && node === 'LINK' ) {
                debug('Saving link : ' + text);
                link = text;
            }

            // if we have seen an <entry>, then we should also see a <title>
            if ( type === 'atom' && state === 'gotitemstart' && node === 'TITLE' ) {
                debug('Saving title : ' + text);
                title = text;
            }
            // (link is an attribute on <entry>, so we've already seen that

            // if we have a </item> then, reset
            if ( type == 'rss' && state === 'gotitemstart' && node === 'ITEM' ) {
                debug('Got </item>, saving item');
                items.push({ title : title, link : link });

                log('* ' + title);
                log('  -> ' + link + "\n");

                // reset some state
                state = 'new';
                title = undefined;
                link = undefined;
            }

            // if we have a </entry> then, reset
            if ( type == 'atom' && state === 'gotitemstart' && node === 'ENTRY' ) {
                debug('Got </entry>, saving item');
                items.push({ title : title, link : link });

                log('* ' + title);
                log('  -> ' + link + "\n");

                // reset some state
                state = 'new';
                title = undefined;
                link = undefined;
            }

        });

        // always save what we have see when we get a text node
        parser.on("text", function (t) {
            debug('Text=' + t);
            text = t;
        });

        // stream each RSS file to the XML Parser
        request(feed, function(err, res) {
            if (err) {
                log('');
                log('' + err + "\n");
                log('Finished ' + feed);
                return done();
            }

            // all good, so pipe into the parser
            res.pipe(parser);
            res.on('end', function() {
                log('Finished ' + feed);
                done();
            });
        });
    },
    function(results) {
        log('-------------------------------------------------------------------------------');
    }
);

function request(url, callback) {
    var protocol;
    if ( url.match(/^http:\/\//) ) {
        protocol = http;
    }
    else if ( url.match(/^https:\/\//) ) {
        protocol = https;
    }
    else {
        return callback(new Error('Unknown protocol'));
    }

    protocol.get(url, function(res) {
        log("Got response " + res.statusCode);

        if ( res.statusCode !== 200 ) {
            return callback(new Error('Status code was not 200'));
        }

        // everything looks ok
        callback(null, res);
    }).on('error', function(e) {
        callback(e);
    });
}
