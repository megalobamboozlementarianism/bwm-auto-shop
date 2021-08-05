require('dotenv').config();
const fetch = require('node-fetch');
const dns = require('dns');
const token = process.env.CF_TOKEN;
const requestOptions = {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Cookie': '__cflb=0H28vgHxwvgAQtjUGU4vq74ZFe3sNVUZZipVGE67bV7; __cfruid=d72743562e40ac1f9c62d2a9c7d94e436ba1233b-1627673776'
  },
  redirect: 'follow'
};



module.exports = async function get_cfs (sites, result, reset) {
  if (reset) {
    result = [{ "message": "bot run cancelled." }]
    reset = false
    return;
  }
  try {
    // get cf info
    let num_calls;
    let cf_info = []
    let cf_names = []
    await fetch("https://api.cloudflare.com/client/v4/zones?&per_page=50&order=name", requestOptions)
      .then(response => response.json())
      .then(data => num_calls = data.result_info.total_pages)
      .catch(error => console.log('error', error));

    for (let i = 0; i < num_calls; i++) {
      let request_url = `https://api.cloudflare.com/client/v4/zones?&per_page=50&order=name&page=${i + 1}`
      await fetch(request_url, requestOptions)
        .then(response => response.json())
        .then(data => {
          data.result.forEach(element => {
            cf_info.push({
              "name": element.name,
              "name_servers": element.name_servers,
              "original_name_servers": element.original_name_servers,
              "original_registrar": element.original_registrar
            })
            cf_names.push(element.name)
          });
        })
        .catch(error => console.log('error', error));
    }

    // check dns
    sites.forEach(async site => {
      if (reset) {
        result = [{ "message": "bot run cancelled." }]
        reset = false
        return;
      }
      let mx = []
      await dns.resolveMx(site, function (err, addresses) {
        if (addresses) {
          addresses.forEach( elem => mx.push(elem))
        } else {
          mx.push("no mx records found")
        }
      })
      await dns.resolve4(site, function (err, addresses) {
        let index = cf_names.indexOf(site)
        if (cf_names.includes(site)) {
          let records = {
            "site": site,
            "ip_addr": addresses,
            "in_cf": "yes",
            "name_servers": cf_info[index].name_servers,
            "original_name_servers": cf_info[index].original_name_servers,
            "original_registrar": cf_info[index].original_registrar,
            "mx records": mx
          }
          
          // send to results to return to front end
          result.push(records)
        } else {
          let records = {
            "site": site,
            "ip_addr": addresses,
            "in_cf": "no",
            "name_servers": cf_info[index] || `Pointed IP: ${addresses}`,
            "original_name_servers": cf_info[index] || `Pointed IP: ${addresses}`,
            "original_registrar": cf_info[index] || `data not available`,
            "mx records": mx
          }
          
          // send to results to return to front end
          result.push(records)
          result.push({
            "message": `CF / DNS check completed at ${Date()}`
          })
        }
      });

    })
  } catch (error) {
    console.log(`error: ${err}`)
  }
  
}

