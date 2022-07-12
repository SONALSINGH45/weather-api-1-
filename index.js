
import axios from 'axios';
import express from 'express';

import { allCities } from './csvjson.js';
import redis from 'redis';
import  SolrNode  from 'solr-node';


const app = express();
app.use(express.json());


//will bring this from .env file later on
const baseUrl = 'http://dataservice.accuweather.com/';
const apiKEY = 'CGB6pVmMufCPPZeMFRhnZi4NyDHzQviT';

const client = redis.createClient();
client.connect();
client.on('error', err => {
  console.log('Error ' + err);
});
client.on("connect", () => {
  console.log("connected")
})

//Create client
var cliente = new SolrNode({
  host: '127.0.0.1',
  port: '8983',
  core: 'codesearch',
  protocol: 'http'
});
console.log("gydgh")
// 


//retrive data from cache
app.get("/weatherinfo2", async (req, res) => {
  
  const searchTerm = req.query.search;

  // if user doesnt pass any search term , will thorw the exception
  if (!searchTerm) {
    res.status(500).send('Search Term is required');
    return;
  }
   const s = cliente.query()
   .q({"City_Town":searchTerm})
    .addParams({
        wt: 'json',
        indent: true
    })
    .start(0)
;

  const result = await cliente.search(s);
  console.log('Response:', result.response);

// cliente.search(s, function (err, result) {
//   if (err) {
//      console.log(err);
//      return;
//   }
//   console.log('Response:', result.response);
// });
if(result && result.response && result.response.docs && result.response.docs.length == 0)

{  throw new error ("city not found") }
  try {
    // will try to get city information from array (later it will come from SOLR)
    //const selectedCity = allCities.find(item => item['City/Town'].toLowerCase() == searchTerm.toLowerCase())
    const selectedCity = result.response.docs[0]




    console.log("selectedCity", selectedCity);

    if (selectedCity && selectedCity.Key) {

      // if we already have key in our DB /SOLR/ JSON
      const _responses = await GetCityInformation(selectedCity);
      res.status(200).send(_responses);

    } else if (selectedCity && selectedCity.lat && selectedCity.lon) {
      
      // will try to get city information from ACCUWEATHER
      const CityInfo = await axios
      .get(`${baseUrl}/locations/v1/geoposition/search.json?q=${selectedCity.lat[0]},${selectedCity.lon[0]}&apikey=${apiKEY}`)
      .catch(e=>{
        console.log(e)
      })
     // console.log("CityInfo", CityInfo.data);
      
      if (CityInfo && CityInfo.data.length > 0) {
        const currentCity = CityInfo.data[0];

//solr   




    //     var SolrNode = require('solr-node');
    //     var client = new SolrNode({
    //         host: '<your host>',
    //         port: '8983',
    //         core: 'products',
    //         protocol: 'http'
    //     });
    //     const express = require('express');
    //     const app = express();
    // app.get('/getkey',
    //  function (req, res) 
    //  { 
    // var strQuery = client.query().q('Id:3');
    //  client.search(strQuery, function (err, result) {
    //    if (err) {
    //       console.log(err);
    //       return;
    //    }
    //    console.log('Response:', result.response);
    //    res.send(result.response);
    // });
    //  }); 
     
        // WE NEED TO SAVE THE KEY IN SOLR.
        // Create query
// var strQuery = client.query().q('text:json');
// var objQuery = client.query().q({text:'json', title:'test'});
// var myStrQuery = 'q=text:test&wt=json';




        const _responses = await GetCityInformation(currentCity);
        res.status(200).send(_responses);
      } else {
        // if city inforamtion is not found in our SOLR or static JSON
        res.status(500).send('City not found');
        return;
      }

    } else {

      // if city inforamtion is not found in our SOLR or static JSON
      res.status(500).send('City non found');
      return;
    }



  } catch (e) {
    //console.log(e)
    throw Error("Promise failed", e);
  }
})


const GetCityInformation = async (currentCity) => {
  const response = await Promise.all([
    axios.get(`${baseUrl}/currentconditions/v1/${currentCity.Key}?apikey=${apiKEY}`),
    axios.get(`${baseUrl}/airquality/v2/currentconditions/${currentCity['Key']}?apikey=${apiKEY}&pollutants=1&language=en-us`)
  ])
  const _responses = [];
  response && response.forEach(x => {
    console.log("response", x.data)
    _responses.push(x.data);
  })

  return _responses;
}

app.listen(9000, () => {
  console.log("on port on port 9000")
  //console.log("jjjbbb")
})

///http://localhost:8983/solr/codesearch/select?q.op=OR&q=*%3A*