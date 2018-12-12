/* jslint node: true */
/* jslint esnext: true */

const Alexa = require('ask-sdk');
const AWS = require('aws-sdk');
AWS.config.update( {region: 'us-east-1'} );
const rp = require('request-promise');
const dayHelper = require('./dayHelper');
const setDay = dayHelper.day();

//===================================
// SET REMINDER AND GET REMINDER
//===================================

module.exports = {
    setReminder(handlerInput) {
        const event = handlerInput.requestEnvelope;

        const alert = {
            requestTime: handlerInput.requestEnvelope.request.timestamp,
            trigger: {
                type: 'SCHEDULED_ABSOLUTE',
                //offsetInSeconds: '30',
                scheduledTime: '2018-11-30T07:00:00.000',
                //timeZoneId: 'America/Los_Angeles',
                recurrence: {
                  freq: 'WEEKLY',
                  byDay: [setDay[1]],
                }
            },
            alertInfo: {
                spokenInfo: {
                  content: [{
                    locale: event.request.locale,
                    text: 'Take a moment to be grateful.',
                  }],
                },
            },
            pushNotification: {
                status: 'ENABLED',
            }
        };
        const params = {
            url: event.context.System.apiEndpoint + '/v1/alerts/reminders',
            method: 'POST',
            headers: {
              'Authorization': 'bearer ' + event.context.System.apiAccessToken,
            },
            json: alert,
        };

      // Post the reminder
        return rp(params).then((body) => {
            return 'OK';
        })
        .catch((err) => {
            console.log('SetReminder error ' + err.error.code);
            console.log('SetReminder alert: ' + JSON.stringify(alert));
            return err.error.code;
      });
    },

    getReminders(handlerInput) {
      // Invoke the reminders API to load active reminders
      const event = handlerInput.requestEnvelope;
      const options = {
        uri: event.context.System.apiEndpoint + '/v1/alerts/reminders',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': event.request.locale,
          'Authorization': 'bearer ' + event.context.System.apiAccessToken,
        },
      };

      return rp(options).then((body) => {
        const alerts = JSON.parse(body);

        // Check each alert to see if the day matches the day for the next tournament
        if (alerts && alerts.alerts[0].status === 'ON') {
            return alerts.alerts[0].trigger.recurrence.byDay[0];
        } else {
            return false;
        }
      })
      .catch((err) => {
        console.log('Error getting all reminders ' + err.error);
        return false;
      });
    }
    };