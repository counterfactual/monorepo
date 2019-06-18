export default async function globalTeardown() {
  global["chain"].server.close();
}
