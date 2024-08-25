# [Roon](https://roonlabs.com) [Extension](node-roon-api) to provide volume control for [CamillaDSP](https://github.com/HEnquist/camilladsp).

This extension connects to CamillaDSP via WebSocket, and enables Roon to control CamillaDSP's volume and muting in-app.

This is an alternative to controlling CamillaDSP's volume via CamillaDSP's Backend and GUI.

Make sure to configure CamillaDSP to start with an accessible websocket by specifying --port=1234 and --address=192.168.1.130 (the IP address of the host running the extension). 

To use this extension within Roon, set configuration in Settings->Extensions, and then go to the Roon zone that is playing to CamillaDSP, and go to device setup. Then change the volume control mechanism to be this extension.

Note, there is no need to run camilladsp-backend or camilladsp-gui to use this extension, as it uses WebSockets to camilladsp directly.

To run this extension, in the directory:

$ npm install

This may complain about a security issue with the npm ip module, but if Roon is running in your home and private environment then this might be a low risk.

$ node app.js

This may fail, see https://github.com/RoonLabs/node-roon-api/pull/38/commits/e0a51b72795fe9921d7b2b12d9c0102a475faa60

# Notes

* Based (heavily) on [roon-extension-devialet-phantom-volume](https://github.com/RoonLabs/roon-extension-devialet-phantom-volume) & [roon-extension-rotel](https://github.com/bsc101/roon-extension-rotel), and on other extensions referenced there.
* I learnt what I needed to get this running, not a Javascript programmer, use at own risk etc.
* Recommend (highly) turning off amplifiers and test, test, test before using with amplifiers on.
* The extension will try to reconnect every 5 seconds if the connection to CamillaDSP is closed (i.e. CamillaDSP stops running). Advise that CamillaDSP is kept running with an autostart mechanism.

