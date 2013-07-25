
// http requests
var request = require('request');

// defer
var Q = require('q');

// Querystring
var querystring = require('querystring');

// uuid
var uuid = require('node-uuid');

// Urban Airship Push Notifications
var UA = require('urban-airship');
ua = new UA(creds.ua_app_key, creds.ua_app_secret, creds.ua_app_master_secret);

// Underscore
var _ = require('underscore');

// Handle a ping from an event
function ping(req,res){
	// Handle a Ping request
	// - just respond with a true
	// - doesn't deal with auth at all? 

	// Set response Content-Type
	if(req.body.obj == 'ping'){
		res.contentType('json');
		res.send({
			ping: true
		});
		console.log('pinged');
		return true;
	}

	return false;
}

exports.test_register = function(req, res){
	// testing push notifications

	// Triggered by an Event from emailbox
	// - send a Push Notification with arbitrary text to a device we're using. 

	// Register device
	var test_token;
	ua.registerDevice(test_token, function(err) {
		if(err){
			console.log('Error w/ Push Test');
			console.log(err);
			return;
		}
		console.log('No errors registerDevice!');
	});

};

exports.test_push = function(req, res){

	var test_token = "APA91bHNcKn5YXUsAy4tONQEk7HqCKzE8vqvw-hCbtzP3BR1xyj4ZBj55uzwXT-GNBA3n6s_NiQCHvPE7SmCU3YNB7qs9nC2--GNF2ReUSB-jahZCEgZBwrCsvUSLljANqqvjJr3E605z6vrAwB0r73qeuQC-Lcuig";

	console.log('Starting registration');

	// Test pushing to User
	// exports.pushToAndroid = function(registration_id, data, collapseKey, timeToLive, numRetries){
	models.Api.pushToAndroid(test_token, {p1: 'test1'}, 'Test Collapse', null, null)
		.then(function(pushResult){
			console.log('Result');
			console.log(pushResult.result);
			if(pushResult.err){
				console.log('Error with result');
				console.log(pushResult.err);
			}
			if(!pushResult.result.success){
				// Seems to have had an error
				console.log('--result.success not 1');
			}
		});

	// ua.registerDevice(test_token, {'alias' : 'test1'}, function(err) {
	// 	if(err){
	// 		console.log('Error w/ Push Test');
	// 		console.log(err);
	// 		return;
	// 	}
	// 	console.log('No errors registerDevice!');
	// });

	res.send('done test');
	return;

	// // Send Push Notification
	// var pushData = {
	// 	"apids": [
	// 		test_token,
	// 	],
	// 	"android": {
	// 		 "alert": "Hello from Urban Airship!",
	// 		 "extra": {"a_key":"a_value"}
	// 	}
	// };
	// console.log('sending');
	// ua.pushNotification("/api/push", pushData, function(error) {
	// 	console.log('err');
	// 	console.log(error);
	// });
	// console.log('after sending');

	// res.send('done');

};

exports.login = function(req, res){
	// A user is trying to login using an emailbox access_token

	console.log('exports.login');

	// Set response Content-Type
	res.contentType('json');

	var bodyObj = req.body;
	
	if(typeof bodyObj != "object"){
		jsonError(res, 101, "Expecting object");
		return;
	}
	if(typeof bodyObj.access_token != "string"){
		jsonError(res, 101, "Expecting access_token",bodyObj);
		return;
	}

	// Request updated credentials from Emailbox
	// - via /api/user
	models.Api.loginUser(bodyObj)
		.then(function(user){
			// Succeeded in logging in the user
			// - log this person in using a cookie

			req.session.user = user; // user is OUR version of the user

			// Return success
			jsonSuccess(res,'Logged in',{
				user: {
					id: user.id
				}
			});

		})
		.fail(function(result){
			// Failed to log the user in
			jsonError(res,101,'Unable to log this user in', result);
		});

	// Do we already have this User ID?
	// - update or insert if we do

};

// exports.create_defaults = function(req, res){
// 	// A user is trying to update some local parameters

// 	console.log('exports.login');

// 	// Set response Content-Type
// 	res.contentType('json');

// 	var bodyObj = req.body;
	
