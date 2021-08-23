"use strict";
const WebSocketServer = require("ws").Server
const http = require("http");
const express = require("express");
const json2xls = require("json2xls");
const fs = require("fs");
// const lighthouse = require('lighthouse');
const wwwhisper = require('connect-wwwhisper')
const { chromium } = require("playwright-chromium")
const port = process.env.PORT || 3000;
const app = express()
app.use(wwwhisper())
app.use(express.static("./public"))
app.use(express.json())
app.use(json2xls.middleware);

const siteCheck = require('./siteCheck');
const doLighthouse = require('./doLighthouse');
const cfdns = require('./checkCF')
const addPage = require('./addPage')

// bot data globals
let result = [{ "message": "no data to display" }];
let timeleft;
let reset = false

// websocket stuff
var server = http.createServer(app)
server.listen(port)
console.log("http server listening on %d", port)
var wss = new WebSocketServer({ server: server })
console.log("websocket server created")
wss.on("connection", function (ws) {
  console.log("websocket connection established")
  ws.on("message", (message) => {
    console.log(`server received: ${message}`);
  })
  var id = setInterval(function () {
    ws.send(JSON.stringify(result, null, 2))
  }, 500)
  console.log("websocket connection open")
  ws.on("close", function () {
    console.log("websocket connection closed")
    clearInterval(id)
  })
})

app.get('/check', async (req, res) => {
  if (result) {
    res.contentType("application/json")
    res.set("Content-Disposition", "inline;");
    res.send(result)
  } else {
    res.contentType("application/json")
    res.set("Content-Disposition", "inline;");
    res.send([{ "message": `data not ready yet; this request will probably take a total of ${timeleft} minutes` }])
  }
});

app.post('/json2xlsx', async (req, res) => {
  reset = false
  result = [{ "message": `JSON to xlsx initiated at ${Date()}` }]
  let bod = []
  bod = req.body
  var xlsx = json2xls(bod);

  fs.writeFileSync('./data.xlsx', xlsx, 'binary');

  res.setHeader('Content-disposition', 'attachment; filename=data.xlsx');
  res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  await res.download("." + '/data.xlsx');

});

app.post('/gimmexlsx', async (req, res) => {
  reset = false
  var xlsx = json2xls(result);
  fs.writeFileSync('./results.xlsx', xlsx, 'binary');
  res.setHeader('Content-disposition', 'attachment; filename=results.xlsx');
  res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  await res.download("." + '/results.xlsx');

});

app.post('/addpage', async (req, res) => {
  reset = false
  result = [{ "message": `Add Page initiated at ${Date()}` }]
  let bod = []
  bod = req.body
  addPage(bod, result, reset)
  res.contentType("application/json")
  res.set("Content-Disposition", "inline;");
  res.send({ "message": `thanks, please check back in approximately 2 minutes` })
});

app.post('/cfdns', async (req, res) => {
  reset = false
  result = [{ 
    "message": `CF & DNS check initiated at ${Date()}`,
    "site": "n/a",
    "ip_addr": "n/a",
    "in_cf": "n/a",
    "name_servers": "n/a",
    "original_name_servers": "n/a",
    "original_registrar": "n/a",
    "mx records": "n/a"
  }]
  let bod = []
  bod = req.body
  cfdns(bod, result, reset)
  res.contentType("application/json")
  res.set("Content-Disposition", "inline;");
  res.send({ "message": `thanks, please check back in approximately ${bod.length / 10} minutes` })
});

app.post('/sitecheck', async (req, res) => {
  reset = false
  result = [{ 
    "message": `site check initiated at ${Date()}`,
    "site": "n/a",
    "data_type": "message",
    "datum": `site check initiated at ${Date()}`
}]
  let bod = []
  bod = req.body
  siteCheck(bod, result, reset)
  res.contentType("application/json")
  res.set("Content-Disposition", "inline;");
  res.send({"message": `thanks, please check back in approximately ${bod.length} minutes`})
});

app.post('/dolighthouse', async (req, res) => {
  reset = false
  result = [{
    "message": `lighthouse check initiated at ${Date()}`,
    "site": "n/a",
    "data_type": "message",
    "datum": `lighthouse check initiated at ${Date()}`
}]
  let bod = []
  bod = req.body
  doLighthouse(bod, result, reset)

  res.contentType("application/json")
  res.set("Content-Disposition", "inline;");
  res.send({ "message": `thanks, please check back in ${bod.length} minutes` })
});

app.get('/hscrape', async (req, res) => {
  reset = false
  result = [{ 
    "message": `H scrape initiated at ${Date()}`,
    "site": "",
    "data_type": "",
    "datum": ""
  }]
  const url = req.query.url
  console.log(`Incoming request for URL '${url}'`)
  /** @type {import('playwright-chromium').Browser} */
  const browser = await chromium.launch({
    chromiumSandbox: false
  })
  try {
    let context = await browser.newContext({viewport: { width: 800, height: 1200 }})
    await context.setDefaultTimeout(0)
    const page = await context.newPage();
    await page.goto(url)
    const h1s = await page.$$eval('h1', hOnes => hOnes.map(h1 => ` ${h1.innerText}`))
    const h2s = await page.$$eval('h2', hTwos => hTwos.map(h2 => ` ${h2.innerText}`))
    let done = false
    h1s.forEach(elem => {
      result.push({
        "message": "",
        "site": url,
        "data_type": "h1",
        "datum": elem
      })
    })
    h2s.forEach(elem => {
      result.push({
        "message": "",
        "site": url,
        "data_type": "h2",
        "datum": elem
      })
    })
    result.push({
      "message": `H scrape completed at ${Date()}`,
      "site": "",
      "data_type": "",
      "datum": "  "
    })
    res.contentType("application/json")
    res.set("Content-Disposition", "inline;");
    res.send(result)
  } catch (err) {
    res.status(500).send(`Something went wrong: ${err}`)
  }
  await browser.close()
});

app.get('/reset', async (req, res) => {
  console.log("canceling current bot run and resetting data")
  try {
    reset = true
    result = [{ "message": "no data to display" }]
    res.contentType("application/json")
    res.set("Content-Disposition", "inline;");
    res.send(result)
  } catch (err) {
    res.status(500).send(`Something went wrong: ${err}`)
  }
});


// app.listen(port, () => {
//   console.log(`Listening on port ${port}!`);
// });