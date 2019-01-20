// https://api-v3.mbta.com/docs/swagger/index.html

import request = require("request-promise");
import Koa = require("koa");
import moment = require("moment");

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

export interface CensusGeocodingResult {
    result: {
        addressMatches: [
            {
                matchedAddress: string;
                coordinates: {
                    x: number;
                    y: number;
                }
            }
        ]    
    }
}

const MBTA_API_URL = "https://api-v3.mbta.com";
const CENSUS_API_URL = "https://geocoding.geo.census.gov";

const someAddress = '120 Pleasant St Watertown MA';

const routeNumber = "71";                   // the number of the Watertown -> Harvard route 

const app = new Koa();


const getPredictions = async ( {latitude, longitude}: {latitude: string, longitude: string})  => {
    return getJson(`${MBTA_API_URL}/predictions?filter[latitude]=${latitude}&filter[longitude]=${longitude}&include=stop,route,trip,schedule`)
}

const getGeocodeData = async (address = someAddress) => { 
    return getJson(`${CENSUS_API_URL}/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&format=json&benchmark=Public_AR_Current`);
}

const getJson = async (url: string) => {
    return await request(url, {json: true});
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
    // First get the lat longitude of Watertown SQ from census data
    const geoCodeData: CensusGeocodingResult = await getGeocodeData(ctx.query.address);

    if(!geoCodeData.result.addressMatches || !geoCodeData.result.addressMatches.length) {
        ctx.throw(404, "Could not find address");
    }

    const latitude = geoCodeData.result.addressMatches[0].coordinates.y.toString();
    const longitude = geoCodeData.result.addressMatches[0].coordinates.x.toString();

    const predictions: MbtaPredictionResult = await getPredictions({latitude, longitude});    
    
    ctx.body = formatPredictions(predictions);

})

app.listen(8222, () => {
    console.log("Listening on " + 8222);
});
