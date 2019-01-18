// https://api-v3.mbta.com/docs/swagger/index.html

import request = require("request-promise");
import Koa = require("koa");

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
    ctx.body = await getPredictions();

})

app.listen(8222);
