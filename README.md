# rss2summary.js #

Simple program to process a list of feeds, fetch them, extract each item (title and link) and print out each item if it
is new.

Deals with both RSS and Atom feeds.

## Example ##

```
$ cat feeds.txt
# Mine
http://chilts.org/blog/atom.xml

# Geek
http://www.kickstarter.com/backing-and-hacking.atom
https://github.com/blog/ship.atom

$ node feed2summary.js feeds.txt
-------------------------------------------------------------------------------
Fetching http://chilts.org/blog/atom.xml
Detected Atom feed
Found 30 item(s)
-------------------------------------------------------------------------------
Fetching http://www.kickstarter.com/backing-and-hacking.atom
Detected Atom feed
Found 2 item(s)
-------------------------------------------------------------------------------
Fetching https://github.com/blog/ship.atom
Detected Atom feed
Found 15 item(s)
-------------------------------------------------------------------------------
[ { url: 'http://chilts.org/blog/atom.xml',
     [ { title: 'Using Queues in a State Machine',
         link: 'http://chilts.org/blog/using-async-queue-as-a-state-machine.html' },
       { title: 'AwsSum\'s Overall Plan',
         link: 'http://chilts.org/blog/awssums-overall-plan.html' } ],
    statusCode: 200,
    total: 30,
    new: 2 },
  { url: 'http://www.kickstarter.com/backing-and-hacking.atom',
    items: [],
    statusCode: 200,
    total: 2,
    new: 0 },
  { url: 'https://github.com/blog/ship.atom',
     [ { title: 'Redesigned merge button',
         link: 'https://github.com/blog/1469-redesigned-merge-button' } ],
    statusCode: 200,
    total: 15,
    new: 1 } ]
-------------------------------------------------------------------------------
```

(Ends)
