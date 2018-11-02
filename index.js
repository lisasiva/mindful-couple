/* jslint node: true */
/* jslint esnext: true */

const Alexa = require('ask-sdk');
const AWS = require('aws-sdk');
AWS.config.update( {region: 'us-east-1'} );
const docClient = new AWS.DynamoDB.DocumentClient();
const APP_NAME = 'Thanks Dear';
const messages = {
    NOTIFY_MISSING_PERMISSIONS_HAPPY: 'Thanks for your feedback! It would be really helpful to learn which parts you were happy with. If you\'re open to an email from the developer, please toggle on email permission in your Alexa companion app and try the skill again.',
    NOTIFY_MISSING_PERMISSIONS_NOT_HAPPY: 'Thanks for your feedback! It would be really helpful to learn which parts you weren\'t happy with. If you\'re open to an email from the developer, please toggle on email permission in your Alexa companion app and try the skill again.',
    ERROR: 'Uh oh. Something went wrong. To restart the skill, say <break time="0.05s"/> open ' + APP_NAME,
    SURVEY: 'Before we stop, were you happy with this skill today? You can say <break time="0.03s"/> happy <break time="0.03s"/> or not happy.',
};
const EMAIL_PERMISSION = 'alexa::profile:email:read';

//===================================
// LAUNCH AND INTENT HANDLERS
//===================================

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = 'In the craziness of life, this skill helps you make time to show your partner how much you appreciate them. <break time="0.05s"/> To get a quick gratitude idea, say <break time="0.05s"/> give me an idea.';
        const reprompt = 'To hear today\'s gratitude idea, you can say <break time="0.05s"/> give me an idea.';
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(reprompt)
            .withSimpleCard(APP_NAME, speechText)
            .getResponse();
    }
};

const IdeaIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'IdeaIntent';
    },
    handle(handlerInput) {
        const idea = getRandomItem(ideas);
        const cta = ' <break time="0.5s"/> What do you think? You can say, <break time="0.05s"/>I\'ll do it! or <break time="0.05s"/>give me another idea';
        const speechText = 'Here\'s your idea for today: <break time="0.3s"/>' + idea + cta;
        const reprompt = 'You can say, <break time="0.05s"/>I\'ll do it! or <break time="0.05s"/>give me another idea.';
        
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.FromIdeaIntent = true;
        handlerInput.attributesManager.setSessionAttributes(attributes);
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(reprompt)
            .withSimpleCard(APP_NAME, speechText)
            .getResponse();
    }
};

const NextIdeaIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'NextIdeaIntent';
    },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        if (!attributes.FromIdeaIntent) {
            const wrongInvocationResponse = 'Were you trying to hear a new gratitude idea? You can say <break time="0.05s"/>give me an idea.';
            return handlerInput.responseBuilder
                .speak(wrongInvocationResponse)
                .withSimpleCard(APP_NAME, wrongInvocationResponse)
                .getResponse();
        } else {
            const idea = getRandomItem(ideas);
            const cta = ' <break time="0.5s"/> You can say, <break time="0.05s"/>I\'ll do it! or <break time="0.05s"/>give me another idea';
            const speechText = 'How about this one? <break time="0.3s"/>' + idea + cta;
            const reprompt = 'You can say, <break time="0.05s"/>I\'ll do it! or <break time="0.05s"/>give me another idea.';
            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(reprompt)
                .withSimpleCard(APP_NAME, speechText)
                .getResponse();   
        }
    }
};

const DoItIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'DoItIntent';
    },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        if (!attributes.FromIdeaIntent) {
            const wrongInvocationResponse = 'Were you trying to mark an idea complete? I can\'t do that yet, but my developer is working on it.';
            return handlerInput.responseBuilder
                .speak(wrongInvocationResponse)
                .withSimpleCard(APP_NAME, wrongInvocationResponse)
                .getResponse();
        } else {
            attributes.FromDoItIntent = true;
            handlerInput.attributesManager.setSessionAttributes(attributes);
            const praise = getRandomItem(praises);
            const factResults = getRandomFact(facts, factTitles, longFacts);
            const fact = factResults[0];
            const factTitle = factResults[1];
            const longFact = factResults[2];
            const speechText = praise + ' Interestingly, ' + fact + ' <break time="0.3s"/>' + messages.SURVEY;
            return handlerInput.responseBuilder
                .speak(speechText)
                .withSimpleCard(factTitle, longFact)
                .withShouldEndSession(false)
                .getResponse();   
        }
    }
};

const HappyIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'HappyIntent';
    },
    async handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        if (!attributes.FromDoItIntent) {
        const wrongInvocationResponse = 'Were you trying to share feedback on this skill? My developer would really appreciate that! You can email your ideas to lisa@<prosody rate="slow"><say-as interpret-as="spell-out">heyhon.co</say-as></prosody>';
        return handlerInput.responseBuilder
            .speak(wrongInvocationResponse)
            .withSimpleCard(APP_NAME, 'Happy with this skill? You can email feedback to lisa@heyhon.co')
            .getResponse();
        } else {
            try {
                const upsServiceClient = handlerInput.serviceClientFactory.getUpsServiceClient();
                const profileEmail = await upsServiceClient.getProfileEmail();
                const userId = handlerInput.requestEnvelope.session.user.userId;

                const params = {
                    TableName: 'HeyHonFeedback',
                    Item: {
                        'UserId': userId,
                        'happy': true,
                        'email': profileEmail
                    }  
                };

                docClient.put(params, function (err,data) {
                    if (err) {
                        console.log('Error', err);
                    } else {
                        console.log('Success', data);
                    }
                });   

                const speechText = 'I\'m so glad to hear it! Thanks for your feedback.';
                return handlerInput.responseBuilder
                    .speak(speechText)
                    .withSimpleCard('Thanks for Your Feedback!', 'Lisa, the developer, will send you an email soon to thank you personally.')
                    .getResponse();
            } catch (error) {
                console.log('ERROR HANDLING HAPPY INTENT: ' + JSON.stringify(error));
                if (error.statusCode == 403) {
                    const userId = handlerInput.requestEnvelope.session.user.userId;
                    const params = {
                        TableName: 'HeyHonFeedback',
                        Item: {
                            'UserId': userId,
                            'happy': true,
                        }  
                    };

                    docClient.put(params, function (err,data) {
                        if (err) {
                            console.log('Error', err);
                        } else {
                            console.log('Success', data);
                        }
                    });
                    return handlerInput.responseBuilder
                        .speak(messages.NOTIFY_MISSING_PERMISSIONS_HAPPY)
                        .withAskForPermissionsConsentCard([EMAIL_PERMISSION])
                        .getResponse();
                } else {
                    return handlerInput.responseBuilder
                        .speak(ERROR)
                        .getResponse();
                }
            }
        }
    }
};

const NotHappyIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'NotHappyIntent';
    },
    async handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        if (!attributes.FromDoItIntent) {
        const wrongInvocationResponse = 'Were you trying to share feedback on this skill? My developer would really appreciate that! You can email your ideas to lisa@<prosody rate="slow"><say-as interpret-as="spell-out">heyhon.co</say-as></prosody>';
        return handlerInput.responseBuilder
            .speak(wrongInvocationResponse)
            .withSimpleCard(APP_NAME, 'Not happy with this skill? You can email feedback to lisa@heyhon.co')
            .getResponse();
        } else {
            try {
                const upsServiceClient = handlerInput.serviceClientFactory.getUpsServiceClient();
                const profileEmail = await upsServiceClient.getProfileEmail();
                const userId = handlerInput.requestEnvelope.session.user.userId;

                const params = {
                    TableName: 'HeyHonFeedback',
                    Item: {
                        'UserId': userId,
                        'happy': false,
                        'email': profileEmail
                    }  
                };

                docClient.put(params, function (err,data) {
                    if (err) {
                        console.log('Error', err);
                    } else {
                        console.log('Success', data);
                    }
                });   

                const speechText = 'I\'m sorry to hear that! Thanks for your feedback.';
                return handlerInput.responseBuilder
                    .speak(speechText)
                    .withSimpleCard('Your Feedback Means a Lot', 'Lisa, the developer, will be in touch by email about how she can make this skill better.')
                    .getResponse();
            } catch (error) {
                console.log('ERROR HANDLING NOT HAPPY INTENT: ' + JSON.stringify(error));
                if (error.statusCode == 403) {
                    const userId = handlerInput.requestEnvelope.session.user.userId;
                    const params = {
                        TableName: 'HeyHonFeedback',
                        Item: {
                            'UserId': userId,
                            'happy': false,
                        }  
                    };

                    docClient.put(params, function (err,data) {
                        if (err) {
                            console.log('Error', err);
                        } else {
                            console.log('Success', data);
                        }
                    });
                    return handlerInput.responseBuilder
                        .speak(messages.NOTIFY_MISSING_PERMISSIONS_NOT_HAPPY)
                        .withAskForPermissionsConsentCard([EMAIL_PERMISSION])
                        .getResponse();
                } else {
                    return handlerInput.responseBuilder
                        .speak(ERROR)
                        .getResponse();
                }
            }
        }
    }
};


        

