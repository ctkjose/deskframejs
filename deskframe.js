/*
 *  DeskFrame Helper API
 *  Version 1.0, Jose L Cuevas
 *  http://expresscode.org/deskframe
 */

wa = {
	helperHost : "http://127.0.0.1:9300",
	helperKey : "",
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
		rq.setRequestHeader("Content-length", $payload.length);
		rq.setRequestHeader("Connection", "close");
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
	raiseEvent : function(event, params){

		//this.log( "raiseEvent(" + event + ")" )

		if(!this.listeners[event]) return;
		for(var k in this.listeners[event]){
			var fn = this.listeners[event][k];
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
		wa.sendMessage('execute', { "command": command }, callback );
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
	writeToFile : function(path, data, callback){
		wa.sendMessage('writetofile', { path: path, data: data }, callback );
	},
	getContents : function(path, callback){
		wa.sendMessage('getcontents', { path: path }, callback );
	},
	createDirectory : function(path, callback){
		wa.sendMessage('createdirectory', { "path": path }, callback );
	},
	dialogSelectDirectory : function(callback){
		wa.sendMessage('dialogselectdirectory', { }, callback );
	},
};
