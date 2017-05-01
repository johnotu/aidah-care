const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const database = require('./utils/database.json');
const config = require('config');
const aidahCare = express();


const token = process.env.FB_VERIFY_TOKEN
const access = process.env.FB_ACCESS_TOKEN

aidahCare.set('port', (process.env.PORT || 5000))
aidahCare.use(bodyParser.urlencoded({extended: false}))
aidahCare.use(bodyParser.json())

aidahCare.get('/', function(req,res){
	res.send('Hello world!')
})

aidahCare.get('/webhook', function(req, res){
	if(req.query['hub.verify_token'] === token){
		res.send(req.query['hub.challenge'])
	}
	res.send('No entry')
})

aidahCare.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {

    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});

function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {

    // If we receive a text message, check to see if it matches a keyword
    // and send back the example. Otherwise, just echo the text we received.
    switch (messageText) {
      case 'generic':
        sendGenericMessage(senderID);
        break;
			case 'begin':
					beginDialog(senderID);
					break;

      default:
        sendTextMessage(senderID, messageText);
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}

function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: access },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s",
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });
}

//get users profile
let userProfile;

function getUserProfile(senderID){
	 var options = {
	 url: 'https://graph.facebook.com/v2.6/' + senderID + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + token
};

function callback(error, response, body) {
	 if (!error && response.statusCode == 200) {
			 userProfile = JSON.parse(body);
			 console.log(body, 'user profile obtained successful');
	 } else{
		 console.error('failed to obtained user profile', body.error);
	 }
}

request(options, callback);

}

function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " +
    "at %d", senderID, recipientID, payload, timeOfPostback);
		switch(payload){
			case 'begin':
				getUserProfile(senderID);
				var msg = `Hello ${userProfile.first_name}! welcome to Aidah Care.`;
					sendTextMessage(senderID, msg);
					beginDialog(senderID);
					break;
    	case 'cuts':
      	selectfirsAidType(senderID, 'cuts');
      	break;
      	case 'returnedDeep':
        	var content = database.firstAid.cuts.list[0].content;
        	var cautions = database.firstAid.cuts.list[0].cautions;
        		sendTextMessage(senderID, content);
          	sendTextMessage(senderID, cautions);
        	break;
    	case 'burns':
      	selectfirsAidType(senderID, 'burns');
      	break;
    	case 'diarrhea':
        sendTextMessage(senderID, 'diarrhea');
        break;
  }
}

  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful
//   sendTextMessage(senderID, "Postback called");
// }

function sendQuickReply(recipientID, text, quickReplies){
     var messageData = {
         recipient: {
             id: recipientID
         },
         message: {
             text: text,
             quick_replies: quickReplies
         }
     };
     callSendAPI(messageData);
 }

 function quickReplies(array, title, payload){
     array.push(
         {
             content_type: 'text',
             title: title,
             payload: payload
         }
     );
 }

function beginDialog(recipientID){
     var qrArray = [];
		 quickReplies(qrArray, 'Cuts', 'cuts');
     quickReplies(qrArray, 'Bruise', 'bruise_cuts');
     quickReplies(qrArray, 'Burns', 'burns');
     quickReplies(qrArray, 'Bites & Stings', 'bites&stings');
     quickReplies(qrArray, 'Choking', 'choking');
     quickReplies(qrArray, 'Diarrhea', 'diarrhea');
     quickReplies(qrArray, 'Poisoning', 'poisoning');
     quickReplies(qrArray, 'Scalds', 'scalds');
     quickReplies(qrArray, 'Sex Injury', 'sexinjury');
     quickReplies(qrArray, 'Sprain', 'sprain');

     var text = 'Kindly choose from below to continue. Please type begin to start over';
     sendQuickReply(recipientID, text, qrArray);
 }

function selectfirsAidType(senderID, payload){
     var qrArray = [];
     var arr = database.firstAid[payload].list;
     for(var i=0; i<arr.length; i++){
         quickReplies(qrArray, arr[i].title, arr[i].payload);
     }
     var text = 'what is the situation?';
     sendQuickReply(senderID, text, qrArray);
 }

function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

aidahCare.listen(aidahCare.get('port'), function(){
	console.log('running on port', aidahCare.get('port'))
})
