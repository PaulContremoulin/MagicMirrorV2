var csvToJSON = require("csvtojson");
var XMLHttpRequest = require('xhr2');

var TramwayFetcher = function (url, fetchInterval) {

    var self = this;

    var data = [];
    var reloadTimer = null;

    var fetchFailedCallback = function () {
    };
    var dataReceivedCallback = function () {
    };

    var fetchData = function () {

        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.onreadystatechange = function () {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    csvToJSON({
                        delimiter: [";"]
                    })
                        .fromString(this.response)
                        .then((stations) => {
                            data = stations;
                            self.broadcastData();
                            scheduleTimer();
                        })
                } else {
                    fetchFailedCallback(self, this.statusText);
                    scheduleTimer();
                }
            }
        };
        request.send();

    };

    /* scheduleTimer()
     * Schedule the timer for the next update.
     */
    var scheduleTimer = function () {
        //console.log('Schedule update timer.');
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(function () {
            fetchData();
        }, fetchInterval);
    };

    /* onReceive(callback)
     * Sets the on success callback
     *
     * argument callback function - The on success callback.
     */
    this.onReceive = function (callback) {
        dataReceivedCallback = callback;
    };

    /* onError(callback)
     * Sets the on error callback
     *
     * argument callback function - The on error callback.
     */
    this.onError = function (callback) {
        fetchFailedCallback = callback;
    };

    /* events()
	 * Returns current available events for this fetcher.
	 *
	 * return array - The current available events for this fetcher.
	 */
    this.data = function () {
        return data;
    };

    this.broadcastData = function () {
        //console.log('Broadcasting ' + events.length + ' events.');
        dataReceivedCallback(self);
    };

    /* url()
     * Returns the url of this fetcher.
     *
     * return string - The url of this fetcher.
     */
    this.url = function () {
        return url;
    };

    /* startFetch()
     * Initiate fetchCTramway();
     */
    this.startFetch = function () {
        fetchData();
    };


};

module.exports = TramwayFetcher;
