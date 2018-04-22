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
let urlTreeRoot = tree.parse({url: _url, children: []});
/**
 * handles the pretty print of the output stream, print as a tree
 */
let handleOutput = (root, tabbing = 0) => {
  if (tabbing == 0) {
    console.log(root.model.url);
  } else {
    for(let i = 0; i <= tabbing * 2; i++) process.stdout.write(" ");
    console.log(`|--- ${root.model.url}`);
  }

  tabbing++;

  root.children.forEach(node => {
    handleOutput(node , tabbing);
  });
}

console.time('Crawling time'); // start timer

let crawler = new Crawler().configure({ignoreRelative: false, depth: _depth});
logger.info(`Start crawling '${_url}' with depth ${_depth} ...`);
crawler.crawl({
  url: commander.url,
  success: page => {
    let newUrl = tree.parse({url: page.url, children: []});

    // add to correct referer node
    let refererNode = urlTreeRoot.first(function(node) {
      return node.model.url === page.referer;
    });

    (refererNode || urlTreeRoot).addChild(newUrl);
  },
  failure: page => {
    logger.error(`Error on page '${page.url}' with status ${page.status}`);
  },
  finished: crawledUrls => {
    logger.info(`Found hyperlinks: ${crawledUrls.length}`);
    //console.log(urlTreeRoot.model.url);
    handleOutput(urlTreeRoot);
    console.timeEnd('Crawling time');
  }
});