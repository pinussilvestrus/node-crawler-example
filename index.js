let Crawler = require("js-crawler");
let commander = require("commander");
let logger = require("winston-color");
let TreeModel = require('tree-model');
let tree = new TreeModel();

commander
    .version('0.1.0')
    .option('-u, --url <path>', "URL to be crawled")
    .option('-d, --depth <number>', "Depth of web crawling")
    .parse(process.argv);

if (!commander.url) {
  console.error("Please provide a valid URL!");
  return;
}

let _url = commander.url;
let _depth = commander.depth || 2;

// {url: 'xy', children: [{url: 'xyc', children: [..]}]}
let urlTree = tree.parse({url: _url, children: []});

/**
 * handles the pretty print of the output stream
 */
let handleOutput = () => {
  urlTree.walk(node => {
    console.log(node.model.url);
  });
}

let crawler = new Crawler().configure({ignoreRelative: false, depth: _depth});
logger.info(`Start crawling '${_url}' with depth ${_depth} ...`);
crawler.crawl({
  url: commander.url,
  success: page => {
    let newUrl = tree.parse({url: page.url, children: []});
    urlTree.addChild(newUrl);
  },
  failure: page => {
    console.log(page.status);
  },
  finished: crawledUrls => {
    logger.info(`Found hyperlinks: ${crawledUrls.length}`);
    handleOutput();
  }
});