// 	if(typeof bodyObj != "object"){
// 		jsonError(res, 101, "Expecting object");
// 		return;
// 	}
// 	if(typeof bodyObj.access_token != "string"){
// 		jsonError(res, 101, "Expecting access_token",bodyObj);
// 		return;
// 	}

// 	// Request updated credentials from Emailbox
// 	// - via /api/user
// 	models.Api.updateUser(bodyObj)
// 		.then(function(user){
// 			// Succeeded updated user
// 			// 
// 			req.session.user = user; // user is OUR version of the user

// 			// Return success
// 			jsonSuccess(res,'Updated user',{
// 				user: {
// 					id: user.id
// 				}
// 			});

// 		})
// 		.fail(function(result){
// 			// Failed to log the user in
// 			jsonError(res,101,'Unable to log this user in', result);
// 		});

// 	// Do we already have this User ID?
// 	// - update or insert if we do

// };

exports.logout = function(req, res){
	req.session.user = null;
	jsonSuccess(res,'Logged out');
};

exports.new_approval = function(req, res){
	// Handle a new contact being approved

	var bodyObj = req.body;

	if(ping(req,res)){
		return;
	}

	var getUser = Q.defer();

	// Get the local user_id
	models.User.get_local_by_emailbox_id(bodyObj.auth.user_id)
		.then(function(local_user){;
			getUser.resolve(local_user);
		})
		.fail(function(errData){
			jsonError(res, 101, 'Failed authorizing user');
		});

	getUser.promise
		.then(function(local_user){

			console.log('Checking for existing contact');

			var my_email = 'nicholas.a.reed@gmail.com'; 			// CHANGE FROM HARDCODED EMAIL!!

			// Get the email address to check against
			// - validate the email also (todo)
			var email = bodyObj.obj.email,
				fullname = bodyObj.obj.name || bodyObj.obj.email;

			console.log('fn');
			console.log(fullname);

			// See if this exists already in the user's db
			var searchData = {
				model: 'ConvomailConversation',
				conditions: {
					contact_email: email
				}
			};
			models.Emailbox.count(searchData,bodyObj.auth)
				.then(function(returnCount){
					console.log('returnCount');
					console.log(returnCount);
					if(returnCount > 0){
						// Already exists
						jsonSuccess(res, 'Contact already exists');
						return;
					} 
					// Does not exist
					// - create it
					var writeData = {
						model: 'ConvomailConversation',
						obj: {
							contact_email: email,
							name: fullname
						}
					};
					models.Emailbox.write(writeData, bodyObj.auth)
						.then(function(result){
							// Written

							// Wrote ConvomailConversation OK
							var conversation_id = result._id;

							// Get all the emails that are part of the conversation and update them
							var updateEmailsData = {
								model: 'Email',
								conditions: {
									'$or' : [
										{
											'original.headers.From_Parsed.0.1' : email
										},
										{
											'$and' : [
												{
													'original.headers.From_Parsed.0.1' : my_email
												},
												{
													'original.headers.To_Parsed.$.1' : email
												}
											]
										}
									]
								},
								paths: {
									'$addToSet' : {
										'app.AppPkgDevConvomail.conversation_ids' : conversation_id
									}
								},
								multi: true,
								limit: 1000,
								sort: {
									_id: -1
								}
							};
							models.Emailbox.update(updateEmailsData, bodyObj.auth)
								.then(function(result){
									console.log('update Result');
									console.log(result);
								});

							// Update the conversation based on the latest email received
							// - same search conditions
							var searchLatestEmail = {
								model: 'Email',
								conditions: {
									'$or' : [
										{
											'original.headers.From_Parsed.0.1' : email
										},
										{
											'$and' : [
												{
													'original.headers.From_Parsed.0.1' : my_email
												},
												{
													'original.headers.To_Parsed.$.1' : email
												}
											]
										}
									]
								},
								fields: ['common','original'],
								limit: 1,
								sort: {
									_id: -1
								}
							};
							models.Emailbox.search(searchLatestEmail, bodyObj.auth)
								.then(function(result){
									if(result.length < 1){
										// Uh oh, could not find any matching
										console.log('Could not find latest');
										return;
									}
									var latestEmail = result[0].Email;

									// console.log('latest');
									// console.log(latestEmail);

									// Update info in Conversation
									var updateLatestData = {
										model: 'ConvomailConversation',
										conditions: {
											_id: conversation_id
										},
										paths: {
											'$set' :  {
												'latest_email' : latestEmail
											}
										}
									};
									models.Emailbox.update(updateLatestData, bodyObj.auth)
										.then(function(updateResult){
											// Should have updated a single 1
											if(updateResult != 1){
												console.log("Failed updating updateLatestResult");
												return;
											}
											// Updated OK
											console.log('Final Update ok');

										});

								})
								.fail(function(err){
									console.log('Update3 fail');
									console.log(err);
								});


							// Let the updates (previously triggered) happen in the background, while we return
							jsonSuccess(res, "Conversation Created");

						});


				});




		});

};


