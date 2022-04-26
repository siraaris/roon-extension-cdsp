"use strict";

const ws         = require('ws'),
      net        = require('net'),
      url        = require('url'),
      UUID       = require('uuid-1345'),
      randomUUID = require('crypto')
      ;

var RoonApi              = require('node-roon-api'),
    RoonApiStatus        = require('node-roon-api-status'),
    RoonApiSettings      = require('node-roon-api-settings'),
    RoonApiVolumeControl = require('node-roon-api-volume-control');

var remotes = {};

var Location;
var LocationId;

var initialConnect = false;
var reConnect = false;

function Remote(socket) {
    this.getState = async () => {
        let gS = "\"GetState\"\n";
        socket.send(gS);
        return
    };
    this.getVolume = async () => {
        let gV = "\"GetVolume\"\n";
        socket.send(gV);
        return
    };
   this.getMute = async () => {
        let gM = "\"GetMute\"\n";
        socket.send(gM);
        return
   };
   this.setVolume = async (v) => {
        let sV = '{\"SetVolume\": ' + v + '}\n';
        socket.send(sV);
        let gV = "\"GetVolume\"\n";
        socket.send(gV);
        return
   };
   this.setMute = async (v) => {
        let sM = '{\"SetMute\": ' + v + '}\n';
        socket.send(sM);
        let gM = "\"GetMute\"\n";
        socket.send(gM);
        return
   };
}


function Establish(cb) {
    const { randomUUID } = require('crypto');

    Location = "ws://" + mysettings.hostname + ":" + mysettings.port + "/";
    LocationId = UUID.v5({ namespace: UUID.namespace.url, name: Location });

    if (remotes[LocationId]) {
        console.log("Remote already exists, devices: ", devices);
        return;
    }

    var timerID = 0;
    var wsStart = function () {

        var socket = new ws.WebSocket(Location);

        let remote = remotes[LocationId] = new Remote(socket);
    
        socket.on('open', function (open) {
            if (socket) {
                if (initialConnect == false) {
                    initialConnect = true;
                }
                else {
                    if (reConnect == false) {
                        reConnect = true;
                    }
                }
                console.log("pinger", "open");
                if (timerID) {
                    console.log("*** Clear timer...");
                    clearInterval(timerID);
                    timerID = 0;
                }
                cb(remote, 'connected');
            }
        });

        socket.on('error', function (error) {
            if (socket) {
                console.log("pinger", "error");
                socket.terminate();
                cb(remote, 'disconnected');
            }
        });

        socket.on('close', function (close) {
            if (socket) {
                console.log("pinger", "close");
                socket.terminate();

                if (!timerID) { /* avoid firing a new setInterval, after one has been done */
                    // Setup a function to reconnect every x milliseconds
                    timerID = setInterval( function () {
                        console.log("*** Fired timer...");
                        wsStart();
                    }, 5000);
                }
                cb(remote, 'disconnected');
            }
        });

        socket.on('message', function (message) {

            //console.log("pinger", "message START");

            if (socket) {

                let msg = JSON.parse(message);

                if (msg.GetState) {
                    if (msg.GetState.result == "Ok") {
                        //console.log("pinger", "message", "GetState - ", msg.GetState.value);
                        remote.actual_state = msg.GetState.value;
                        remote.trigger = "get_state_ok";
                        cb(remote, 'message');
                    } else {
                        //console.log("pinger", "error (GetState)");
                        socket.terminate();
                        remote.trigger = "get_state_error";
                        cb(remote, 'disconnected');
                    }
                }
                else if (msg.GetVolume) {
                    if (msg.GetVolume.result == "Ok") {
                        //console.log("pinger", "message", "GetVolume - ", msg.GetVolume.value);
                        remote.actual_volume = msg.GetVolume.value;
                        remote.trigger = "get_volume_ok";
                        cb(remote, 'message');
                    } else {
                        //console.log("pinger", "error (GetVolume)");
                        socket.terminate();
                        remote.trigger = "get_volume_error";
                        cb(remote, 'disconnected');
                    }
                }
                else if (msg.GetMute) {
                    if (msg.GetMute.result == "Ok") {
                        //console.log("pinger", "message", "GetMute - ", msg.GetMute.value);
                        remote.actual_mute = msg.GetMute.value;
                        remote.trigger = "get_mute_ok";
                        cb(remote, 'message');
                    } else {
                        //console.log("pinger", "error (GetMute)");
                        socket.terminate();
                        remote.trigger = "get_mute_error";
                        cb(remote, 'disconnected');
                    }
                }
                else if (msg.SetVolume) {
                    if (msg.SetVolume.result == "Ok") {
                        //console.log("pinger", "message", "SetVolume - OK");
                        remote.trigger = "set_volume_ok";
                    cb(remote, 'message');
                    } else {
                        //console.log("pinger", "error (SetVolume)");
                        socket.terminate();
                        remote.trigger = "set_volume_error";
                        cb(remote, 'disconnected');
                    }
                }
                else if (msg.SetMute) {
                    if (msg.SetMute.result == "Ok") {
                        //console.log("pinger", "message", "SetMute - OK");
                        remote.trigger = "set_mute_ok";
                        cb(remote, 'message');
                    } else {
                        //console.log("pinger", "error (SetMute)");
                        socket.terminate();
                        remote.trigger = "set_mute_error";
                        cb(remote, 'disconnected');
                    }
                }
                else {
                    //console.log("message error: ", msg);
                    socket.terminate();
                    remote.trigger = "get/set volume/mute/state error";
                    cb(remote, 'disconnected');
               }
            }
        });
    }
    wsStart();
}

