module.exports = async function () {
  console.log("tearing down");
  global.ganacheServer.close();
}
