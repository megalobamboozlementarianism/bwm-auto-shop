const { chromium } = require("playwright-chromium")
const chromeLauncher = require('chrome-launcher');
const lighthouse = require('lighthouse');

module.exports = async function siteCheck (siteList, result, reset) {
  try {
    /** @type {import('playwright-chromium').Browser} */
    let browser = await chromium.launch({
      chromiumSandbox: false
    })

    for (let i = 0; i < siteList.length; i++) {

      if (reset) {
        await browser.close()
        browser = null
        result = [{ "message": "bot run cancelled." }]
        reset = false
        return;
      }
      let context = await browser.newContext({ viewport: { width: 800, height: 1200 } })
      await context.setDefaultTimeout(0)
      let page = await context.newPage();
      let currentSite = siteList[i]
      console.log(`processing URL ${i}: '${currentSite}'`)
      // get title tag
      try {
        await page.goto(currentSite)
        const title = await page.title()
        result.push({
          "site": `${currentSite}`,
          "data_type": "Title Tag",
          "datum": `${title}`
        })
      } catch (err) {
        result.push({
          "site": `${currentSite}`,
          "data_type": "Title Tag error",
          "datum": err
        })
      }

      // get h1s
      try {
        let h1s = await page.$$eval('h1', hOnes => hOnes.map(h1 => ` ${h1.innerText}`))
        h1s.forEach(elem => result.push({
          "site": `${currentSite}`,
          "data_type": "h1",
          "datum": `${elem}`
        }))
        h1s = null
      } catch (err) {
        result.push({
          "site": `${currentSite}`,
          "data_type": "h1 error",
          "datum": err
        })
      }

      // get h2s
      try {
        let h2s = await page.$$eval('h2', hTwos => hTwos.map(h2 => ` ${h2.innerText}`))
        h2s.forEach(elem => result.push({
          "site": `${currentSite}`,
          "data_type": "h2",
          "datum": `${elem}`
        }))
        h2s = null
      } catch (err) {
        result.push({
          "site": `${currentSite}`,
          "data_type": "h2 error",
          "datum": err
        })
      }


      // get schema
      try {
        let scripts = await page.$$('script')
        for (let j = 0; j < scripts.length; j++) {
          let type = await scripts[j].getAttribute("type")
          if (type === "application/ld+json") {
            let obj = await scripts[j].innerText()
            if (obj.includes(`"@type": "LocalBusiness"`)) {
              let data = JSON.parse(obj)
              let clean = JSON.stringify(data, null, 4);
              result.push({
                "site": `${currentSite}`,
                "data_type": "Schema",
                "datum": `${clean}`
              })
            }
          }
          type = null
        }
        scripts = null
      } catch (err) {
        result.push({
          "site": `${currentSite}`,
          "data_type": "Schema check error",
          "datum": err
        })
      }

      // get socials
      try {
        let ayys = await page.$$eval('a', links => links.map(a => JSON.parse(`{"status": "", "href": "${a.href}"}`)));
        let socials = []
        ayys.forEach(elem => {
          if (elem.href.includes("facebook")) { socials.push(elem) }
          else if (elem.href.includes("yelp")) { socials.push(elem) }
          else if (elem.href.includes("instagram")) { socials.push(elem) }
          else if (elem.href.includes("youtube")) { socials.push(elem) }
          else if (elem.href.includes("google")) { socials.push(elem) }
          else if (elem.href.includes("homeadvisor")) { socials.push(elem) }
        })
        ayys = null
        let clean_socials = new Set(socials);
        socials = null
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
          result.push({
            "site": `${currentSite}`,
            "data_type": "Social Link",
            "datum": `${elem.status} ${elem.href}`
          })
          socialpage.close();
          socialpage = null
        }
      } catch (err) {
        result.push({
          "site": `${currentSite}`,
          "data_type": "social check error",
          "datum": err
        })
      }
      await page.close();
      page = null
      await context.close();
      context = null
    }

    await browser.close()
    browser = null;
    //do lighthouse tests
    let chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] });

    for (let i = 0; i < siteList.length; i++) {
      let currentSite = siteList[i]
      try {
        console.log(`running Lighthouse on: ${currentSite}`)
        let options = { skipAudits: ['full-page-screenshot'], onlyCategories: ['performance'], port: chrome.port, strategy: 'mobile' };
        let runnerResult = await lighthouse(currentSite, options);
        let score = runnerResult.lhr.categories.performance.score * 100;
        result.push({
          "site": `${currentSite}`,
          "data_type": "Mobile Speed",
          "datum": score
        })

        options = { skipAudits: ['full-page-screenshot'], onlyCategories: ['performance'], port: chrome.port, strategy: 'desktop' };
        runnerResult = await lighthouse(currentSite, options);
        score = runnerResult.lhr.categories.performance.score * 100;
        result.push({
          "site": `${currentSite}`,
          "data_type": "Desktop Speed",
          "datum": score
        })

        options = null
        runnerResult = null
        score = null


      } catch (err) {
        result.push({
          "site": `${currentSite}`,
          "data_type": "lighthouse error",
          "datum": err
        })
      }
    }

    // await browser.close()
    await chrome.kill()
    chrome = null;

    result.push({
      "message": `SEO site check completed at ${Date()}`
    })
    console.log("data ready to check")
  } catch (err) {
    result.push({
      "site": 'n/a',
      "data_type": "general error",
      "datum": err
    })
    // res.contentType("text/plain")
    // res.set("Content-Disposition", "inline;");
    // res.status(500).send(`Something went wrong: ${err}`)
    console.log(`error: ${err}`)
  }
}

