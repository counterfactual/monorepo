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
let playground = await driver.get(
  "https://playground-staging.counterfactual.com/register"
);

fs.writeFileSync("/tmp/ss11.png", decode(await driver.takeScreenshot()));

let inputs = await driver.findElements(By.tagName("input"));
let shadowRoot = await findShadowDomElement("app-root", "account-register");
debugger;
await inputs[0].sendKeys("testUser");
await inputs[1].sendKeys("foo@bar.com");
await driver.findElement(By.tagName("button")).click();
