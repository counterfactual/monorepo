#!/bin/bash
echo "Downloading Metamask CRX..."
curl -L -X GET "https://clients2.google.com/service/update2/crx?response=redirect&prodversion=72.0.3626.120&x=id%3Dnkbihfbeogaeaoehlefnkodbefgpgknn%26uc" > ../bin/metamask.crx