exports.refresh_conversations = function(req, res){
	// Gets all my conversations and makes sure no emails were missed for each
	// - todo
};


exports.incoming_email = function(req, res){
	// Figure out if we need to alert (Push Notify) the person affected
	
	// Uses an interval to alert the person, but only within the next hour

	// Should have notify_on_* in the person's Settings (stored on emailbox?)
	// - by default, send push notifications to everybody who is signed up! 

	var bodyObj = req.body;

	if(ping(req,res)){
		return;
	}

	// Just return immediately
	res.send('Triggered incoming_email');

	// Validate request
	// - todo...

	// Wait a few seconds for email to be fully parsed by Thread, etc.
	// - 2 seconds
	setTimeout(function(){

		// Get the Email
		// - make a request to the API with the _id
		var email = bodyObj.obj;

		var searchData = {
			model: 'Email',
			conditions: {
				_id: email._id
			},
			fields: ['app.AppPkgDevConvomail',
					 'attributes.thread_id',
					 'common.date_sec',
					 'original.TextBody',
					 'original.labels',
					 'original.headers.From',
					 'original.headers.From_Parsed',
					 'original.headers.Subject',
					 'original.ParsedData.[0]',
					 'original.ParsedData.0'
					 ],
			limit: 1
		};

		console.log('Searching');

		// Create deferred for gathering user information from local db and emailbox (settings, email received, etc.)
		var getUser = Q.defer();

		// Get the local user_id, and the Emailbox User
		models.User.get_local_by_emailbox_id(bodyObj.auth.user_id)
			.then(function(local_user){

				var userSearchData = {
					model: 'AppConvomailSettings', // Settings for the App
					conditions: {
						_id: 1 // set the _id to 1 to guarantee the same settings retrieved (not sort and limit)
					},
					fields: [],
					limit: 1
				};

				// Get settings stored on Emailbox
				models.Emailbox.search(userSearchData,bodyObj.auth)
					.then(function(eUserSettings){
						// console.log('eUserSettings');
						// console.log(eUserSettings);
						// eUserSettings[0].AppPkgDevConvomailSettings
						
						// Got the emailbox User settings?
						if(eUserSettings.length != 1){
							// Not created yet
							// - create them?

							// Create the emailbox_user_settings
							models.User.create_emailbox_settings(bodyObj.auth)
								.then(function(err, emailbox_user_settings_after_created){
									// Back from creating/updating emailbox_settings
									// - have data
									if(err){
										// Damnit, something broke
										// - continue, but not gonna be sending Push Notifications I guess
										console.log('Err create_emailbox_settings');
										getUser.resolve([local_user, null]);
										return;
									}
									// Resolve promise with new emailbox settings for user
									getUser.resolve([local_user, emailbox_user_settings_after_created]);
								});
							return; // don't continue to resolving promise
						}

						// Got the local and emailbox user settings, continue on
						// console.log('Emailbox User Settings');
						// console.log(eUserSettings[0]);
						getUser.resolve([local_user, eUserSettings[0]]);
					});
			});

		getUser.promise.then(function(user){

			var local_user = user[0],
				emailbox_user_settings = user[1];

			models.Emailbox.search(searchData,bodyObj.auth)
				.then(function(emails){

					console.log('New Incoming');

					if(emails.length != 1){
						// Couldn't find the email
						console.log('Unable to find matching email');
						return;
					}

					var email = emails[0];

					// Get labels
					var labels = email.Email.original.labels;

					var use_address = [];

					// Sent or Received?
					if(labels.indexOf('\\\\Sent') == -1){
						// Received
						// - use From address
						use_address = [email.Email.original.headers.From_Parsed[0][1]];
					} else {
						// Sent
						// - so we're using the To address as the conversation address identifier
						use_address = _.map(email.Email.original.headers.To_Parsed, function(addr){
							return addr[1];
						});
					}

					console.log('use_address');
					console.log(use_address);

					// Figure out the conversation's affected
					var conversationSearchData = {
						model: 'ConvomailConversation',
						conditions: {
							contact_email : {
								'$in' : use_address
							}
						},
						fields: [],
						limit: 1000
					};
					console.log(conversationSearchData);
					models.Emailbox.search(conversationSearchData, bodyObj.auth)
						.then(function(conversations){

							// Any conversations?

							var conversation_ids = _.map(conversations, function(convo){
								return convo.ConvomailConversation._id;
							});

							
							if(conversation_ids.length < 1){
								// No conversations
								console.log('No conversations affected');
								jsonSuccess(res, 'No conversations');
								return;
							}

							console.log('conversation_ids');
							console.log(conversation_ids);

							// Update this Email with the conversation_ids
							var updateEmailData = {
								model: 'Email',
								conditions: {
									_id: email.Email._id
								},
								paths: {
									'$addToSet' : {
										'app.AppPkgDevConvomail.conversation_ids' : {
											'$each' : conversation_ids
										}
									}
								}
							};
							models.Emailbox.update(updateEmailData, bodyObj.auth)
								.then(function(updatedCount){
									// Should have succeded
									console.log('Update1 succeeded');
									console.log(updatedCount);
								})
								.fail(function(err){
									// server probably down
									console.log("Failed emailbox update from sent or received");
									console.log(err);
								});

							// Update each conversation with the latest email
							// - only update the "Read" status if this is a "Received" email
							var updateConversationData = {
								model: 'ConvomailConversation',
								multi: true,
								conditions: {
									_id: {
										'$in' : conversation_ids
									}
								},
								paths: {
									'$set' : {
										latest_email : email.Email
									}
								}
							};
							models.Emailbox.update(updateConversationData, bodyObj.auth)
								.then(function(updatedCount){
									// Should have succeded
									console.log('Update2 succeeded');
									console.log(updatedCount);
								})
								.fail(function(err){
									// server probably down
									console.log("Failed emailbox update from sent or received2");
									console.log(err);
								});

						})
						.fail(function(err){
							console.log('Failed searching for conversationSearchData');
						});


					// Get the From address, and figure out which conversation that is in
					var from_address = email.Email.original.headers.From_Parsed

					var updateEmailData = {
						model: 'Email',
						id: email.Email._id,
						paths: {
							"$addToSet" : {
								"app.AppPkgDevConvomail.links" : links
							}
						}
					};
					models.Emailbox.update(updateEmailData, bodyObj.auth)
						.then(function(dataResponse){
							if(dataResponse != 1){
								console.log('Failed updating links');
								console.log(dataResponse);
								return;
							}
							console.log('Updated email links');
						});

				});
			});

	},2000);

};


