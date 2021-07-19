const express = require("express")
const path = require('path')
const wwwhisper = require('connect-wwwhisper')
const { chromium } = require("playwright-chromium")
const { firefox } = require("playwright-firefox")
const port = process.env.PORT || 3000;
const app = express()
app.use(wwwhisper())
app.use(express.static("./public"))



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
  
        if (req.query.timeout) {
          await page.waitForTimeout(parseInt(req.query.timeout, 10))
        }
        const h1s = await page.$$eval('h1', hOnes => hOnes.map(h1 => ` ${h1.innerText}`))
        const h2s = await page.$$eval('h2', hTwos => hTwos.map(h2 => ` ${h2.innerText}`))
        await browser.close()
        res.json({h1s: h1s, h2s: h2s })
      } catch (err) {
        res.status(500).send(`Something went wrong: ${err}`)
      }
  });

app.get("/browser/:name", async (req, res) => {
  const keys = Object.entries(req.query)
  console.log("req: " + keys)
  const browserName = req.params["name"] || "chromium"
  if (!["chromium", "firefox"].includes(browserName)) {
    return res.status(500).send(`invalid browser name (${browserName})!`)
  }
  const url = req.query.url
  const waitUntil = req.query.waitUntil || "load"
  const width = req.query.width ? parseInt(req.query.width, 10) : 1920
  const height = req.query.height ? parseInt(req.query.height, 10) : 1080
  console.log(`Incoming request for browser '${browserName}' and URL '${url}'`)
  try {
    /** @type {import('playwright-chromium').Browser} */
    const browser = await { chromium, firefox }[browserName].launch({
      chromiumSandbox: false
    })
    const page = await browser.newPage({
      viewport: {
        width,
        height
      }
    })
    await page.goto(url, {
      timeout: 10 * 1000,
      waitUntil
    })
    if (req.query.timeout) {
      await page.waitForTimeout(parseInt(req.query.timeout, 10))
    }
    const data = await page.screenshot({
      type: "png"
    })
    await browser.close()
    res.contentType("image/png")
    res.set("Content-Disposition", "inline;");
    res.send(data)
  } catch (err) {
    res.status(500).send(`Something went wrong: ${err}`)
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});