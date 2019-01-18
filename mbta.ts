// https://api-v3.mbta.com/docs/swagger/index.html

import request = require("request-promise");
import Koa = require("koa");
import moment = require("moment");

interface MbtaPredictionResult {
    data: {
        attributes: {
            departure_time: string;
            
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

const API_URL = "https://api-v3.mbta.com";
const watertownLat = "42.36546";
const watertownLong = "-71.18564";

const app = new Koa();

const getPredictions = async () => {
    const url = `/predictions?filter[latitude]=${watertownLat}&filter[longitude]=${watertownLong}&include=stop,route,trip,schedule`
    const data = await request(API_URL + url);
    return JSON.parse(data);
}



app.use( async ctx => {
    const predictions: MbtaPredictionResult = await getPredictions();

    // predictions is a giant object. We only care about route 71, the Watertown -> Harvard route
    const route71Predictions = predictions.data.filter( prediction => {
        return prediction.relationships.route.data.id === "71"
    });


    // map just the departure times
    let departureTimes = route71Predictions.map( prediction => {
        return prediction.attributes.departure_time
    });

    // filter out the nulls. We want to ignore the last bus of the night (because it doesn't actually _depart_)
    departureTimes = departureTimes.filter( departure => departure);

    let departureTimesJS: moment.Moment[];

    // Conver all the times from ISO to moment date objects for better sorting and display
    departureTimesJS = departureTimes.map ( departure => {
        return moment(departure);
    })

    // sort the list of arrival times
    departureTimesJS.sort( (date1, date2) => {
        if(date1.isBefore(date2)) {
            return -1;
        } else if (date1.isAfter(date2)) {
            return 1;
        }

        return 0;
    });
    
    const departureTimesAsLocalizedString = departureTimesJS.map ( departure => departure.toString());

    ctx.body = departureTimesAsLocalizedString;

})

app.listen(8222);
