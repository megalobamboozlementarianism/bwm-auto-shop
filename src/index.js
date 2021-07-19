const express = require("express")
const path = require('path')
const wwwhisper = require('connect-wwwhisper')
const { chromium } = require("playwright-chromium")
const port = process.env.PORT || 3000;
const app = express()
app.use(wwwhisper())
app.use(express.static("./public"))
app.use(express.json())


app.post('/hlist', async (req, res) => {
  const body = req.body
    try {
      /** @type {import('playwright-chromium').Browser} */
      const browser = await chromium.launch({
        chromiumSandbox: false
      })
      let context = await browser.newContext({viewport: { width: 800, height: 1200 }})
      await context.setDefaultTimeout(15000)
      page = await context.newPage();
      let output = []
      for (let i = 0; i < body.length; i++){
        console.log(`Incoming request for URL '${body[i]}'`)
        await page.goto(body[i])
        // get title
        const title = await page.title()
        // get h1s and h2s
        const h1s = await page.$$eval('h1', hOnes => hOnes.map(h1 => ` ${h1.innerText}`))
        const h2s = await page.$$eval('h2', hTwos => hTwos.map(h2 => ` ${h2.innerText}`))
        // get schema
        let schema_data;
        const scripts = await page.$$('script')
        for (let j = 0; j < scripts.length; j++) {
          let type = await scripts[j].getAttribute("type")
          if (type === "application/ld+json") {
            let obj = await scripts[j].innerText()
            if (obj.includes(`"@type": "LocalBusiness"`)) {
              let data = JSON.parse(obj)
              let clean = JSON.stringify(data, null, 4);
              schema_data = clean
            }
          }
        }
        // get socials
        const ayys = await page.$$eval('a', links => links.map(a => JSON.parse(`{"status": "", "href": "${a.href}"}`)));
        console.log("got the ayys")
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
            let code = res.status();
            elem.status = code
          } catch (error) {
            console.log("got a bad social")
            elem.status = 404
          }
          socialpage.close();
        }
        console.log("before socials_status")
        let socials_status = JSON.stringify(Array.from(clean_socials));
        console.log("made it socials_status")
        // add output to res json
        output.push({
          "title": title,
          "site": body[i],
          "h1s": h1s,
          "h2s": h2s,
          "schema": schema_data,
          "socials": socials_status
        })
      }
      await browser.close()
      res.contentType("application/json")
      res.set("Content-Disposition", "inline;");
      res.send(output)
    } catch (err) {
      res.contentType("text/plain")
      res.set("Content-Disposition", "inline;");
      res.status(500).send(`Something went wrong: ${err}`)
    }
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