export default async function globalTeardown() {
  global["ganacheServer"].close();
}
