require('dotenv').config();
const { chromium } = require('playwright-chromium');
const login = require('./login')

module.exports = async function addPage(info, result, reset) {
  let clientURL = info[0]
  let title = info[1] 
  let text = info[2]

  console.log(clientURL, title, text)
  
  try {
    /** @type {import('playwright-chromium').Browser} */
    let browser = await chromium.launch({
      chromiumSandbox: false
    })
    if (reset) {
      await browser.close()
      browser = null
      result = [{ "message": "bot run cancelled." }]
      reset = false
      return;
    }

    let context = await browser.newContext()
    let page = await context.newPage()

    const navigationPromise = page.waitForNavigation()

    await login(clientURL, page, result)

    await page.goto(`${clientURL}/wp-admin/post-new.php?post_type=page`);

    await page.waitForSelector('#post-body > #post-body-content > #titlediv #title')
    await page.click('#post-body > #post-body-content > #titlediv #title')

    await page.type('#post-body > #post-body-content > #titlediv #title', title)

    await page.waitForSelector('#content-html');
    await page.click('#content-html');

    await page.waitForSelector('#content');
    await page.type('#content', text);

    await page.waitForSelector('.inside > #submitpost > #major-publishing-actions #publish')
    await navigationPromise
    await page.click('.inside > #submitpost > #major-publishing-actions #publish')
    const success = await page.waitForSelector('text="Page published."')
    const permalink = await (await page.waitForSelector('#sample-permalink')).innerText()
    if (success) {
      result.push({ "message": `page ${permalink} created on ${clientURL} at ${Date()}` })
    }
    await page.close();
    page = null
    await browser.close()
    browser = null
  } catch (error) {
    console.log(error)
    result.push({ "message": "something went wrong making page" })
  }
}