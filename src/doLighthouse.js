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
        let options = { onlyCategories: ['performance'], port: chrome.port, strategy: 'mobile' };
        let runnerResult = await lighthouse(siteList[i], options);
        let score = runnerResult.lhr.categories.performance.score * 100
        result.push({
          "site": `${siteList[i]}`,
          "data_type": "mobile speed",
          "datum": score
        })
        options = null
        runnerResult = null
        score = null
      } catch (error) {
        result.push({
          "site": `${siteList[i]}`,
          "data_type": "mobile speed",
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
          "site": `${siteList[i]}`,
          "data_type": "desktop speed",
          "datum": score
        })
        options = null
        runnerResult = null
        score = null
      } catch (error) {
        result.push({
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
    console.log("data ready to check")
  } catch (err) {
    // res.contentType("text/plain")
    // res.set("Content-Disposition", "inline;");
    // res.status(500).send(`Something went wrong: ${err}`)
    console.log(`error: ${err}`)
  }
}
