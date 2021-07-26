const express = require("express")
const lighthouse = require('lighthouse');
const path = require('path')
const wwwhisper = require('connect-wwwhisper')
const { chromium } = require("playwright-chromium")
const chromeLauncher = require('chrome-launcher');
const port = process.env.PORT || 3000;
const app = express()
app.use(wwwhisper())
app.use(express.static("./public"))
app.use(express.json())

let result;
let timeleft;

async function siteCheck (siteList) {
  timeleft = siteList.length
  let outputLong = []
  try {
    /** @type {import('playwright-chromium').Browser} */
    const browser = await chromium.launch({
      chromiumSandbox: false
    })
    let context = await browser.newContext({ viewport: { width: 800, height: 1200 } })
    await context.setDefaultTimeout(0)
    page = await context.newPage();
    for (let i = 0; i < siteList.length; i++) {
      console.log(`Incoming request for URL '${siteList[i]}'`)
      await page.goto(siteList[i])
      // get title
      const title = await page.title()
      outputLong.push({
        "date": `${Date()}`,
        "site": `${siteList[i]}`,
        "data_type": "Title Tag",
        "datum": `${title}`
      })

      // get h1s and h2s
      const h1s = await page.$$eval('h1', hOnes => hOnes.map(h1 => ` ${h1.innerText}`))
      h1s.forEach(elem => outputLong.push({
        "date": `${Date()}`,
        "site": `${siteList[i]}`,
        "data_type": "h1",
        "datum": `${elem}` 
      }))
      const h2s = await page.$$eval('h2', hTwos => hTwos.map(h2 => ` ${h2.innerText}`))
      h2s.forEach(elem => outputLong.push({
        "date": `${Date()}`,
        "site": `${siteList[i]}`,
        "data_type": "h2",
        "datum": `${elem}`
      }))

      // get schema
      const scripts = await page.$$('script')
      for (let j = 0; j < scripts.length; j++) {
        let type = await scripts[j].getAttribute("type")
        if (type === "application/ld+json") {
          let obj = await scripts[j].innerText()
          if (obj.includes(`"@type": "LocalBusiness"`)) {
            let data = JSON.parse(obj)
            let clean = JSON.stringify(data, null, 4);
            outputLong.push({
              "date": `${Date()}`,
              "site": `${siteList[i]}`,
              "data_type": "Schema",
              "datum": `${clean}`
            })
          }
        }
      }
      // get socials
      const ayys = await page.$$eval('a', links => links.map(a => JSON.parse(`{"status": "", "href": "${a.href}"}`)));
      let socials = []
      ayys.forEach(elem => {
        if (elem.href.includes("facebook")) { socials.push(elem) }
        else if (elem.href.includes("yelp")) { socials.push(elem) }
        else if (elem.href.includes("instagram")) { socials.push(elem) }
        else if (elem.href.includes("youtube")) { socials.push(elem) }
        else if (elem.href.includes("google")) { socials.push(elem) }
        else if (elem.href.includes("homeadvisor")) { socials.push(elem) }
      })
      let clean_socials = new Set(socials);
      for (let elem of clean_socials) {
        let socialpage = await context.newPage();
        try {
          let res = await socialpage.goto(elem.href, 0)
          if (res) {
            let code = res.status();
            elem.status = code
          }
        } catch (error) {
          console.log("got a bad social")
          elem.status = 404
        }
        outputLong.push({
          "date": `${Date()}`,
          "site": `${siteList[i]}`,
          "data_type": "Social Link",
          "datum": `${elem.status} ${elem.href}`
        })
        socialpage.close();
      }
    }
    await browser.close()

    //do lighthouse tests
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] });
    console.log(chrome.port)

    for (let i = 0; i < siteList.length; i++) {
      try {
        console.log(`running Lighthouse on: ${siteList[i]}`)
        let options = { skipAudits: ['full-page-screenshot'], logLevel: 'info', onlyCategories: ['performance'], port: chrome.port, strategy: 'mobile' };
        let runnerResult = await lighthouse(siteList[i], options);
        let score = runnerResult.lhr.categories.performance.score * 100;
        outputLong.push({
          "date": `${Date()}`,
          "site": `${siteList[i]}`,
          "data_type": "Mobile Speed",
          "datum": score
        })

        options = { skipAudits: ['full-page-screenshot'], logLevel: 'info', onlyCategories: ['performance'], port: chrome.port, strategy: 'desktop' };
        runnerResult = await lighthouse(siteList[i], options);
        score = runnerResult.lhr.categories.performance.score * 100;
        outputLong.push({
          "date": `${Date()}`,
          "site": `${siteList[i]}`,
          "data_type": "Desktop Speed",
          "datum": score
        })
      } catch (err ) {
        outputLong.push({
          "date": `${Date()}`,
          "site": `${siteList[i]}`,
          "data_type": "Desktop Speed",
          "datum": err
        })
      }
      
    }

    // await browser.close()
    await chrome.kill()

    result = outputLong;
    console.log("data ready to check")
  } catch (err) {
    // res.contentType("text/plain")
    // res.set("Content-Disposition", "inline;");
    // res.status(500).send(`Something went wrong: ${err}`)
    console.log(`error: ${err}`)
  }
}