var roon = new RoonApi({
    extension_id:        'audio.3sb.roon.cdsp',
    display_name:        'CamillaDSP Volume/Mute Control',
    display_version:     "0.0.2",
    publisher:           '3sb.audio',
    email:               'info@3sb.audio',
    website:             'https://github.com/siraaris/roon-extension-cdsp',
//  log_level:           'none',
//  log_level:           'all',
    set_persisted_state: function(state)
    {
        this.save_config("roonstate", state);
    },
    get_persisted_state: function()
    {
        return this.load_config("roonstate") || {};
    }
});

var mysettings = roon.load_config("settings") || {
    displayname: "CamillaDSP Device",
    hostname: "127.0.0.1",
    port: "1234",
    minvol: "-80",
    maxvol: "-20",
    id: LocationId
};

function make_layout(settings) {
    var l = {
        values:    settings,
        layout:    [],
        has_error: false
    };

    l.layout.push({
        type:      "string",
        title:     "Display Name",
        subtitle:  "The name of your CamillaDSP device",
        maxlength: 256,
        setting:   "displayname",
    });
    l.layout.push({
        type:      "string",
        title:     "Host Name or IP Address",
        subtitle:  "The hostname or IP address of your CamillaDSP device",
        maxlength: 256,
        setting:   "hostname",
    });
    l.layout.push({
        type:      "string",
        title:     "Port",
        subtitle:  "The port of your CamillaDSP device (e.g. 1234)",
        maxlength: 5,
        setting:   "port"
    });
    l.layout.push({
        type:      "string",
        title:     "Lower Volume Limit",
        subtitle:  "The lower limit for volume of your CamillaDSP device (e.g. -80)",
        maxlength: 3,
        setting:   "minvol"
    });
    l.layout.push({
        type:      "string",
        title:     "Upper Volume Limit",
        subtitle:  "The upper limit for volume of your CamillaDSP device (e.g. -20)",
        maxlength: 3,
        setting:   "maxvol"
    });

    return l;
}