//===================================
// HELP, STOP, AND ERROR HANDLERS
//===================================

const HelpIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = 'Of course. This skill suggests fresh ideas to show your partner gratitude, which helps make relationships more resilient. <break time="0.05s"/> Would you like to hear a gratitude idea? You can say <break time="0.05s"/> give me an idea.';
        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && (request.intent.name === 'AMAZON.CancelIntent' || request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speechText = 'Okay. You can always reopen this skill by saying <break time="0.03s"/> open ' + APP_NAME + '. <break time="0.03s"/> Good bye!';
        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log('Error handled: ' + error.message);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

//===================================
// LOGGERS
//===================================

const RequestLog = {
    process(handlerInput) {
        console.log('REQUEST ENVELOPE: ' + JSON.stringify(handlerInput.requestEnvelope));
    }
};

const ResponseLog = {
    process(handlerInput) {
        console.log('RESPONSE BUILDER: ' + JSON.stringify(handlerInput.responseBuilder));
    }
};

//===================================
// HELPER FUNCTIONS
//===================================

function getRandomItem(array) {
    let i = 0;
    i = Math.floor(Math.random() * array.length);
    return array[i];

}

function getRandomFact(array1, array2, array3) {
    let i = 0;
    i = Math.floor(Math.random() * array1.length);
    return [array1[i], array2[i], array3[i]];

}

//===================================
// ARRAYS
//===================================

const ideas = [
    'Write a thoughtful note and slip it into your partner\'s work bag.',
    'Ask your significant other, <break time="0.05s"/> \'What can I do today to make you feel more loved?\' ',
    'Fill in the blank and say to your partner, <break time="0.05s"/> \'I\'m proud of the way you <break time="0.05s"/> blank.\' ',
    'Fill in the blank and say to your partner, <break time="0.05s"/> \'I\'m impressed that you <break time="0.05s"/> blank.\' ',
    'Fill in the blank and say to your partner, <break time="0.05s"/> \'I love how you <break time="0.05s"/> blank.\' ',
    'Write a sticky note, starting with the words <break time="0.05s"/> \'thank you for\' <break time="0.05s"/> and stick it somewhere your partner will see it. ',
    'Next time you ask, <break time="0.05s"/> \'How was your day?\', really listen to the answer. ',
    'Do one chore around the house that, on an ordinary day, your partner would normally do instead. ',
    'Go for a short walk together when you\'re both home from work. ',
    'Make tonight an unexpected date night, even if it\'s just going to the neighborhood pub. ',
    'Take a romantic drive in a new neighborhood this evening. ',
    'Dream about the next big trip you hope to take together. ',
    'Let your significant other pick the next show you watch. ',
    'Offer to help your partner with a specific household chore, without them asking first. ',
    'If your partner is having a tough week, tell them, <break time="0.05s"/> \'I\'m here for you.\' ',
    'Make sure to ask your partner about something that isn\'t a chore, an appointment, or other administrative task.',
    'Reminisce with your significant other about one of your favorite date nights you two shared. ',
    'Ask your partner, <break time="0.05s"/> \'What do you remember most about when we first started dating?\' ',
    'When you two first started dating, what stood out about your significant other? Tell them that. ',
    'This evening, bring home your partner\'s favorite snack. ',
    'Reminise about a vacation you two took together. ',
    'If you can, praise your partner in front of someone else, like a mutual friend, a child, or a parent. ',
    'Instead of grabbing breakfast on the way out, wake up a few minutes early and bring breakfast to your partner in bed. If it\s too late today, try this tomorrow. ',
    'What moments stand out as the high points in your relationship so far? <break time="0.5s"/> Pick one of them and reminisce about it with your partner. ',
    'Pack your partner\'s favorite snack or drink in their work bag. ',
    'Give your partner an extra hug today. ',
    'Send your signifcant other a loving text message today for no reason. ',
    'Keep an eye out for a small gift, <break time="0.5s"/> maybe a snack or a trinket, that reminds you of your partner. ',
    'It\s easy to notice the things our partners do wrong. Instead, pay extra close attention to the things your partner does right today. ',
    'Brew an extra cup of coffee or tea and bring it to your partner while they\'re still in bed. ',
    'Make a Spotify playlist just for the two of you. ',
    'Make up a secret handshake. ',
    'When your partner gets home, greet them at the door. ',
    'Ask your partner to explain a hobby of theirs. ',
    'Let your partner know how great they look. ',
    'Text your significant other a photo of your day, like the view from your office desk, or something interesting you saw on the way home from work. ',
    'Ask your partner, \'What can I do for you to make today a little less stressful?\' ',
    'See something beautiful together, whether it\'s a sunset, the moon, or just the view outside your home. ',
    'Dig up a souvenir from earlier in your relationship, like a photograph, or an old ticket stub. ',
    'Cook or order in something special for dinner. ',
    'Put a loving note, a treat, or a small gift on your partner\'s pillow, so they see it before bed. ',
    'Mornings can be hectic. Make it a little easier by texting your partner an encouraging note on your way to work. ',
    'When your partner solves a mini crisis, whether it\'s an overdue bill or a screaming child, let them know they handled it well. ',
    'Before you go to bed, ask your partner, <break time="0.05s"/> \'What are you most proud of today?\' ',
    'Before you go to bed, ask your partner, <break time="0.05s"/> \'What are you most excited for tomorrow?\' ',
    'Ask your significant other for advice in one area, and then take it. ',
    'Before you go to bed, fill in the blank and tell your significant other, <break time="0.05s"/> \'I thought you did a great job on <break time="0.05s"/> blank <break time="0.05s"/> today. \' ',
    'Encourage your partner to spend time just with their friends. ',
    'If you can, surprise your significant other with a clean car and a full tank of gas. ',
    'Fill in the blank and say to your partner, <break time="0.05s"/> You know, if it weren\'t for you, I couldn\'t do <break time="0.05s"/> blank. ',
    'Go out for a spontaneous drink or dessert this evening. ',
    'Put your partner\'s favorite song on when you can both hear it. ',
    
];

const praises = [
    '<say-as interpret-as="interjection">Awesome!</say-as> <break time="0.3s"/>',
    '<say-as interpret-as="interjection">Great!</say-as> <break time="0.3s"/>',
    '<say-as interpret-as="interjection">Nice!</say-as> <break time="0.3s"/>',
    '<say-as interpret-as="interjection">How thoughtful!</say-as> <break time="0.3s"/>',
    'That\'s <say-as interpret-as="interjection">wonderful!</say-as> <break time="0.3s"/>',
    'I\'m sure your partner will appreciate that. <break time="0.5s"/>'
];

const facts = [
    'gratitude can result in better sleep.',
    'gratitude today may increase relationship satisfaction tomorrow.',
    'close others notice when you practice gratitude.',
    'gratitude may have a big impact on happiness.',
    'gratitude may increase happiness for up to a month.',
    'gratitude may increase relationship commitment.',
    'when you\'re grateful, your partner feels grateful too.'
];

const factTitles = [
    'Gratitude and Sleep',
    'Gratitude and Relationship Satisfaction',
    'Others Notice Gratitude',
    'Gratitude and Happiness',
    'Gratitude and Happiness',
    'Gratitude and Commitment',
    'The Upward Cycle'
];

const longFacts = [
    'Study out of U.C. Davis: People who practiced gratitude for 10 weeks reported better and longer sleep.\r\n (Emmons and McCullough, 2003)',
    'Study out of U.N.C. Chapel Hill: People who are grateful for their partners today experience a significant increase in marital satisfaction tomorrow.\r\n (Algoe et al., 2012)',
    'Study out of U.C. Davis: When people practiced gratitude daily for 3 weeks, their significant others noticed they seemed happier.\r\n (Emmons and McCullough, 2003)',
    'Study out of the University of Pennsylvania: Compared to other positive psychology interventions, expressing gratitude to someone else had the biggest impact on happiness.\r\n (Seligman et al., 2005)',
    'Study out of the University of Pennsylvania: Expressing gratitude to someone increased happiness for at least a month afterward.\r\n (Seligman et al., 2005)',
    'Study out of U.C.S.F: Feeling appreciated by one\'s partner is associated with feeling more committed to the relationship.\r\n (Gordon et al., 2012)',
    'Study out of U.C.S.F: Feeling appreciated leads partners to feel appreciative, and so on.\r\n (Gordon et al., 2012)'
];

//===================================
// EXPORTING
//===================================

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
    .addRequestHandlers(
        LaunchRequestHandler,
        IdeaIntentHandler,
        NextIdeaIntentHandler,
        DoItIntentHandler,
        HappyIntentHandler,
        NotHappyIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler
    )
    .addRequestInterceptors(RequestLog)
    .addResponseInterceptors(ResponseLog)
    .addErrorHandlers(ErrorHandler)
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();
