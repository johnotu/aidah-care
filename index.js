const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const config = require('config');
const aidahCare = express()

aidahCare.set('port', (process.env.PORT || 5000))
aidahCare.use(bodyParser.urlencoded({extended: false}))
aidahCare.use(bodyParser.json())

aidahCare.get('/', function(req,res){
	res.send('Hello world!')
})

aidahCare.get('/webhook', function(req, res){
	if(req.query['hub.verify_token'] === 'boateng'){
		res.send(req.query['hub.challenge'])
	}
	res.send('No entry')
})
aidahCare.listen(aidahCare.get('port'), function(){
	console.log('running on port', aidahCare.get('port'))
})