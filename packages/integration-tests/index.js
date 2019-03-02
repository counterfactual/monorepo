const chromedriver = require('chromedriver');
const webdriver = require('selenium-webdriver');
const chrome = require("selenium-webdriver/chrome");
const By = webdriver.By;
const fs = require('fs');

function encode(file) {
  var stream = require('fs').readFileSync(file);
  return new Buffer(stream).toString('base64');
}

function decode(b64String) {
  return new Buffer(b64String, "base64");
}

async function getExtShadowRoot(hostSelector) {
  let shadowHost;
  await (shadowHost = driver.findElement(By.css(hostSelector)));
  return driver.executeScript("return arguments[0].shadowRoot",                                                                 shadowHost);
}
async function findShadowDomElement(hostSelector, shadowDomElement) {
  let shadowRoot;
  let element;
  await (shadowRoot = getExtShadowRoot(hostSelector));
  await shadowRoot.then(async (result) => {
    await (element = result.findElement(By.css(shadowDomElement)));
  });
  
  return element;
}

let chromeOptions = new chrome.Options();
chromeOptions.addExtensions(encode('/Users/ebryn/Downloads/metamask.crx'));

var driver = new webdriver.Builder().
  forBrowser('chrome').
  setChromeOptions(chromeOptions).
  build();

(async function() {
  let session = await driver.getSession();
  let url = await driver.getCurrentUrl();
  let handles = await driver.getAllWindowHandles();
  let window = await driver.getWindowHandle(handles[0]);

  /*
  let metamask = await driver.get('chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/home.html#initialize/welcome');  
  fs.writeFileSync('/tmp/ss2.png', decode(await driver.takeScreenshot()));

  const seedPhrase = "uniform drip around nephew crunch position broken derive nothing wait infant friend";


  await driver.findElement(By.tagName('button')).click();
  fs.writeFileSync('/tmp/ss3.png', decode(await driver.takeScreenshot()));

  await driver.findElement(By.className('create-password__import-link')).click();
  fs.writeFileSync('/tmp/ss4.png', decode(await driver.takeScreenshot()));

  await driver.findElement(By.tagName('textarea')).sendKeys(seedPhrase);

  let password1 = driver.findElement(By.id('password'));
  password1.sendKeys('asdf1234');
  let password2 = driver.findElement(By.id('confirm-password'));
  password2.sendKeys('asdf1234');
  
  await driver.findElement(By.tagName('button')).click();
  fs.writeFileSync('/tmp/ss5.png', decode(await driver.takeScreenshot()));

  let terms = driver.findElement(By.className('first-time-flow__markdown'));
  driver.executeScript(`document.querySelector('.first-time-flow__markdown').scrollTo(0, 9999999999999)`);

  await driver.findElement(By.tagName('button')).click();
  fs.writeFileSync('/tmp/ss6.png', decode(await driver.takeScreenshot()));

  await driver.findElement(By.tagName('button')).click();
  fs.writeFileSync('/tmp/ss7.png', decode(await driver.takeScreenshot()));

  await driver.findElement(By.tagName('button')).click();
  fs.writeFileSync('/tmp/ss8.png', decode(await driver.takeScreenshot()));

  await driver.findElement(By.className('network-component')).click();
  fs.writeFileSync('/tmp/ss9.png', decode(await driver.takeScreenshot()));
  
  let networks = await driver.findElements(By.className('dropdown-menu-item'));
  await networks[1].click(); // Ropsten
  fs.writeFileSync('/tmp/ss10.png', decode(await driver.takeScreenshot()));
  */
  let playground = await driver.get('https://playground-staging.counterfactual.com/register');  

  fs.writeFileSync('/tmp/ss11.png', decode(await driver.takeScreenshot()));

  let inputs = await driver.findElements(By.tagName('input'));
  let shadowRoot = await findShadowDomElement('app-root', 'account-register');
  debugger;
  await inputs[0].sendKeys('testUser');
  await inputs[1].sendKeys('foo@bar.com');
  await driver.findElement(By.tagName('button')).click();


})();


/**
* Finds first matching elements on the page that may be in a shadow root using a complex selector of n-depth
*
* Don't have to specify all shadow roots to button, tree is travered to find the correct element
*
* Example querySelectorAllDeep('downloads-item:nth-child(4) #remove');
*
* Example should work on chrome://downloads outputting the remove button inside of a download card component
*
* Example find first active download link element querySelectorDeep('#downloads-list .is-active a[href^="https://"]');
*
* Another example querySelectorAllDeep('#downloads-list div#title-area + a');
e.g.
*/
var querySelectorAllDeep =  function querySelectorAllDeep(selector, root = document) {
  return _querySelectorDeep(selector, true, root);
}

var querySelectorDeep =  function querySelectorDeep(selector, root = document) {
  return _querySelectorDeep(selector, false, root);
}

