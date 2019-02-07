module.exports = async function() {
  console.log("tearing down");
  // @ts-ignore
  global.ganacheServer.close();
};
