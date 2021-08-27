const chromeLauncher = require('chrome-launcher');
const lighthouse = require('lighthouse');

module.exports = async function doLighthouse(siteList, result, reset) {
  
  try {
    // /** @type {import('playwright-chromium').Browser} */
    // const browser = await chromium.launch({
    //   chromiumSandbox: false,
    //   remoteDebuggingPort: 9222
    // })
    let chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] });

    for (let i = 0; i < siteList.length; i++) {
      if (reset) {
        await chrome.kill()
        chrome = null
        result = [{ "message": "bot run cancelled." }]
        reset = false
        return;
      }
      console.log(`lighthouse running on site ${i}: ${siteList[i]}`)
      try {
        // let options = { onlyCategories: ['accessibility', 'best-practices', 'performance', 'seo'], port: chrome.port, strategy: 'mobile' };
        let options = { onlyCategories: ['performance'], port: chrome.port, strategy: 'mobile' };

        let runnerResult = await lighthouse(siteList[i], options);
        // let bscore = runnerResult.lhr.categories['best-practices'].score * 100
        // result.push({
        //   "message": "",
        //   "site": `${siteList[i]}`,
        //   "data_type": "best practices score",
        //   "datum": bscore
        // })
        // let ascore = runnerResult.lhr.categories.accessibility.score * 100
        // result.push({
        //   "message": "",
        //   "site": `${siteList[i]}`,
        //   "data_type": "accessibility score",
        //   "datum": ascore
        // })
        // let sscore = runnerResult.lhr.categories.seo.score * 100
        // result.push({
        //   "message": "",
        //   "site": `${siteList[i]}`,
        //   "data_type": "seo score",
        //   "datum": sscore
        // })
        let pscore = runnerResult.lhr.categories.performance.score * 100
        result.push({
          "message": "",
          "site": `${siteList[i]}`,
          "data_type": "mobile speed",
          "datum": pscore
        })
        options = null
        runnerResult = null
        // ascore = null
        // bscore = null
        // sscore = null
        pscore = null
      } catch (error) {
        result.push({
          "message": "error",
          "site": `${siteList[i]}`,
          "data_type": "lighthouse",
          "datum": error
        })
        options = null
        runnerResult = null
        score = null
      }
      
      try {
        let options = { onlyCategories: ['performance'], port: chrome.port, strategy: 'desktop' };
        let runnerResult = await lighthouse(siteList[i], options);
        let score = runnerResult.lhr.categories.performance.score * 100
        result.push({
          "message": "",
          "site": `${siteList[i]}`,
          "data_type": "desktop speed",
          "datum": score
        })
        options = null
        runnerResult = null
        score = null
      } catch (error) {
        result.push({
          "message": "",
          "site": `${siteList[i]}`,
          "data_type": "desktop speed",
          "datum": error
        })
        options = null
        runnerResult = null
        score = null
      }
    }
    await chrome.kill()
    chrome = null
    result.push({
      "message": `Lighthouse check completed at ${Date()}`,
      "site": "",
      "data_type": "",
      "datum": ""
    })
    console.log("data ready to check")
  } catch (err) {
    // res.contentType("text/plain")
    // res.set("Content-Disposition", "inline;");
    // res.status(500).send(`Something went wrong: ${err}`)
    console.log(`error: ${err}`)
  }
}
