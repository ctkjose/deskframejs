/*
 *  DeskFrame Helper API
 *  Version 1.2, Jose L Cuevas
 *  http://expresscode.org/deskframe
 */


wa = {
	url : "", //current url
	ready : false, //helper API is ready
	sendEvent : function( msg , data){
		var m = { 'event' : msg , 'data' : data };
		window.status = JSON.stringify(m);
	},
	messageQue : [],
	messageIsBusy: false,
	messagePoll: function(){
		if( this.messageIsBusy ) return;
		if( this.messageQue.length == 0 ) return;
		var idx = this.messageQue.length - 1;
		var message = this.messageQue.shift();


		this.messageIsBusy = true;
		var rq = new XMLHttpRequest();
		rq.open("POST", this.helperHost, true);

		rq.onload = function( ) {
			var status = rq.status;
			var p = null;

			if (status == 200) {
				p = JSON.parse(rq.responseText);
			} else {
				wa.log("message failed " + message.m.event);
				wa.messageIsBusy = false;
				wa.messagePoll();
			}

			if(p == null) return;

			if (message.fn) {
				message.fn(p);
			}
			wa.messageIsBusy = false;
			wa.messagePoll();
		};

		$payload = JSON.stringify(message.m);

		rq.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		//rq.setRequestHeader("Content-length", $payload.length);
		//rq.setRequestHeader("Connection", "close");
		rq.send($payload);

		var fd = new FormData();

	},
	sendMessage : function( msg , data, fn){
		var m = { 'event' : msg , 'key': this.helperKey, 'data' : data };
		this.messageQue.push( {"m": m, "fn": fn} );
		if (this.messageIsBusy) return;
		this.messagePoll();
	},
	log	: function( m ){
		var msg = "" + m;
		wa.sendEvent("debug", { "msg" : msg });
	},

	listeners : {},
	on : function(events, fn){
		var ev = typeof events === 'string' ? events.split(' ') : events;

		for (var i in ev) {
			var e = ev[i];

			if(!this.listeners[e]) this.listeners[e] = [];
			this.listeners[e].push( fn );
		}

	},
	raiseEvent : function(eventName, params){
		var ev = new Event(eventName, {"bubbles":false, "cancelable":false});
		ev.data = params;
		window.dispatchEvent(ev);

		
		if(!this.listeners[eventName]) return;
		for(var k in this.listeners[eventName]){
			var fn = this.listeners[eventName][k];
			//this.log("calling callback[" + event + "]=" + fn);
			fn.apply(null, [params]);
		}
	}

}



/*******************************
 *
 *  Helpers
 *
 *
 *******************************/

wa.system = {
	//which OS are we on
	targetMacOS: false,
	targetWindows: false,
	targetLinux: false,

	speak : function(text){
		wa.sendEvent("speak", { text: text } );
	},
	clipboardDataSet : function(datatype, data){
		var edata = window.btoa(data)
		wa.sendMessage("clipboardDataSet", { window: wa.window.uuid, type: datatype, data: edata }, function(o){} );
	},
	clipboardDataGet : function(datatype, callback){
		wa.sendMessage("clipboardDataGet", { window: wa.window.uuid, type: datatype }, function(o){callback(o)} );
	},
	clipboardDataAvailable : function(datatype, callback){
		wa.sendMessage("clipboardDataAvailable", { window: wa.window.uuid, type: datatype }, function(o){callback(o)} );
	},
	clipboardTextAvailable : function(callback){
		wa.sendMessage("clipboardDataGet", { window: wa.window.uuid }, function(o){callback(o)} );
	},
	clipboardSet : function(text){
		wa.sendMessage("clipboardSet", { window: wa.window.uuid, text: text }, function(o){} );
	},
	clipboardGet : function(callback){
		wa.sendMessage("clipboardGet", { window: wa.window.uuid }, function(o){callback(o)} );
	},
	messageDialog: function(ops, callback){
		wa.sendMessage("messageDialog", ops, callback );
	}
};


