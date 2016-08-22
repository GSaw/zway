/*** RGB Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Georg Sawtschuk
Description:
    Binds several dimmers to make RGB a device which timely changes colors
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function RGBChanger (id, controller) {
    // Call superconstructor first (AutomationModule)
    RGBChanger.super_.call(this, id, controller);
}

inherits(RGBChanger, AutomationModule);

_module = RGBChanger;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

RGBChanger.prototype.init = function (config) {
    RGBChanger.super_.prototype.init.call(this, config);

    var self = this;
    self.debug = function (text) {
    debugPrint("RGBChanger: " + text );
    };

    function levelToColor(vDev) {
        var val = vDev.get("metrics:level");
        
        if (val === "on" || val === "255") {
            return 255;
        } else if (val === "off" || val === "0") {
            return 0;
        } else if (!isNaN(parseInt(val))) {
            return Math.round(parseInt(val) * 255.0/99.0);
        }
    }
    
    function colorToLevel(color) {
        return Math.round(color * 99.0 / 255.0);
    }

	self.dimmer_level = "off";
    self.r = -1;   
    self.g = -1;   
    self.b = -1;   
    self.max_value = self.config.max_value;
    self.timeout_seconds = self.config.timeout;     
    self.changeColor = function() {
		//var level = self.vDev.get("metrics:level");
		if("off" === self.dimmer_level ) {
			self.debug("dimmer is off, no color changes");
			self.timer = null;
			return
		} 
		
		var setuped = false;
		self.r = 0;
		self.g = 0;
		self.b = 0;
        
        var i = Math.floor(Math.random() * 3);
        self.debug("i = " + i);
        if(0 == i) {
            self.r = self.max_value;
        }
        if(1 == i) {
            self.b = self.max_value;
        }
        if(2 == i) {
            self.g = self.max_value;
        }
		
		i = Math.floor(Math.random() * 3);
        var n = Math.floor(0);
		if(self.r != self.max_value && n++ == i){
			self.r = Math.round(Math.floor(self.max_value / 2) * Math.random());
			setuped = true;
		}
		if(self.b != self.max_value && n++ == i ){
			self.b = Math.round(Math.floor(self.max_value / 2) * Math.random());
			setuped = true;
		}
		if(!setuped && self.g != self.max_value && n++ == i ){
			self.g = Math.round(Math.floor(self.max_value / 2) * Math.random());
			setuped = true;
		}
			
		//self.debug("get red device " + self.config.red );
		var redDevice = self.controller.devices.get(self.config.red);
		//self.debug("got red device " + redDevice );	
		var blueDevice = self.controller.devices.get(self.config.blue);
		//self.debug("got blue device " + blueDevice );	
		var greenDevice = self.controller.devices.get(self.config.green);
		//self.debug("got green device " + greenDevice );	
		var dimmerDevice = self.controller.devices.get(self.config.dimmer);
		//self.debug("got dimmer device " + dimmerDevice );
		self.debug("r="+self.r+",g="+self.g+",b="+self.b);
		if(blueDevice) {
			var dimmer_val = dimmerDevice.get("metrics:level");	
			blueDevice.performCommand("exact", { level: colorToLevel(self.b) } );
			redDevice.performCommand("exact", { level: colorToLevel(self.r) } );
			greenDevice.performCommand("exact", { level: colorToLevel(self.g) } );
			//dimmerDevice.performCommand("exact", { level: 5 } );
		}
        self.timer = setTimeout(self.changeColor, self.timeout_seconds * 1000);
    }    

    this.vDev = this.controller.devices.create({
        deviceId: "RGBChanger_" + this.id,
        defaults: {
            deviceType: "switchBinary",
            metrics: {
                icon: '',
                title: 'RGB Changer ' + this.id,
                level: 'off'
            }
        },
        overlay: {},
        handler:  function (command, args) {
            self.debug("command = " + command);
            if(command === "on") {
				self.debug("create timer");
				clearTimeout(self.timer);
                self.timer = setTimeout(self.changeColor, self.timeout_seconds * 1000);
            }
            if(command === "off") {
				self.debug("switch off");
                clearTimeout(self.timer);
                wself.timer = null;
            }
        
            //~ if (command === "on" || command === "off") {
                //~ self.controller.devices.get(self.config.dimmer).performCommand(command);
            //~ }
            //~ if (command === "exact") {
                //~ self.controller.devices.get(self.config.red).performCommand("exact", { level: colorToLevel(args.red) } );
                //~ self.controller.devices.get(self.config.green).performCommand("exact", { level: colorToLevel(args.green) } );
                //~ self.controller.devices.get(self.config.blue).performCommand("exact", { level: colorToLevel(args.blue) } );
            //~ }
        },
        moduleId: this.id
    });
    
    //~ this.handleLevel = function() {
        //~ self.vDev.set("metrics:level", (
            //~ levelToColor(self.controller.devices.get(this.config.dimmer))
        //~ ) ? 'on' : 'off');
    //~ };
    //~ 
    //~ this.handleR = function () {
        //~ self.vDev.set("metrics:color:r", levelToColor(self.controller.devices.get(self.config.red)));
        //~ self.handleLevel();
    //~ };
    //~ this.handleG = function () {
        //~ self.vDev.set("metrics:color:g", levelToColor(self.controller.devices.get(self.config.green)));
        //~ self.handleLevel();
    //~ };
    //~ this.handleB = function () {
        //~ self.vDev.set("metrics:color:b", levelToColor(self.controller.devices.get(self.config.blue)));
        //~ self.handleLevel();
    //~ };

    this.handleDimmer = function () {
		self.debug("getting dimmer " + self.config.dimmer );
        var dimmer = self.controller.devices.get(self.config.dimmer);
        self.debug("got dimmer " + dimmer );
        var val = dimmer.get("metrics:level");
        self.debug("Handle Dimmer value [" + val + "] " + ("0" == val));
		if (val == "off" || val == "0") {
			self.debug("set dimmer_level = off ");
            self.dimmer_level = "off";
		} else {
			self.debug("set dimmer_level = on " + self.timer);
			self.dimmer_level = val;
			if(!self.timer) {
				self.timer = setTimeout(self.changeColor, self.timeout_seconds * 1000);
			}
		}
    };

    this.controller.devices.on(self.config.dimmer, "change:metrics:level", this.handleDimmer);
};

RGBChanger.prototype.stop = function () {
    //this.controller.devices.off(this.config.dimmer, "change:metrics:level", this.handleDimmer);

    clearTimeout(self.timer);
    self.timer = null;
    this.handleDimmer = null;
    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    RGBChanger.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
