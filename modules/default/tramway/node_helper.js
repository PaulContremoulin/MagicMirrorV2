/* Magic Mirror
 * Node Helper: Calendar
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
var validUrl = require("valid-url");
var TramwayFetcher = require("./tramwayfetcher.js");

module.exports = NodeHelper.create({
    // Override start method.
    start: function () {

        this.fetchers = [];

        console.log("Starting node helper for: " + this.name);

    },

    // Override socketNotificationReceived method.
    socketNotificationReceived: function (notification, payload) {
        if (notification === "FETCH_STATIONS") {
            this.createFetcher(payload.url, payload.fetchInterval);
        }
    },

    /* createFetcher(url, reloadInterval)
     * Creates a fetcher for a new url if it doesn't exist yet.
     * Otherwise it reuses the existing one.
     *
     * attribute url string - URL of the news feed.
     * attribute reloadInterval number - Reload interval in milliseconds.
     */

    createFetcher: function (url, fetchInterval = 10000) {
        var self = this;

        if (!validUrl.isUri(url)) {
            self.sendSocketNotification("INCORRECT_URL", {url: url});
            return;
        }

        var fetcher;
        if (typeof self.fetchers[url] === "undefined") {
            console.log("Create new tramway fetcher for url: " + url + " - Interval: " + fetchInterval);
            fetcher = new TramwayFetcher(url, fetchInterval);

            fetcher.onReceive(function (fetcher) {
                //console.log('Broadcast events.');
                //console.log(fetcher.events());

                self.sendSocketNotification("TRAMWAY_DATA", {
                    url: fetcher.url(),
                    data: fetcher.data()
                });
            });

            fetcher.onError(function (fetcher, error) {
                console.error("Tramway Error. Could not fetch tramway: ", fetcher.url(), error);
                self.sendSocketNotification("FETCH_TRAMWAY_ERROR", {
                    url: fetcher.url(),
                    error: error
                });
            });

            self.fetchers[url] = fetcher;
        } else {
            //console.log('Use existing news fetcher for url: ' + url);
            fetcher = self.fetchers[url];
            fetcher.broadcastData();
        }

        fetcher.startFetch();
    }
});
