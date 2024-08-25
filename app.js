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
    RoonApiVolumeControl = require('node-roon-api-volume-control')
    ;

var CamillaURL;
var CamillaUUID;

var connection;

var socket;
var remote;

var cdsp = {};

function Remote() {
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

    CamillaURL = "ws://" + mysettings.hostname + ":" + mysettings.port;
    CamillaUUID = UUID.v5({ namespace: UUID.namespace.url, name: CamillaURL });

    var timerID = 0;

    connection = 0;

    var wsStart = function () {

        socket = new ws.WebSocket(CamillaURL);
        remote = new Remote(socket);

        socket.on('open', function (open) {
            if (socket) {
                connection++;
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

            if (socket) {

                let msg = JSON.parse(message);

                if (msg.GetState) {
                    if (msg.GetState.result == "Ok") {
                        console.log("pinger", "message", "GetState - ", msg.GetState.value);
                        remote.actual_state = msg.GetState.value;
                        cdsp.actual_state = remote.GetState.value;
                        remote.trigger = "get_state_ok";
                        cb(remote, 'message');
                    } else {
                        console.log("pinger", "error (GetState)");
                        socket.terminate();
                        remote.trigger = "get_state_error";
                        cb(remote, 'disconnected');
                    }
                }
                else if (msg.GetVolume) {
                    if (msg.GetVolume.result == "Ok") {
                        console.log("pinger", "message", "GetVolume - ", msg.GetVolume.value);
                        remote.actual_volume = msg.GetVolume.value;
                        cdsp.actual_volume = remote.GetVolume.value;
                        remote.trigger = "get_volume_ok";
                        cb(remote, 'message');
                    } else {
                        console.log("pinger", "error (GetVolume)");
                        socket.terminate();
                        remote.trigger = "get_volume_error";
                        cb(remote, 'disconnected');
                    }
                }
                else if (msg.GetMute) {
                    if (msg.GetMute.result == "Ok") {
                        console.log("pinger", "message", "GetMute - ", msg.GetMute.value);
                        remote.actual_mute = msg.GetMute.value;
                        cdsp.actual_mute = remote.GetMute.value;
                        remote.trigger = "get_mute_ok";
                        cb(remote, 'message');
                    } else {
                        console.log("pinger", "error (GetMute)");
                        socket.terminate();
                        remote.trigger = "get_mute_error";
                        cb(remote, 'disconnected');
                    }
                }
                else if (msg.SetVolume) {
                    if (msg.SetVolume.result == "Ok") {
                        console.log("pinger", "message", "SetVolume - OK");
                        remote.trigger = "set_volume_ok";
                    cb(remote, 'message');
                    } else {
                        console.log("pinger", "error (SetVolume)");
                        socket.terminate();
                        remote.trigger = "set_volume_error";
                        cb(remote, 'disconnected');
                    }
                }
                else if (msg.SetMute) {
                    if (msg.SetMute.result == "Ok") {
                        console.log("pinger", "message", "SetMute - OK");
                        remote.trigger = "set_mute_ok";
                        cb(remote, 'message');
                    } else {
                        console.log("pinger", "error (SetMute)");
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
    display_version:     "0.0.4",
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
    id: 1
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
    get_settings: function(cb) {
        cb(make_layout(mysettings));
    },
    save_settings: function(req, isdryrun, settings) {
        let l = make_layout(settings.values);
        req.send_complete(l.has_error ? "NotValid" : "Success", { settings: l });

        if (!isdryrun && !l.has_error) {

            mysettings = l.values;
            svc_settings.update_settings(l);
            roon.save_config("settings", mysettings);

        }
    }
});

var svc_status = new RoonApiStatus(roon);
var svc_volume_control = new RoonApiVolumeControl(roon);

roon.init_services({
    provided_services: [ svc_status, svc_settings, svc_volume_control ]
});



function setup () {

    new Establish((r, what) => {

        if (what == "connected") {
            ev_connected(r);
        }
        else if (what == "message") {
            ev_message(r);
        }
        else {
            ev_disconnected(r);
        } 
    });
    svc_status.set_status(`Setting up... ${CamillaUUID} on connection ${connection}`, false);
}

async function ev_connected(r) {

    if (cdsp.volume_control)
    {
/*
        console.log("r.volume_control:\n", r.volume_control);
        console.log("cdsp.volume_control:\n", cdsp.volume_control);
*/
//      await r.getState();
        await r.getVolume();
        await r.getMute();

        svc_status.set_status(`Reconnected ${CamillaUUID} on connection ${connection}`, false);
/*
        console.log("Reconnected...");
        console.log("State (r): ", r.actual_state);
        console.log("State (cdsp): ", cdsp.actual_state);
        console.log("Mute (r): ", r.actual_mute);
        console.log("Mute (cdsp): ", cdsp.actual_mute);
        console.log("Volume (r): ", r.actual_volume);
        console.log("Volume (cdsp): ", r.actual_volume);
        console.log("Min Volume: ", mysettings.minvol);
        console.log("Max Volume: ", mysettings.maxvol);
*/
        cdsp.volume_control.update_state({ 
            is_muted:     r.actual_mute,
            volume_value: r.actual_volume,
            volume_min:   mysettings.minvol,
            volume_max:   mysettings.maxvol
        });

        return;
    }
    else {

        svc_status.set_status(`Connected ${CamillaUUID} on connection ${connection}`, false);

//      await r.getState();
        await r.getVolume();
        await r.getMute();

        cdsp.volume_control = svc_volume_control.new_device( {
            state: {
                control_key:  CamillaUUID,
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
    svc_status.set_status(`Processing ${CamillaUUID} on connection ${connection}`, false);

    if (cdsp.volume_control) {

        if (r.trigger == "get_volume_ok") {
            cdsp.volume_control.update_state({ volume_value: r.actual_volume });
            console.log("Setting volume (r.actual_volume) in ev_message: ", r.actual_volume);
        } else
        if (r.trigger == "get_mute_ok") {
            cdsp.volume_control.update_state({ is_muted: r.actual_mute });
            console.log("Setting mute (r.actual_mute) in ev_message: ", r.actual_mute);
        }
    } else {
        console.log("ev_message: No Volume Control - r.trigger", r.trigger);
    }
}

function ev_disconnected(c) {
    svc_status.set_status(`Disconnected ${CamillaUUID} on connection ${connection}`, false);
}

function ev_volume(r, val) {
    console.log("[CamillaDSP Volume Extension] received volume change from device:", val);
    if (r.volume_control) {
        r.volume_control.update_state({ volume_value: val });
    }
}

function ev_mute(r, val) {
    console.log("[CamillaDSP Volume Extension] received volume change from device:", val);
    if (r.volume_control) {
        r.volume_control.update_state({ is_muted: val });
    }
}

setup();
roon.start_discovery();

