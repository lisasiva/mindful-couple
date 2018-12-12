/* jslint node: true */
/* jslint esnext: true */

//===================================
// GET RANDOM FUNCTIONS
//===================================

module.exports = {
    day() {
        var dayNum = new Date().getDay();
        if (dayNum === 0) {
            return ['Sunday', 'SU'];
        } else if (dayNum === 1) {
            return ['Monday', 'MO'];
        } else if (dayNum === 2) {
            return ['Tuesday', 'TU'];
        } else if (dayNum === 3) {
            return ['Wednesday', 'WE'];
        } else if (dayNum === 4) {
            return ['Thursday', 'TH'];
        } else if (dayNum === 5) {
            return ['Friday', 'FR'];
        } else {
            return ['Saturday', 'SA'];
        }
    },
    
    fullDay(dayAbbrev) {
        if (dayAbbrev === 'SU') {
            return 'Sunday';
        } else if (dayAbbrev === 'MO') {
            return 'Monday';
        } else if (dayAbbrev === 'TU') {
            return 'Tuesday';
        } else if (dayAbbrev === 'WE') {
            return 'Wednesday';
        } else if (dayAbbrev === 'TH') {
            return 'Thursday';
        } else if (dayAbbrev === 'FR') {
            return 'Friday';
        } else {
            return 'Saturday';
        }
    }

};