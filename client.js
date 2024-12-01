//our username 
var name; 
var connectedUser;
  
var conn = new WebSocket('ws://localhost:9090');
  
conn.onopen = function () { 
   console.log("Connected to the signaling server"); 
};


conn.onmessage = function (msg) { 
   console.log("Got message", msg.data);
	
   var data = JSON.parse(msg.data); 
	
   switch(data.type) { 
      case "login": 
         handleLogin(data.success); 
         break; 
      case "offer": 
         handleOffer(data.offer, data.name); 
         break; 
      case "answer": 
         handleAnswer(data.answer); 
         break; 
      case "candidate": 
         handleCandidate(data.candidate); 
         break; 
      case "leave": 
         handleLeave(); 
         break; 
      default: 
         break; 
   }
};
  
conn.onerror = function (err) { 
   console.log("Got error", err); 
};
  
function send(message) { 
   if (connectedUser) { 
      message.name = connectedUser; 
   } 
	
   conn.send(JSON.stringify(message)); 
};
  

 
var loginPage = document.querySelector('#loginPage'); 
var usernameInput = document.querySelector('#usernameInput'); 
var loginBtn = document.querySelector('#loginBtn'); 

var callPage = document.querySelector('#callPage'); 
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn'); 

var hangUpBtn = document.querySelector('#hangUpBtn');
  
var localVideo = document.querySelector('#localVideo'); 
var remoteVideo = document.querySelector('#remoteVideo'); 

var yourConn; 
var stream;
  
callPage.style.display = "none";

loginBtn.addEventListener("click", function (event) { 
   name = usernameInput.value;
	
   if (name.length > 0) { 
      send({ 
         type: "login", 
         name: name 
      }); 
   }
	
});
  
function handleLogin(success) { 
   if (success === false) { 
      alert("Ooops...try a different username"); 
   } else { 
      loginPage.style.display = "none"; 
      callPage.style.display = "block";

      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(function(myStream) { 
         stream = myStream; 
			
         localVideo.srcObject = stream;
			
         var configuration = { 
            "iceServers": [{ "urls": "stun:stun2.1.google.com:19302" }]
         }; 
			
         yourConn = new webkitRTCPeerConnection(configuration); 
			
         yourConn.addStream(stream); 
			
         yourConn.onaddstream = function (e) { 
            remoteVideo.srcObject = e.stream;
         };
			
         yourConn.onicecandidate = function (event) { 
            if (event.candidate) { 
               send({ 
                  type: "candidate", 
                  candidate: event.candidate 
               }); 
            } 
         };  
			
      }).catch(function(error) {
          console.error(error);
      });
		
   } 
};
  
callBtn.addEventListener("click", function () { 
   var callToUsername = callToUsernameInput.value;
	
   if (callToUsername.length > 0) { 
	
      connectedUser = callToUsername;
		
      yourConn.createOffer(function (offer) { 
         send({ 
            type: "offer", 
            offer: offer 
         }); 
			
         yourConn.setLocalDescription(offer); 
      }, function (error) { 
         alert("Error when creating an offer"); 
      });
		
   } 
});
  
function handleOffer(offer, name) { 
   connectedUser = name; 
   yourConn.setRemoteDescription(new RTCSessionDescription(offer));
	
   yourConn.createAnswer(function (answer) { 
      yourConn.setLocalDescription(answer); 
		
      send({ 
         type: "answer", 
         answer: answer 
      }); 
		
   }, function (error) { 
      alert("Error when creating an answer"); 
   }); 
};
  
function handleAnswer(answer) { 
   yourConn.setRemoteDescription(new RTCSessionDescription(answer)); 
};
  
function handleCandidate(candidate) { 
   yourConn.addIceCandidate(new RTCIceCandidate(candidate)); 
};
   
hangUpBtn.addEventListener("click", function () { 

   send({ 
      type: "leave" 
   });  
	
   handleLeave(); 
});
  
function handleLeave() { 
   connectedUser = null; 
   remoteVideo.src = null; 
	
   yourConn.close(); 
   yourConn.onicecandidate = null; 
   yourConn.onaddstream = null;
   if (statsInterval) {
      clearInterval(statsInterval);
  }
};

let previousBytesSent = 0;
let statsInterval;

// Start monitoring stats
statsInterval = setInterval(() => {
   yourConn.getStats(null).then((stats) => {
       stats.forEach((report) => {
           if (report.type === "outbound-rtp" && report.kind === "video") {
               const bytesSent = report.bytesSent;
               const bitrate = ((bytesSent - previousBytesSent) * 8) / 1000; // kbps
               previousBytesSent = bytesSent;

               console.log(`Video bitrate: ${bitrate.toFixed(2)} kbps`);
           }
       });
   }).catch((err) => {
       console.error("Error getting stats:", err);
   });
}, 1000); // Log stats every second