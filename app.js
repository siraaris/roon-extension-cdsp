"use strict";

const ws   = require('ws'),
      net  = require('net'),
      url  = require('url'),
      uuid = require('uuid-1345')
      ;

var debug                = require('debug')('roon-extension-cdsp'),
    util                 = require('util'),
    RoonApi              = require('node-roon-api'),
    RoonApiStatus        = require('node-roon-api-status'),
    RoonApiSettings      = require('node-roon-api-settings'),
    RoonApiVolumeControl = require('node-roon-api-volume-control');

var cdsp = {};
var instance = "";
var instance_display_name = "";

let devices = 0;

init();

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

    const loc = "ws://" + mysettings.hostname + ":" + mysettings.port + "/";

    const usn = uuid.v5({ namespace: uuid.namespace.url, name: "CamillaDSP Server" });
    const udn = uuid.v5({ namespace: uuid.namespace.url, name: "CamillaDSP Client" });

    if (cdsp[usn]) return;

    const socket = new ws.WebSocket(loc);

    let remote = cdsp[usn] = new Remote(socket);

    remote.id = udn;
    remote.name = "Keystone";

    socket.on('open', function (open) {
        if (socket) {
            //console.log("pinger", "open");
            cb(remote, 'connected');
        }
    });

    socket.on('error', function (error) {
        if (socket) {
            //console.log("pinger", "error");
            socket.terminate();
            cb(remote, 'disconnected');
        }
    });

    socket.on('close', function (close) {
        if (socket) {
            //console.log("pinger", "close");
            socket.terminate();
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

var roon = new RoonApi({
    extension_id:        'com.3sb-audio.roon.cdsp' + instance,
    display_name:        'CamillaDSP Volume Control' + instance_display_name,
    display_version:     "0.0.2",
    publisher:           '3SB Audio Pty Ltd',
    email:               'aris.t@mac.com',
    website:             'https://github.com/siraaris/roon-extension-cdsp',
    set_persisted_state: function(state)
    {
        this.save_config("roonstate" + instance, state);
    },
    get_persisted_state: function()
    {
        return this.load_config("roonstate" + instance) || {};
    }
});

var mysettings = roon.load_config("settings" + instance) || {
    id: uuid.v5({ namespace: uuid.namespace.url, name: "CamillaDSP Client" }),
    displayname: "CamillaDSP Client",
    hostname: "127.0.0.1",
    port: "1234",
    minvol: "-80",
    maxvol: "-20"
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
            if (!mysettings.id)
                mysettings.id = uuid.v5({ namespace: uuid.namespace.url, name: "CamillaDSP Client" });
            let _name = mysettings.displayname;
            let _id = mysettings.id;

            mysettings = l.values;
            mysettings.id = _name == mysettings.displayname ? _id : uuid.v5({ namespace: uuid.namespace.url, name: "CamillaDSP Client" });

            svc_settings.update_settings(l);
            roon.save_config("settings" + instance, mysettings);

            //setup();
        }
    }
});


var svc_status = new RoonApiStatus(roon);
var svc_volume_control = new RoonApiVolumeControl(roon);

roon.init_services({
    provided_services: [ svc_status, svc_settings, svc_volume_control ]
});

function init()
{
    process.argv.forEach(function (val, index, array)
    {
        //debug(index + ': ' + val);

        if (val.startsWith("-inst:"))
        {
            var inst = val.substr(6);
            if (inst)
            {
                instance = "." + inst;
                //debug('instance = %s', instance);

                instance_display_name = " (" + inst + ")";
            }
        }
    });
}


function setup() {
    new Establish((r, what) => {

        //console.log(r, what);

        if (what == "connected") {

	    if (!mysettings.hostname) return;
	    if (mysettings.hostname.length <= 0) return;

	    if (!mysettings.port) return;
	    if (mysettings.port.length <= 0) return;

	    if (!mysettings.minvol) return;
	    if (mysettings.minvol.length <=0) return;

	    if (!mysettings.maxvol) return;
	    if (mysettings.maxvol.length <=0) return;

            if (r.volume_control) {
                r.volume_control.destroy();
                delete(r.volume_control);
            }
            devices++;
            //console.log("devices(connected): ", devices);
            ev_connected(r);
        }
        else if (what == "message") {
            //console.log("devices(message): ", devices);
            ev_message(r);
        }
        else {
            devices--;
            //console.log("devices(close): ", devices);
//            if (r.volume_control) {
//                r.volume_control.destroy();
//                delete(r.volume_control);
//            }
            ev_disconnected(r);
        }
    });

    svc_status.set_status("Searching...", false);
}

async function ev_connected(r) {
    svc_status.set_status(`Found ${devices} ${devices == 1 ? "device" : "devices"}`, false);
    //console.log("ev_connected, r.id", r.id);

    await r.getState();
    await r.getVolume();
    await r.getMute();

    r.volume_control = svc_volume_control.new_device({
	state: {
            control_key:  r.id,
	    display_name: `${r.name}`,
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
            //console.log("set_volume: ", newvol);
	},
	set_mute: async function (req, action) {
            await r.getMute();
            
            let mute = action == 'on';
            if (action == 'toggle')
                mute = !(r.actual_mute);
            r.setMute(mute);
            ev_mute(r, mute);
	    req.send_complete("Success");
            //console.log("set_mute: ", mute);
	}
    });
    //console.log("ev_connected, r", r);
}

async function ev_message(r) {
    //console.log("ev_message, r.id", r.id);
    //console.log("ev_message, r", r);

    if (r.volume_control) {

        if (r.trigger == "get_volume_ok") {
            r.volume_control.update_state({ 
                volume_value: r.actual_volume
	    });
            //console.log("Updating volume (",r.actual_volume,")");
        } else
        if (r.trigger == "get_mute_ok") {
            r.volume_control.update_state({ 
	        is_muted:     r.actual_mute
	    });
            //console.log("Updating mute (",r.actual_mute,")");
        }
    }
    else {
        //console.log("ev_message: r.trigger", r.trigger);
    }
}

function ev_disconnected(r) {
    if (devices == 0) {
        svc_status.set_status("Searching...", false);
    } else {
        svc_status.set_status(`Found ${devices} ${devices == 1 ? "device" : "devices"}`, false);
    }

    if (r.volume_control) { r.volume_control.destroy(); delete(r.volume_control);   }
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

