/* global Module */

/* Magic Mirror
 * Module: Tramway
 *
 * By Paul Contremoulin
 * MIT Licensed.
 */

Module.register("tramway", {

    // Default module config.
    defaults: {
        url: "http://data.montpellier3m.fr/sites/default/files/ressources/TAM_MMM_TpsReel.csv",
        stations: [
            {
                station: "ASTRUC",
                lines: ["1", "3", "4", "2"]
            }
        ],
        fetchInterval: 30000,
        timeFormat: "relative",
        dateFormat: "MMM Do",
        tableClass: "small"
    },

    // Define required scripts.
    getScripts: function () {
        return ["moment.js"];
    },

    // Define required scripts.
    getStyles: function () {
        return ["trawmay.css"];
    },
    start: function () {

        // Set locale.
        moment.updateLocale(config.language, this.getLocaleSpecification(config.timeFormat));
        this.fetchStations(this.config.url, this.config.fetchInterval);
        this.stationsData = [];
        this.loaded = false;
    },

    getLocaleSpecification: function (timeFormat) {
        switch (timeFormat) {
            case 12: {
                return {longDateFormat: {LT: "h:mm A"}};
                break;
            }
            case 24: {
                return {longDateFormat: {LT: "HH:mm"}};
                break;
            }
            default: {
                return {longDateFormat: {LT: moment.localeData().longDateFormat("LT")}};
                break;
            }
        }
    },

    fetchStations: function (url, fetchInterval) {
        this.sendSocketNotification("FETCH_STATIONS", {
            url: url,
            fetchInterval: fetchInterval,
        });
    },

    // Override socket notification handler.
    socketNotificationReceived: function (notification, payload) {
        if (notification === "TRAMWAY_DATA") {
            console.log('Receive tramway data : ' + payload.data);
            this.stationsData = payload.data;
            this.loaded = true;


        } else if (notification === "FETCH_TRAMWAY_ERROR") {
            Log.error("Tramway Error. Could not fetch calendar: " + payload.url);
            this.loaded = true;
        } else if (notification === "INCORRECT_URL") {
            Log.error("Tramway Error. Incorrect url: " + payload.url);
        } else {
            Log.log("Tramway received an unknown socket notification: " + notification);
        }

        this.updateDom(this.config.animationSpeed);
    },

    getDom: function () {

        var targetedStations = this.getTargetedStations();
        var wrapper = document.createElement("div");
        wrapper.className = "tramway " + this.config.tableClass;

        let header = document.createElement('header');
        header.className = "module-header";
        header.innerText = "Tramways - " + this.config.stations[0].station;

        wrapper.appendChild(header);

        if (this.loaded === false) {
            var loading = document.createElement("div");
            loading.innerHTML = 'Chargement...';
            wrapper.appendChild(loading);
        }
        else if (Object.keys(targetedStations).length === 0) {
            var end = document.createElement("div");
            end.innerHTML = 'Service terminé.';
            wrapper.appendChild(end);
        } else {

            var now = moment();

            for (var stationName in targetedStations) {

                if (targetedStations.hasOwnProperty(stationName)) {

                    var station = targetedStations[stationName];

                    var table = document.createElement("table");

                    for (var directionId in station) {

                        if (station.hasOwnProperty(directionId)) {

                            // var direction = document.createElement("tr");
                            // direction.innerHTML = `<td>${stationName} ${directionId === "0" ? "Quai A" : "Quai B"}</td>`;

                            // table.append(direction);

                            var stops = station[directionId];

                            for (var stopIndex in stops) {

                                if (stops.hasOwnProperty(stopIndex)) {

                                    var stopDiv = document.createElement("tr");

                                    let [stopLine, ...stopHeading] = stopIndex.split(" ");

                                    var lineCell = document.createElement('td');
                                    var lineDiv = document.createElement('div');
                                    lineDiv.innerHTML = stopLine.replace('4', `4${directionId === "0" ? 'b' : 'a'}`);
                                    lineDiv.className = "title light bright line";
                                    lineCell.appendChild(lineDiv);


                                    var headingCell = document.createElement('td');
                                    headingCell.innerHTML = stopHeading.join(" ");
                                    headingCell.className = "title bright align-left";

                                    stopDiv.appendChild(lineCell);
                                    stopDiv.appendChild(headingCell);

                                    stops[stopIndex] = [...stops[stopIndex], "-", "-", "-"].slice(0, 3);

                                    for(var n in stops[stopIndex]){

                                        var nextPassage = stops[stopIndex][n];

                                        var relativeDate;

                                        var stopsCell = document.createElement('td');

                                        if(nextPassage !== "-"){
                                            var time = moment(nextPassage.departure_time, "HH:mm:ss");
                                            if (time.isBefore(moment().subtract(1, 'h'))) {
                                                time.add(1, 'd');
                                            }

                                            if (time.diff(now, "minutes") <= 1) {
                                                relativeDate = 'PROCHE';
                                                stopsCell.innerHTML += relativeDate;
                                                stopsCell.className = "light blick";
                                            } else {
                                                relativeDate = time.diff(now, "minutes") + " min";
                                                stopsCell.innerHTML += relativeDate;
                                                stopsCell.className = "light";
                                            }
                                        }

                                        stopDiv.appendChild(stopsCell);

                                    }

                                    table.appendChild(stopDiv);

                                }

                            }

                        }

                    }

                    let content = document.createElement('div');
                    content.className = "module-content";
                    content.appendChild(table);

                    wrapper.appendChild(content);

                }

            }

        }

        return wrapper;
    },

    getTargetedStations: function () {

        let targetedStations = {};

        for (var keyStation in this.config.stations) {

            var stationConfig = this.config.stations[keyStation];

            for (var key in this.stationsData) {

                let stationData = this.stationsData[key]

                if (stationData.stop_name.includes(stationConfig.station) && stationConfig.lines.includes(stationData.route_short_name)) {

                    if (!targetedStations[stationConfig.station]) {
                        targetedStations[stationConfig.station] = {
                            "0": [],
                            "1": [],
                        };
                    }

                    if (!targetedStations[stationConfig.station][stationData.direction_id][stationData.route_short_name + ' ' + stationData.trip_headsign]) {
                        targetedStations[stationConfig.station][stationData.direction_id][stationData.route_short_name + ' ' + stationData.trip_headsign] = [];
                    }

                    targetedStations[stationConfig.station][stationData.direction_id][stationData.route_short_name + ' ' + stationData.trip_headsign].push(stationData);

                }

            }

        }

        return targetedStations;

    },

    getTemplateData: function () {
        return this.config;
    }
});
