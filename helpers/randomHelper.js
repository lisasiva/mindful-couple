/* jslint node: true */
/* jslint esnext: true */

//===================================
// GET RANDOM FUNCTIONS
//===================================

module.exports = {
    getRandomItem(array) {
        let i = 0;
        i = Math.floor(Math.random() * array.length);
        return array[i];
    },

    getRandomFact(array1, array2, array3) {
        let i = 0;
        i = Math.floor(Math.random() * array1.length);
        return [array1[i], array2[i], array3[i]];

    }
};