exports.incoming_email_action = function(req, res){
	// Handle an action from another client
	// - like Gmail web interface

	// Handles:
	// - Email.action
	// - Thread.action

	// console.log('incoming action');

	// res.send('Triggered wait_until_fired');

	if(ping(req,res)){
		return;
	}

	var bodyObj = req.body;
	
	if(typeof bodyObj != "object"){
		jsonError(res, 101, "Expecting object");
		return;
	}
	if(typeof bodyObj.auth.user_id != "string"){
		jsonError(res, 101, "Expecting user_id",bodyObj);
		return;
	}

	// If coming from ourselves, ignore it (already made the changes!)
	if(bodyObj.auth.app == creds.app_key){
		console.log('Emitted by ourselves, our data (app.AppPkgDevConvomail.done) already changed');
		jsonSuccess(res, 'Emitted by ourselves');
		return;
	}

	// User is passed along with the request

	// Validate actions to take
	if(typeof bodyObj.obj.action != 'string'){
		console.log('Failed, expecting .action');
		jsonError(res, 101, 'Expecting .action');
		return;
	}
	if(typeof bodyObj.obj._id != 'string'){
		console.log('Failed, expecting .action');
		jsonError(res, 101, 'Expecting .action');
		return;
	}

	var useLabel = false;
	switch(bodyObj.obj.action){
		case 'archive':
			if(typeof bodyObj.obj.label != 'undefined'){
				if(typeof bodyObj.obj.label != 'string'){
					// Must be a string
					console.log('Missing string for .label');
					jsonError(res, 101, 'Missing string for .label');
					return;
				} else {
					useLabel = true;
				}
			}
		case 'inbox':
		case 'star':
		case 'unstar':
		case 'read':
		case 'unread':
			break;

		case 'label':
		case 'unlabel':
			useLabel = true;
			if(typeof bodyObj.obj.label != 'string'){
				console.log('Missing .label');
				jsonError(res, 101, 'Missing .label');
				return;
			}
			if(bodyObj.obj.label.length < 1){
				console.log('Missing .label at least 1 character');
				jsonError(res, 101, 'Missing .label at least 1 character');
				return;
			}
			break;
		default:
			console.log('Invalid .action');
			jsonError(res, 101, 'Invalid .action');
			return;
	}


	// Email or Thread?
	// - by default: bodyObj.event == 'Email.action'
	var searchData = {
		model: 'Email',
		conditions: {
			_id: bodyObj.obj._id // only difference with above (refactor)
		},
		fields: ['attributes.thread_id'],
		limit: 1,
		sort: {
			_id : -1
		}
	};

	if(bodyObj.event == 'Thread.action'){
		// Using a thread, need to get an email for that/each Thread!

		// Should get an Email foreach Thread
		// - could be passing alot of Threads?
		searchData['conditions'] = {
			'attributes.thread_id': bodyObj.obj._id
		};
		searchData['limit'] = 100 // 100 emails per thread allowed to be changed (fixed issue with not all Threads being affected?)

	}
	


	// We only really care about a few events
	// - archive, inbox : correlate to done and delays
	switch(bodyObj.obj.action){
		case 'archive':
			// Moving Thread to 'done' status
			// Get the Thread for this email
			console.log('Archive');

			// Get Email with Thread._id
			models.Emailbox.search(searchData,bodyObj.auth)
				.then(function(emailObj){

					// console.log(emailObj);

					// Check length of emailObj
					if(emailObj.length < 1){
						jsonError(res, 101, 'bad length1',emailObj);
						return false;
					}
					if(emailObj.length > 100){
						jsonError(res, 101, 'bad length2',emailObj);
						return false;
					}

					// Update Thread
					// console.log('Update Thread');
					// console.log(emailObj[0].Email.attributes.thread_id);
					models.Emailbox.update({
						model: 'Thread',
						id: emailObj[0].Email.attributes.thread_id,
						paths: {
							'$set' : {
								'app.AppPkgDevConvomail.done' : 1
							}
						}
					},bodyObj.auth);
				});

			break;
		case 'inbox':
			// Moving back to the inbox
			// - treat this as a "due now!" type of event?
			// - don't emit any events though, or any Push Notifications
			console.log('Inbox');

			// Get Email with Thread._id
			models.Emailbox.search(searchData,bodyObj.auth)
				.then(function(emailObj){

					// Check length of emailObj
					if(emailObj.length < 1){
						jsonError(res, 101, 'bad length1',emailObj);
						return false;
					}
					if(emailObj.length > 100){
						jsonError(res, 101, 'bad length2',emailObj);
						return false;
					}

					// Update Thread
					models.Emailbox.update({
						model: 'Thread',
						id: emailObj[0].Email.attributes.thread_id,
						paths: {
							'$set' : {
								'app.AppPkgDevConvomail.done' : 0
							}
						}
					},bodyObj.auth);
				});
			break;
		default:
			console.log('nothing');
			break;
	}

	jsonSuccess(res, 'Returning');


};



