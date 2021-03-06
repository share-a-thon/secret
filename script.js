var dc, pc = new RTCPeerConnection();
pc.onaddstream = e => v2.srcObject = e.stream;
pc.ondatachannel = e => dcInit(dc = e.channel);
pc.oniceconnectionstatechange = e => log(pc.iceConnectionState);
var haveGum = navigator.mediaDevices.getUserMedia({video:true, audio:true})
  .then(stream => pc.addStream(v1.srcObject = stream)).catch(log);

function dcInit() {
  dc.onopen = () => {
		log("Chat!");
	document.getElementById("conn").remove();
	}
  dc.onmessage = e => {
		process(JSON.parse(e.data));
  }
}

function process(m) {
	switch(m.type) {
		case 'chat':
			log(m.val);
			break;
		case 'file':
			saveFile(m.name, m.val);
			break;
		default:
			console.log("unknown message")
			console.log(m)
	}
}

function createOffer() {
  button.disabled = true;
  dcInit(dc = pc.createDataChannel("chat"));
  haveGum.then(() => pc.createOffer()).then(d => pc.setLocalDescription(d))
    .catch(log);
  pc.onicecandidate = e => {
    if (e.candidate) return;
    offer.value = bytesToBase64(pako.gzip(pc.localDescription.sdp));
    offer.select();
    answer.placeholder = "Paste answer here";
  };
};

offer.onkeypress = e => {
  if (!enterPressed(e) || pc.signalingState != "stable") return;
  button.disabled = offer.disabled = true;
  var desc = new RTCSessionDescription({ type:"offer", sdp: pako.ungzip(base64ToBytes(offer.value), {to: 'string'}) });
  pc.setRemoteDescription(desc)
    .then(() => pc.createAnswer()).then(d => pc.setLocalDescription(d))
    .catch(log);
  pc.onicecandidate = e => {
    if (e.candidate) return;
    answer.focus();
    answer.value = bytesToBase64(pako.gzip(pc.localDescription.sdp));
    answer.select();
  };
};

answer.onkeypress = e => {
  if (!enterPressed(e) || pc.signalingState != "have-local-offer") return;
  answer.disabled = true;
  var desc = new RTCSessionDescription({ type:"answer", sdp: pako.ungzip(base64ToBytes(answer.value), {to: 'string'}) });
  pc.setRemoteDescription(desc).catch(log);
	document.getElementById("conn").remove();
};

chat.onkeypress = e => {
  if (!enterPressed(e)) return;
  dc.send(JSON.stringify({type: 'chat', val: chat.value}));
  log(chat.value);
  chat.value = "";
};

file.onchange = e => {
	file = e.target.files[0];
    var r = new FileReader();
    r.onload = function(e) {
      sendFile(e.target.result, file.name);
    }
    r.readAsText(file);
}

vidtoggle.onchange = e => {
	if (vidtoggle.checked) {
		var haveGum = navigator.mediaDevices.getUserMedia({video:true, audio:true})
  .then(stream => pc.addStream(v1.srcObject = stream)).catch(log);
	} else {
		v1.srcObject = null;
		pc.getSenders().forEach(i => {
			pc.removeTrack(i);
		});
	}
}

function sendFile(file, name) {
    dc.send(JSON.stringify({type: "file", name: name, val: base64encode(file)}));
}

function saveFile(name, cont) {
	var d = document.createElement("div");
	d.className = "smoldialog";
	d.innerText = "You have received a file:\n" + name + "\nSAVE?";
	let yesbutt = document.createElement("button");
	yesbutt.innerText = "YASSSSS";
	yesbutt.onclick = e => {
		d.remove();
		var blob = new Blob([base64decode(cont)], {
			type: "application/octet-stream"
		});
		saveAs(blob, name);
	}
	let nobutt = document.createElement("button");
	nobutt.innerText = "NOOOOOOO";
	nobutt.onclick = e => {
		d.remove();
	}
	d.append(yesbutt, nobutt);
	document.body.append(d);
}

var enterPressed = e => e.keyCode == 13;
var log = msg => document.getElementById("logbox").innerText += msg + "\n\n";