var svc_settings = new RoonApiSettings(roon, {
    get_settings: function(cb)
    {
        cb(make_layout(mysettings));
    },
    save_settings: function(req, isdryrun, settings)
    {
        let l = make_layout(settings.values);
        req.send_complete(l.has_error ? "NotValid" : "Success", { settings: l });

        if (!isdryrun && !l.has_error)
        {
           var pre_displayname = mysettings.displayname;
           var pre_hostname = mysettings.hostname;
           var pre_port = mysettings.port;
           var pre_minvol = mysettings.minvol;
           var pre_maxvol = mysettings.maxvol;

            mysettings = l.values;
            svc_settings.update_settings(l);

            if (pre_displayname != mysettings.displayname || pre_hostname != mysettings.hostname || pre_port != mysettings.port || pre_minvol != mysettings.port || pre_maxvol != mysettings.maxvol) {
                console.log("pre_displayname / mysettings.displayname", pre_displayname, mysettings.displayname);
                console.log("pre_hostname / mysettings.hostname", pre_hostname, mysettings.hostname);
                console.log("pre_port / mysettings.port", pre_port, mysettings.port);
                console.log("pre_minvol / mysettings.minvol", pre_minvol, mysettings.minvol);
                console.log("pre_maxvol / mysettings.maxvol", pre_maxvol, mysettings.maxvol);
                setup();
            }
            roon.save_config("settings", mysettings);
        }
    }
});

let devices = 0;
var svc_status = new RoonApiStatus(roon);
var svc_volume_control = new RoonApiVolumeControl(roon);

roon.init_services({
    provided_services: [ svc_status, svc_settings, svc_volume_control ]
});

function setup () {
    new Establish((r, what) => {

        if (what == "connected") {
            devices = 1;
            ev_connected(r);
        }
        else if (what == "message") {
            ev_message(r);
        }
        else {
            devices = 0;
            ev_disconnected(r);
        } 
    });
    svc_status.set_status("Searching...", false);
}

async function ev_connected(r) {
    svc_status.set_status(`Found ${devices} ${devices == 1 ? "device" : "devices"}`, false);

    await r.getState();
    await r.getVolume();
    await r.getMute();

    if (!reConnect) {
        r.volume_control = svc_volume_control.new_device( {
            state: {
                control_key:  mysettings.id,
                display_name: mysettings.displayname,
                volume_type:  "number",
                volume_min:   mysettings.minvol,
                volume_max:   mysettings.maxvol,
                volume_value: r.actual_volume,
                volume_step:  1.0,
                is_muted:     r.actual_mute
            },
            set_volume: async function (req, mode, value) {
                await r.getVolume();

                let newvol = mode == "absolute" ? value : (r.actual_volume + value);
                if (newvol < this.state.volume_min)
                    newvol = this.state.volume_min;
                else if (newvol > this.state.volume_max)
                    newvol = this.state.volume_max;
                await r.setVolume(newvol);
                ev_volume(r, newvol);
                req.send_complete("Success");
            },
            set_mute: async function (req, action) {
                await r.getMute();

                let mute = action == 'on';
                if (action == 'toggle')
                mute = !(r.actual_mute);
                r.setMute(mute);
                ev_mute(r, mute);
                req.send_complete("Success");
            }
        });
    }
}

async function ev_message(r) {
    if (r.volume_control) {

        if (r.trigger == "get_volume_ok") {
            r.volume_control.update_state({ volume_value: r.actual_volume });
        } else
        if (r.trigger == "get_mute_ok") {
            r.volume_control.update_state({ is_muted: r.actual_mute });
        }
    } else {
        console.log("ev_message: r.trigger", r.trigger);
    }
}

function ev_disconnected(r) {
    svc_status.set_status("Disconnected...", false);

//    if (r.volume_control) { r.volume_control.destroy(); delete(r.volume_control); }

//    roon.init_services({
//        provided_services: [ svc_status, svc_settings, svc_volume_control ]
//    });
}

function ev_volume(r, val) {
    console.log("[CamillaDSP Volume Extension] received volume change from device:", val);
    if (r.volume_control)
        r.volume_control.update_state({ volume_value: val });
}

function ev_mute(r, val) {
    console.log("[CamillaDSP Volume Extension] received volume change from device:", val);
    if (r.volume_control)
        r.volume_control.update_state({ is_muted: val });
}

setup();
roon.start_discovery();

