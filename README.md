# [Roon](https://roonlabs.com) [Extension](node-roon-api) to provide [volume control](https://github.com/RoonLabs/node-roon-api-volume-control) for [CamillaDSP](https://github.com/HEnquist/camilladsp).

This extension connects to CamillaDSP via WebSocket, and allows Roon to control volume in-app.

This is an alternative to controlling CammillaDSP's volume via CamillaDSP's Backend and GUI.

Make sure to configure CamillaDSP to start with an accessible websocket by specifying --port=1234 and --address=192.168.1.130 (the IP address of the host running the extension). 

To use this extension within Roon, set configuration in Settings->Extensions, and then go to the Roon zone that is playing to CamillaDSP, and go to device setup. Then change the volume control mechanism to be this extension.

Note, there is no need to run camilladsp-backend or camilladsp-gui to use this extension, as it uses WebSockets to camilladsp directly.

To run this extension, in the directory:

$ npm install

$ node app.js
