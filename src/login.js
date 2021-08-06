require('dotenv').config();

const myRe = /(?<=\/\/).{4}/;

module.exports = async function login (site, page, result) {

 try {
  console.log("----");
  console.log("attempting to log into " + site);
  let myFirstFourArray = myRe.exec(site);

  await page.goto(`${site}/wp-admin/`); // await page.goto("http://bigwestplayground.com/theultimatic/wp-admin")
  let title = await page.title();

  // try wp-admin login, live login first then draft login
  if (title.includes("Log In")) {
    await page.type('#user_login', `${process.env.WP_LOGIN}`);
    await page.click('#user_pass');
    await page.type('#user_pass', `${process.env.WP_PASS}${myFirstFourArray[0]}`);
    await page.click('#wp-submit');
    let newtitle = await page.title();
    if (newtitle.includes("Dashboard") || newtitle.includes("Confirm your administration email")) {
      title = await page.title();
    }
    //try draft login
    if (newtitle.includes("Log In")) {
      await page.waitForTimeout(3000); // important because of the form bounce
      await page.type('#user_pass', `${process.env.WP_PASS}`);
      await page.click('#wp-submit');
      await page.waitForNavigation();
      newtitle = await page.title();
      if (newtitle.includes("Dashboard") || newtitle.includes("Confirm your administration email")) {
        title = await page.title();
      } else if (newtitle.includes("Log In")) {
        console.log("unable to log in. client may have changed login or deleted user or something")
      }
    }
  }

  // if wp-admin 404s try bigwest login, live login first then draft login
  if (title.includes("Page not found")) {
    await page.goto(`${site}/bigwest/`)
    await page.type('#user_login', `${process.env.WP_LOGIN}`);
    await page.click('#user_pass');
    await page.type('#user_pass', `${process.env.WP_PASS}${myFirstFourArray[0]}`);
    await page.click('#wp-submit');
    let bwtitle = await page.title();

    //try old login
    if (bwtitle.includes("Log In")) {
      await page.waitForTimeout(3000);
      await page.type('#user_pass', `${process.env.WP_PASS}`);
      await page.click('#wp-submit');
      bwtitle = await page.title();
      if (bwtitle.includes("Dashboard") || bwtitle.includes("Confirm your administration email")) {
        title = await page.title();
      } else if (bwtitle.includes("Log In")) {
        console.log("changed login or deleted user or something")
        console.log("-----!")
      }
    }

    // success
    if (bwtitle.includes("Dashboard") || bwtitle.includes("Confirm your administration email")) {
      title = await page.title();
    }
  }

  // if success
  if (title.includes("Dashboard")) {
    console.log("Success! Logged into " + site)
    // then return logged in page
    result.push({"message": "able to log in"})
    return page
  }

  if (title.includes("Confirm your administration email")) {
    await page.waitForSelector("#correct-admin-email");
    await page.click("#correct-admin-email");
    await page.waitForNavigation();
    const newtitle = await page.title();
    if (newtitle.includes("Dashboard")) {
      console.log("Success! Logged into " + site)
      //then return logged in page
      result.push({ "message": "able to log in" })
      return page

    }
  }
 } catch (error) {
   console.log("Error: ", error);
   result.push({ "message": "not able to log in" })
   return page
 }

}


