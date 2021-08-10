const json2xls = require('json2xls')

module.exports = async function jsonToXls(json) {
  const xls = json2xls(json)
  return xls
}