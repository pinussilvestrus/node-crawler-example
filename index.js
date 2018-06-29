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

// {url: 'xy', children: [{url: 'xyc', children: [..]}], hub: 0, authority: 0}
let urlTreeRoot = tree.parse({url: _url, children: [], hub: 0, authority: 0});
/**
* generates the hubs and authority values of each node (https://de.wikipedia.org/wiki/Hubs_und_Authorities)
* pseudocode: http://www.seomastering.com/wiki/HITS_algorithm
**/
let calculateHubAndAuthorityValues = root => {

  root.walk(node => {
    node.model.hub = 1;
    node.model.authority = 1;
  });

  // iterate k times
  let k = 3;
  let skip = true;
  for (let i = 0; i <= k; i++) {
    root.walk(node => {
      // overcome trivial root
      if (skip) {
        skip = false;
        return;
      }

      // authority, ingoing neighboard = parent
      (node.model.children || []).forEach(c => {
        c.authority += node.model.hub;
      });

      // hub, outgoing neighbors = children
      (node.model.children || []).forEach(c => {
        node.model.hub += c.authority;
      });
    });

    skip = true;
  }
};

/**
 * handles the pretty print of the output stream, print as a tree
 */
let handleOutput = (root, tabbing = 0) => {


  if (tabbing == 0) {
    console.log(`${root.model.url}, a: ${root.model.authority}, h: ${root.model.hub}`);
  } else {
    for(let i = 0; i <= tabbing * 2; i++) process.stdout.write(" ");
    console.log(`|--- ${root.model.url}, a: ${root.model.authority}, h: ${root.model.hub}`);
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
    calculateHubAndAuthorityValues(urlTreeRoot);
    logger.info(`Found hyperlinks: ${crawledUrls.length}`);
    //console.log(urlTreeRoot.model.url);
    handleOutput(urlTreeRoot);
    console.timeEnd('Crawling time');
  }
});