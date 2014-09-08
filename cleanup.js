var AWS = require('aws-sdk');
var config = require('./config.json');
var ec2 = require('./ec2/ec2.js');
var eip = require('./ec2/eip.js');
var elb = require('./ec2/elb.js');
var ebs = require('./ec2/ebs.js');
var ebsSnapshot = require('./ec2/ebsSnapshot.js');
var rds = require('./rds/rds.js');
var as = require('./ec2/as.js');
var redshift = require('./redshift/redshift.js');
var sns = require('./sns.js');
var emr = require('./emr.js');
var cloudwatch = require('./cloudwatch.js');
var prompt = require('prompt');
var fs = require('fs');

config = JSON.parse(JSON.stringify(config));
var cred = {};
var accountId = '';

if (fs.existsSync('./aws-credentials.json')) {
    AWS.config.loadFromPath('./aws-credentials.json');
    confirm();
}
else{
	prompt.start();
	prompt.get(['AWS_Access_Key', 'AWS_Secret_Access_Key'], function (err, result) {
		cred['accessKeyId'] = result.AWS_Access_Key;
		cred['secretAccessKey'] = result.AWS_Secret_Access_Key;
		cred['region'] = "us-east-1";
		
		AWS.config.update(cred);
		confirm();
	});
	
}

function confirm(){
	console.log('WARNING: You are about to delete your AWS resources permanently. Are you sure you want to proceed?')
	var property = {
		name: 'yesno',
		message: 'yes/no?',
		validator: /y[es]*|n[o]?/,
		warning: 'Must respond yes or no',
		default: 'no'
	};
	prompt.get(property, function (err, result) {
		if(result.yesno == 'yes' || result.yesno == 'y'){
			var data = getAccountId(AWS);
		}
	});
}

function clean(){
	var regions = config['regions'];
	console.log("Starting cleanup process ...");
	for(var region in regions){
		if(regions[region]=="true"){
			if(config['services']['as'])
				as.clean(AWS,region);
			if(config['services']['ec2'])
				ec2.clean(AWS,region);
			if(config['services']['eip'])
				eip.clean(AWS,region);
			if(config['services']['elb'])
				elb.clean(AWS,region);
			if(config['services']['ebs'])
				ebs.clean(AWS,region);
			if(config['services']['rds'])
				rds.clean(AWS,region);
			if(config['services']['redshift'])
				redshift.clean(AWS,region);
			if(config['services']['sns'])
				sns.clean(AWS,region);
			if(config['services']['cloudwatch'])
				cloudwatch.clean(AWS,region);
			if(config['services']['ebsSnapshot']["enabled"])
			 	ebsSnapshot.clean(AWS,region,accountId,config.services.ebsSnapshot.olderThanDays);
		}
	}	
}

var getAccountId = function (AWS){
	var iam = new AWS.IAM({apiVersion: '2010-05-08'});
	var getUser = iam.getUser();

	getUser.on('error',function(resp){
		console.log('Error occured while get AWS AccountId:');
		console.log(resp);
	});
	getUser.on('success',function(resp){
		accountId = resp.data.User.Arn.match(/([0-9]+)/)[0];
		console.log('Successfully determined AWS AccountId:',accountId);
		clean();
	});
	getUser.send();
}