# Setting up Counterfactual Metamask extension running in Chrome

## Downloading the extension

The extension can be downloaded from the current integration branch on [Github](https://github.com/prototypal/metamask-extension/blob/alon/cfnode-background/cf_builds/chrome.zip)

![Download Extension](http://prntscr.com/nl5gem)

After downloading, the zip file needs to be unzipped into a folder.

## Creating a new Chrome profile

It is recommended to test this extension in separate profile in Chrome so that it doesn't override your actual MM extension that you use in your day to day.

1. Click on your profile icon and then on manage people.
2. Click Add person and choose a name for this account.

![Add account](http://prntscr.com/nl5hxf)

## Loading the extension into Chrome

To start open up the extensions page in your new Chrome profile:
![Open Extensions](http://prntscr.com/nl5lri)

On this screen toggle `Developer Mode` to **on**.
![Toggle Developer Mode](http://prntscr.com/nl5miy)

Click `Load unpacked` button and choose the folder that you unzipped the extension earlier.
![Load unpacked](http://prntscr.com/nl5njh)

The Metamask Counterfactual extension is now loaded.

## Create Metamask account

1. Click on the orange fox and create a Metamask account.
2. Once you create an account make sure that you are on the Kovan testnet.
3. Make sure that you are using Metamask inside of the browser tab and not in the extension popup.

![Expand View](http://prntscr.com/nl5svq)

## Add Counterfactual as a plugin inside of Metamask

1. Click `[AddPlugins]`
2. Click `Add Plugin`
3. Click CF Plugin. Text should say `"dummy balance" ETH`

![AddPlugins](http://prntscr.com/nl5u3g)
![Add Plugin](http://prntscr.com/nl5udl)
![CF Plugin](http://prntscr.com/nl5ve7)

## Create Playground Account

The playground should now be running in an iframe inside of Metamask in place of the transaction screen.

Now register a new playground account inside of this iframe.

An existing playground account cannot be used as the Node that it was created with is different than this Node.