exports.incoming_convomail_action = function(req, res){

};



exports.stats = function(req, res){
	// Gets stats for a person
	// - does a realtime lookup, doesn't cache anything

	var bodyObj = req.body;

	if(ping(req,res)){
		return;
	}

	var getUser = Q.defer();

	// Get the local user_id
	models.User.get_local_by_emailbox_id(bodyObj.auth.user_id)
		.then(function(local_user){;
			getUser.resolve(local_user);
		})
		.fail(function(errData){
			jsonError(res, 101, 'Failed authorizing user');
		});

	getUser.promise
		.then(function(local_user){

			console.log('Perform each search');

			// Timezone offset
			var timezone_offset = parseInt(bodyObj.obj.timezone_offset, 10) || 0;

			// Perform each search
			// - not in parallel against the user's DB
			var resultsDeferred = [];
			
			// 0 - sent vs received
			resultsDeferred.push(models.Stats.sent_vs_received(bodyObj, timezone_offset));

			// Wait for all searches to have been performed
			Q.allResolved(resultsDeferred)
				.then(function(promises){

					// All searches complete
					// - get all of them and return along with indexKey
					var endResults = {};
					promises.forEach(function (promise, index) {
						var tmp_val = promise.valueOf();

						if(index == 0){
							endResults['sent_vs_received'] = tmp_val;
						}

					});
					jsonSuccess(res, '', endResults);
				})
				.fail(function(data){
					// data == [ indexKey, errCode, errMsg, errData ]
					console.log('fail runEventCreate multiple');
					console.log(data);
					jsonError(res, 101, "Failed creating multiple events");
				});


		});

};


