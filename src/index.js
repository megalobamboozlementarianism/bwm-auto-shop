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
  console.log("hi from /hlist")
  const body = req.body
    try {
      /** @type {import('playwright-chromium').Browser} */
      const browser = await chromium.launch({
        chromiumSandbox: false
      })
      let context = await browser.newContext({viewport: { width: 800, height: 1200 }})
      page = await context.newPage();
      let output = []
      for (let i = 0; i < body.length; i++){
        console.log(`Incoming request for URL '${body[i]}'`)
        await page.goto(body[i])
        const h1s = await page.$$eval('h1', hOnes => hOnes.map(h1 => ` ${h1.innerText}`))
        const h2s = await page.$$eval('h2', hTwos => hTwos.map(h2 => ` ${h2.innerText}`))
        output.push({
          "site": body[i],
          "h1s": h1s,
          "h2s": h2s
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