// https://api-v3.mbta.com/docs/swagger/index.html

import request = require("request-promise");
import Koa = require("koa");
import moment = require("moment");
import pug = require("pug");
import fs = require("fs");

export interface MbtaPredictionResult {
    data: {
        attributes: {
            departure_time: string;
            stop_sequence: number;
        },
        relationships: {
            route: {
                data: {
                    id: string;
                    type: "route"
                }
            }
        }
    }[]
}

const MBTA_API_URL = "https://api-v3.mbta.com";

// Coordinates of Watertown Square (approx.)
const watertownCoords = {
    latitude: "42.36546",
    longitude: "-71.18564"
}
const routeNumber = "71";                   // the number of the Watertown -> Harvard route 

// Read template from file and compile
const template = pug.compile(fs.readFileSync(__dirname + "/assets/view.pug", {encoding: "utf8"}));

const app = new Koa();


const getPredictions = async ( {latitude, longitude}: {latitude: string, longitude: string})  => {
    return getJson<MbtaPredictionResult>(`${MBTA_API_URL}/predictions?filter[latitude]=${latitude}&filter[longitude]=${longitude}&include=stop,route,trip,schedule`)
}


const getJson = async<T> (url: string) => {
    return await request(url, {json: true}) as T;
}

const formatPredictions = (predictions: MbtaPredictionResult, filteredRouteNumber = routeNumber) => {
        // predictions is a giant object. We only care about route 71, the Watertown -> Harvard route, and only the first stop, where I get on


    const route71Predictions = predictions.data.filter( prediction => {
        return prediction.relationships.route.data.id === filteredRouteNumber && prediction.attributes.stop_sequence === 1;
    });


    // map just the departure times
    let departureTimes = route71Predictions.map( prediction => {
        return prediction.attributes.departure_time
    });

    // filter out the nulls. We want to ignore the last bus of the night (because it doesn't actually _depart_)
    departureTimes = departureTimes.filter( departure => departure);

    let departureTimesJS: moment.Moment[];

    // Convert all the times from ISO to moment date objects for better sorting and display
    // Note we could have used JavaScript date objects here but the moment object is more flexible.
    departureTimesJS = departureTimes.map ( departure => {
        return moment(departure);
    })

    // sort the list of arrival times
    departureTimesJS.sort( (date1: moment.Moment, date2: moment.Moment) => {
        if(date1.isBefore(date2)) {
            return -1;
        } else if (date1.isAfter(date2)) {
            return 1;
        }

        return 0;
    });

    // map departure times to nice looking localized strings for better display
    return departureTimesJS.map ( departure => departure.format('dddd, MMMM Do YYYY, h:mm:ss a'));
}


app.use( async ctx => {
    // Get predictions from mbta API and reformat as a list of dates
    const predictions: MbtaPredictionResult = await getPredictions(watertownCoords);
    const formatedPredictions: string[] = formatPredictions(predictions);

    // Read template from file, compile, and inject dates
    ctx.body = template({dates: formatedPredictions});

})

app.listen(8222, () => {
    console.log("Listening on " + 8222);
});