exports.fullcontact = function(req, res){
	// Gets fullcontact data for a person
	// - does a realtime lookup, doesn't cache anything

	var bodyObj = req.body;

	if(ping(req,res)){
		return;
	}
	

	var getUser = Q.defer();

	// Get the local user_id
	models.User.get_local_by_emailbox_id(bodyObj.auth.user_id)
		.then(function(local_user){;
			getUser.resolve(local_user);
		})
		.fail(function(errData){
			jsonError(res, 101, 'Failed authorizing user');
		});

	getUser.promise
		.then(function(local_user){

			console.log('Gathering FullContact data');

			// Get the email to test
			if(typeof bodyObj.obj.email != "string"){
				jsonError(res, 101, "Invalid email provided");
				return;
			}

			var email = bodyObj.obj.email.toLowerCase();

			var url = 'https://api.fullcontact.com/v2/person.json?email=' + email + '&apiKey=' + creds.fullcontact_api_key;

			var options = {
				url: url,
				port: 80,
				method: 'GET'
			};

			var outReq = request.post(options, function(e, r, outRes) {

				// Got response from fullContact
				console.log('Got response from FullContact');

				try {
					if(typeof outRes == "string"){
						outRes = JSON.parse(outRes);
					}
					
					res.send({
						code: 200,
						fullcontact_data: outRes
					});

				} catch(err){
					console.log('FullContact parsing error');
					console.log(err);
				}

			});

		});

};


exports.textteaser = function(req, res){
	// Gets fullcontact data for a person
	// - does a realtime lookup, doesn't cache anything

	var bodyObj = req.body;

	if(ping(req,res)){
		return;
	}
	

	var getUser = Q.defer();

	// Get the local user_id
	models.User.get_local_by_emailbox_id(bodyObj.auth.user_id)
		.then(function(local_user){;
			getUser.resolve(local_user);
		})
		.fail(function(errData){
			jsonError(res, 101, 'Failed authorizing user');
		});

	getUser.promise
		.then(function(local_user){

			console.log('Gathering TextTeaser data');

			// Get the email to test
			if(typeof bodyObj.obj.text != "string"){
				jsonError(res, 101, "Invalid text provided");
				return;
			}
			if(typeof bodyObj.obj.title != "string"){
				jsonError(res, 101, "Invalid title provided");
				return;
			}

			var url = 'http://www.textteaser.com/api/';

			var options = {
				url: url,
				port: 80,
				method: 'POST',
				body: {
					token: creds.textteaser_api_token,
					text: bodyObj.obj.text,
					title: bodyObj.obj.title
				}
			};

			console.log(options);

			var outReq = request.post(options, function(e, r, outRes) {

				// Got response from TextTeaser
				console.log('Got response from TextTeaser');

				try {
					if(typeof outRes == "string"){
						outRes = JSON.parse(outRes);
					}
					
					res.send({
						code: 200,
						textteaser_data: outRes
					});

				} catch(err){
					console.log('Textteaser parsing error');
					console.log(err);
				}

			});

		});

};