wa.window = {
	menuHandlers : {},
	uuid : "",
	listenerInstalled : false,
	handleMenu : function(m){
		if(wa.window.menuHandlers.hasOwnProperty( m.tag )){
			wa.window.menuHandlers[ m.tag ].fn( m.tag );
		}
	},
	disableClose : function(){
		wa.sendEvent("disableWindowClose", { window: wa.window.uuid } );
	},
	enableClose : function(){
		wa.sendEvent("enableWindowClose", { window: wa.window.uuid } );
	},
	setTitle : function(title){
		wa.sendEvent("setTitle", { title: title } );
	},
	setWidth : function(w){
		wa.sendEvent("setSize", { width: w } );
	},
	setHeight : function(h){
		wa.sendEvent("setSize", { height: h } );
	},
	setSize : function(w,h){
		wa.sendEvent("setSize", { width: w, height: h } );
	},
	createMenu : function( menu ){
		if(!this.listenerInstalled){
			this.listenerInstalled = true;
			wa.on("menuAction", wa.window.handleMenu);
		}

		if( !menu.hasOwnProperty("label") ) menu["label"] = "Untitled";
		if( !menu.hasOwnProperty("menu") ) menu["menu"] = "file";
		if( !menu.hasOwnProperty("tag") ) menu["tag"] = "new_menu";

		if( menu.hasOwnProperty("callback") ){
			this.menuHandlers[menu["tag"]] = {fn:  menu.callback };
			delete menu.callback;
		}

		var sm = [];
		if( menu.hasOwnProperty("submenus") ){
			sm = menu["submenus"];
			delete menu["submenus"];
		}
		wa.sendMessage('createmenu', menu, function(o){});

		var k = Object.keys(sm);
		if (k.length == 0) return;


		for(var i=0; i< k.length; i++){
			var e = sm[k[i]];
			e["menu"] = menu.tag;
			wa.window.createMenu( e );
		}
	},

}
wa.fs = {
	execute : function(command, callback){
		var fn = (typeof(callback)=="undefined") ? function(o){} : callback;
		wa.sendMessage('execute', { "command": command }, fn );
	},
	file : function(path, callback){
		wa.sendMessage('loadfileinformation', { "path": path }, callback );
	},
	directory : function(path, callback){
		wa.sendMessage('loadfileinformation', { "path": path, 'with_items': true }, callback );
	},
	systemPath : function(name, callback){
		wa.sendMessage('systempath', { "name": name }, callback );
	},

	dialogSaveFile : function(options, callback){
		var ops = { path: "", title : 'Save',  prompt: "Enter a filename", name: "untitled.txt" };

		if (options){
			for (var prop in options) {
			    ops[prop] = options[prop];
			}
		}
		wa.sendMessage('dialogsavefile', ops, callback );
	},
	dialogOpenFile : function(options, callback){
		var ops = { path: "", title : 'Open',  prompt: "Enter a filename", name: "" };

		if (options){
			for (var prop in options) {
			    ops[prop] = options[prop];
			}
		}
		wa.sendMessage('dialogopenfile', ops, callback );
	},
	putContents : function(path, data, callback){
		var fn = (typeof(callback)=="undefined") ? function(o){} : callback;
		wa.sendMessage('putContents', { path: path, data: data }, fn );
	},
	writeBase64DataToFile : function(path, data, callback){
		var fn = (typeof(callback)=="undefined") ? function(o){} : callback;
		wa.sendMessage('writetofile', { path: path, data: data, base64:true }, fn );
	},
	getContents : function(path, callback){
		wa.sendMessage('getcontents', { path: path }, callback );
	},
	createDirectory : function(path, callback){
		var fn = (typeof(callback)=="undefined") ? function(o){} : callback;
		wa.sendMessage('createdirectory', { "path": path }, callback );
	},
	dialogSelectDirectory : function(callback){
		wa.sendMessage('dialogselectdirectory', { }, callback );
	},
	writePNG : function(path, base64DataUrl, callback){
		var fn = (typeof(callback)=="undefined") ? function(o){} : callback;
		var data = base64DataUrl.replace(/^data:image\/png\;base64\,/, ''); //remove mime

		wa.fs.writeBase64DataToFile(path, data, fn);
	}
};