async function doLighthouse(siteList) {
  let output = []
  try {
    // /** @type {import('playwright-chromium').Browser} */
    // const browser = await chromium.launch({
    //   chromiumSandbox: false,
    //   remoteDebuggingPort: 9222
    // })
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] });

    for (let i = 0; i < siteList.length; i++) {
      console.log(`site ${i}: ${siteList[i]}`)
      let options = { onlyCategories: ['performance'], port: chrome.port, strategy: 'mobile' };
      let runnerResult = await lighthouse(siteList[i], options);
      console.log('mobile Performance score was', runnerResult.lhr.categories.performance.score * 100);

      options = { onlyCategories: ['performance'], port: chrome.port, strategy: 'desktop' };
      runnerResult = await lighthouse(siteList[i], options);
      console.log('desktop Performance score was', runnerResult.lhr.categories.performance.score * 100);
    }

    await chrome.close()
    result = output;
    console.log("data ready to check")
  } catch (err) {
    // res.contentType("text/plain")
    // res.set("Content-Disposition", "inline;");
    // res.status(500).send(`Something went wrong: ${err}`)
    console.log(`error: ${err}`)
  }
}

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

app.post('/hlist', async (req, res) => {
  siteCheck(req.body)
  
    res.contentType("application/json")
    res.set("Content-Disposition", "inline;");
    res.send({"message": "thanks, please check back soon"})
});

app.post('/dolighthouse', async (req, res) => {
  let bod = JSON.stringify(req.body)
  console.log("req body:" + bod)
  doLighthouse(req.body)

  res.contentType("application/json")
  res.set("Content-Disposition", "inline;");
  res.send({ "message": "thanks, please check back soon" })
});

app.get('/hscrape', async (req, res) => {
    const url = req.query.url
    console.log(`Incoming request for URL '${url}'`)
      try {
        
        /** @type {import('playwright-chromium').Browser} */
        const browser = await chromium.launch({
          chromiumSandbox: false
        })
        let context = await browser.newContext({viewport: { width: 800, height: 1200 }})
        page = await context.newPage();
        await page.goto(url)
        const h1s = await page.$$eval('h1', hOnes => hOnes.map(h1 => ` ${h1.innerText}`))
        const h2s = await page.$$eval('h2', hTwos => hTwos.map(h2 => ` ${h2.innerText}`))
        await browser.close()
        res.json({h1s: h1s, h2s: h2s })
      } catch (err) {
        res.status(500).send(`Something went wrong: ${err}`)
      }
  });


app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});