var getObject = function getObject(selector, root = document) {
// split on > for multilevel selector
  const multiLevelSelectors = splitByCharacterUnlessQuoted(selector, '>');
if (multiLevelSelectors.length == 1) {
  return querySelectorDeep(multiLevelSelectors[0], root);
} else if (multiLevelSelectors.length == 2) {
  return querySelectorDeep(multiLevelSelectors[1], querySelectorDeep(multiLevelSelectors[0]).root);
} else if (multiLevelSelectors.length == 3) {
  return querySelectorDeep(multiLevelSelectors[2], querySelectorDeep(multiLevelSelectors[1], querySelectorDeep(multiLevelSelectors[0]).root));
}
//can add more level if we need to

}

var getAllObject = function getAllObject(selector, root = document) {
  // split on > for multilevel selector
  const multiLevelSelectors = splitByCharacterUnlessQuoted(selector, '>');
  if (multiLevelSelectors.length == 1) {
      return querySelectorAllDeep(multiLevelSelectors[0], root);
  } else if (multiLevelSelectors.length == 2) {
      return querySelectorAllDeep(multiLevelSelectors[1], querySelectorDeep(multiLevelSelectors[0]).root);
  } else if (multiLevelSelectors.length == 3) {
      return querySelectorAllDeep(multiLevelSelectors[2], querySelectorDeep(multiLevelSelectors[1], querySelectorDeep(multiLevelSelectors[0]).root));
  }
  //can add more level if we need to
  
}

function _querySelectorDeep(selector, findMany, root) {
  let lightElement = root.querySelector(selector);

  if (document.head.createShadowRoot || document.head.attachShadow) {
      // no need to do any special if selector matches something specific in light-dom
      if (!findMany && lightElement) {
          return lightElement;
      }

      // split on commas because those are a logical divide in the operation
      const selectionsToMake = splitByCharacterUnlessQuoted(selector, ',');

      return selectionsToMake.reduce((acc, minimalSelector) => {
          // if not finding many just reduce the first match
          if (!findMany && acc) {
              return acc;
          }
          // do best to support complex selectors and split the query
          const splitSelector = splitByCharacterUnlessQuoted(minimalSelector
                  //remove white space at start of selector
                  .replace(/^\s+/g, '')
                  .replace(/\s*([>+~]+)\s*/g, '$1'), ' ')
              // filter out entry white selectors
              .filter((entry) => !!entry);
          const possibleElementsIndex = splitSelector.length - 1;
          const possibleElements = collectAllElementsDeep(splitSelector[possibleElementsIndex], root);
          const findElements = findMatchingElement(splitSelector, possibleElementsIndex, root);
          if (findMany) {
              acc = acc.concat(possibleElements.filter(findElements));
              return acc;
          } else {
              acc = possibleElements.find(findElements);
              return acc;
          }
      }, findMany ? [] : null);


  } else {
      if (!findMany) {
          return lightElement;
      } else {
          return root.querySelectorAll(selector);
      }
  }

}

function findMatchingElement(splitSelector, possibleElementsIndex, root) {
  return (element) => {
      let position = possibleElementsIndex;
      let parent = element;
      let foundElement = false;
      while (parent) {
          const foundMatch = parent.matches(splitSelector[position]);
          if (foundMatch && position === 0) {
              foundElement = true;
              break;
          }
          if (foundMatch) {
              position--;
          }
          parent = findParentOrHost(parent, root);
      }
      return foundElement;
  };

}

function splitByCharacterUnlessQuoted(selector, character) {
  return selector.match(/\\?.|^$/g).reduce((p, c) => {
      if (c === '"' && !p.sQuote) {
          p.quote ^= 1;
          p.a[p.a.length - 1] += c;
      } else if (c === '\'' && !p.quote) {
          p.sQuote ^= 1;
          p.a[p.a.length - 1] += c;

      } else if (!p.quote && !p.sQuote && c === character) {
          p.a.push('');
      } else {
          p.a[p.a.length - 1] += c;
      }
      return p;
  }, { a: [''] }).a;
}


function findParentOrHost(element, root) {
  const parentNode = element.parentNode;
  return (parentNode && parentNode.host && parentNode.nodeType === 11) ? parentNode.host : parentNode === root ? null : parentNode;
}


function collectAllElementsDeep(selector = null, root) {
  const allElements = [];

  const findAllElements = function(nodes) {
      for (let i = 0, el; el = nodes[i]; ++i) {
          allElements.push(el);
          // If the element has a shadow root, dig deeper.
          if (el.shadowRoot) {
              findAllElements(el.shadowRoot.querySelectorAll('*'));
          }
      }
  };

  findAllElements(root.querySelectorAll('*'));

  return selector ? allElements.filter(el => el.matches(selector)) : allElements;
}