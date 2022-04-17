# [Roon](https://roonlabs.com) [Extension](node-roon-api) to provide [volume control](https://github.com/RoonLabs/node-roon-api-volume-control) for [CamillaDSP's](https://github.com/HEnquist/camilladsp) via its built-in WebSocket server.

This extension connects to your CamillaDSP's instalnce via WebSocket, and allows Roon to control it's volume in-app.

This is an alternative to controlling CammillaDSP's volume via Camilla Backend and GUI.

Make sure to configure CamillaDSP to start with a WebSockets by specifying --port=.

To use this extension within Roon, go to the Roon zone that is playing to CamillaDSP, and go to device setup. Then change the volume control mechanism to be this extension.

After running this extension, you will need to configure the TCP/IP address and port of your CamillaDSP instance.

Note, there is no need to run camilladsp-backend or camilladsp-gui to use this extension, as it uses WebSockets to camilladsp directly.
