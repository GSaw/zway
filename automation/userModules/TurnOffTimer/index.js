/*** TurnOffTimer Z-Way Home Automation module *************************************

 Version: 1.0.1
 (c) Z-Wave.Me, 2014

 -----------------------------------------------------------------------------
 Author: Gregory Sitnin <sitnin@z-wave.me> and Poltorak Serguei <ps@z-wave.me>
 Description:
     This module listens given VirtualDevice (which MUSt be typed as switch)
     level metric update events and switches off device after configured
     timeout if this device has been switched on.

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function TurnOffTimer (id, controller) {
    // Call superconstructor first (AutomationModule)
    TurnOffTimer.super_.call(this, id, controller);

    // Create instance variables
    this.timer = null;
};

function getSecondsSinceEpoch() {
    return Math.floor(new Date() / 1000);
}

inherits(TurnOffTimer, AutomationModule);

_module = TurnOffTimer;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

TurnOffTimer.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    TurnOffTimer.super_.prototype.init.call(this, config);

    // Remember "this" for detached callbacks (such as event listener callbacks)
    var self = this;
    
    debugPrint("deviceHandler");
    
    self.debug = function (text) {
        debugPrint("TurnOffTimer: " + text );
    };
    
    this.turned_off = 0;
    this.lumValue = "0";
    this.man_off = false;
    this.deviceHandler = function (device) {
        var value = device.get("metrics:level");
        self.debug("device changed level " + value );
        
        if (self.timer) {
            // Timer is set, so we destroy it
            clearTimeout(self.timer);
        }
        if ("on" === value || (parseInt(value) && value > 0)) {
            // Device reported "on", set (or reset) timer to new timeout
            // Notice: self.config.timeout set in seconds
		    self.debug("device is on, reset timer" );
            self.timer = setTimeout(function () {
                // Timeout fired, so we send "off" command to the virtual device
                // (every switch device should handle it)
                device.performCommand("off");
                // And clearing out this.timer variable
                self.timer = null;
            }, self.config.timeout*1000);
        } else {
            if(!self.man_off) {
                self.debug("user switsched off, block sensor for one minute ");
                self.turned_off = getSecondsSinceEpoch();
            } else {
                self.debug("auto off, no delay");
            }
        }
        self.man_off = false;
    };
    
    
    this.lumSensorHandler = function( lumSensorDevice ) {
        self.lumValue = lumSensorDevice.get("metrics:level");
        self.debug("new lum value reported " + self.lumValue);
    }
    
    self.debug("Sensor Handler");
    this.sensorHandler = function (sensorDevice) {
        self.debug("sendordevice = " + sensorDevice );
	
        if (self.timer) {
                // Timer is set, so we destroy it
                clearTimeout(self.timer);
        }

        var sensorValue = sensorDevice.get("metrics:level");
        self.debug("sensor changed level " + sensorValue );

        self.debug("target device = " + self.config.device + ", light sensor = " + self.config.lightSensor );
		var targetDevice = self.controller.devices.get(self.config.device);
		var deviceValue = targetDevice.get("metrics:level");
        self.debug("device has status " + deviceValue );
        var sensorOn = ( "on" === sensorValue || (!isNaN(parseInt(sensorValue)) && sensorValue > 0 ));
        var deviceOn = ( "on" === deviceValue || (!isNaN(parseInt(deviceValue)) && deviceValue > 0 ));

        var maxLumValue = self.config.lumLevel;
        self.debug("lumValue = " + self.lumValue + " vs. " + self.config.maxLumValue );
        var lumCheck = (!isNaN(parseInt(self.lumValue)) && self.lumValue < maxLumValue );
        self.debug("sensorOn = "  + sensorOn + ", !self.turned_off = " + !self.turned_off + ", lum check = " + lumCheck);
        var now = getSecondsSinceEpoch();
        var pass_delay = (now - self.turned_off) > 60;
        self.debug("self.turned_off = " + self.turned_off + ", now = " + now + ", pass delay = " + pass_delay);
        
        if(sensorOn && pass_delay && lumCheck) {
            targetDevice.performCommand("on");
        }
        
        if(!sensorOn) {
            self.turned_off = false;
        }

        if (deviceOn) {
            self.debug("target device is on, reset Timer");
            self.timer = setTimeout(function () {
                // Timeout fired, so we send "off" command to the virtual device
                // (every switch device should handle it)
                targetDevice.performCommand("off");
                self.man_off = true;
                // And clearing out this.timer variable
                self.timer = null;
            }, self.config.timeout*1000);
		}
    };
    // Setup metric update event listener
    this.controller.devices.on(this.config.device, 'change:metrics:level', this.deviceHandler);
    this.controller.devices.on(this.config.sensor, 'change:metrics:level', this.sensorHandler);
    this.controller.devices.on(this.config.lightSensor, 'change:metrics:level', this.lumSensorHandler);
};

TurnOffTimer.prototype.stop = function () {
    TurnOffTimer.super_.prototype.stop.call(this);

    if (this.timer)
        clearInterval(this.timer);
    
    this.controller.devices.off(this.config.device, 'change:metrics:level', this.deviceHandler);
    this.controller.devices.off(this.config.sensor, 'change:metrics:level', this.sensorHandler);
    this.controller.devices.off(this.config.lightSensor, 'change:metrics:level', this.lumSensorHandler);
};
// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

// This module doesn't have any additional methods
