/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app and you should
 * disable HTTP caching for this file too.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */

importScripts("https://storage.googleapis.com/workbox-cdn/releases/3.4.1/workbox-sw.js");

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
self.__precacheManifest = [
  {
    "url": "assets/cf.js",
    "revision": "623b1b8c69d8a55f49e38da5b7b1b259"
  },
  {
    "url": "assets/ethers.js",
    "revision": "1033cb7c36609c7c1273437070e27b44"
  },
  {
    "url": "assets/eventemitter3.js",
    "revision": "b12e2305b232f35b799a9a2d1f25357c"
  },
  {
    "url": "assets/types.js",
    "revision": "c7b6a9435ce564c8adaa6ba352f7ed99"
  },
  {
    "url": "build/app.css",
    "revision": "39d4df5e12e2ab04fd729dc88089897e"
  },
  {
    "url": "build/app.js",
    "revision": "e5323e25d36b6197f7468c1541f13454"
  },
  {
    "url": "build/app/app.aymlouxj.js",
    "revision": "03298b394c490f93bdf0ab645b89784e"
  },
  {
    "url": "build/app/app.vcz8zqzn.js",
    "revision": "bdccfc65064d1fce3279f8946195dcef"
  },
  {
    "url": "build/app/chunk-346f9d40.es5.js",
    "revision": "1a4f9607bc5329cb558c7376e7d653a1"
  },
  {
    "url": "build/app/chunk-48936b03.es5.js",
    "revision": "ee398715d914c39a27fbc01d808ab416"
  },
  {
    "url": "build/app/chunk-4f14aa24.js",
    "revision": "889a3fb985f3e94a9d294d8d0698d15e"
  },
  {
    "url": "build/app/chunk-650041b1.es5.js",
    "revision": "0532d21d92da8662797abcbc0127103f"
  },
  {
    "url": "build/app/chunk-7a957887.es5.js",
    "revision": "30288669cc1d0bc9103bf3b4910111cb"
  },
  {
    "url": "build/app/chunk-91bb08fc.js",
    "revision": "505615a159f5ae7a5d26f0cba7bf4820"
  },
  {
    "url": "build/app/chunk-960e9c51.js",
    "revision": "a7174c69eafbd4a0502bdd5aa7ca3749"
  },
  {
    "url": "build/app/chunk-a0cc8100.js",
    "revision": "efd63fab08702faecf0a919ab862c1d2"
  },
  {
    "url": "build/app/chunk-b4eb213b.es5.js",
    "revision": "63f0b0f7df349d71c39a59e8d32d2c40"
  },
  {
    "url": "build/app/chunk-deed3e85.js",
    "revision": "73fb283ed18dcd9b8d6c3f56009334f8"
  },
  {
    "url": "build/app/dd3igpwq.entry.js",
    "revision": "0c3de280f5aa2acfccecbe051d2291fc"
  },
  {
    "url": "build/app/dd3igpwq.sc.entry.js",
    "revision": "0c3de280f5aa2acfccecbe051d2291fc"
  },
  {
    "url": "build/app/dwwo5lxz.entry.js",
    "revision": "fddc303b92f166cca1d386d8833ab5d3"
  },
  {
    "url": "build/app/dwwo5lxz.sc.entry.js",
    "revision": "7c5bd311f456968b64b11eda80ed3247"
  },
  {
    "url": "build/app/jjpknqko.entry.js",
    "revision": "2633ca37f4243a32396b93abf27d503d"
  },
  {
    "url": "build/app/jjpknqko.sc.entry.js",
    "revision": "c09e0a428d4fd78f08b2e40b80662cbe"
  },
  {
    "url": "build/app/qk4nkr9j.entry.js",
    "revision": "424e0d291f49b155af1e34771adc78dd"
  },
  {
    "url": "build/app/qk4nkr9j.sc.entry.js",
    "revision": "4985ac5c19ad8aadd83f569db91cbb15"
  },
  {
    "url": "build/app/qwk1kvao.entry.js",
    "revision": "4302b591568e71fd848fdcb661ada3cb"
  },
  {
    "url": "build/app/qwk1kvao.sc.entry.js",
    "revision": "b7191083a74d39a8012aab7dc8622b63"
  },
  {
    "url": "build/app/skb3bew9.entry.js",
    "revision": "b246ffddb796f5e5a86689a8f0d11a9b"
  },
  {
    "url": "build/app/skb3bew9.sc.entry.js",
    "revision": "160220dd4595f48cb305b46f584282d4"
  },
  {
    "url": "build/app/uk58qszp.entry.js",
    "revision": "50ae7caacce9cd5dd647d01b5f044a65"
  },
  {
    "url": "build/app/uk58qszp.sc.entry.js",
    "revision": "50ae7caacce9cd5dd647d01b5f044a65"
  },
  {
    "url": "index.html",
    "revision": "84b601d9b783f948daefa3ac3b9383e5"
  },
  {
    "url": "manifest.json",
    "revision": "a90f1bfeb157d51107bd589049ed1bf9"
  }
].concat(self.__precacheManifest || []);
workbox.precaching.suppressWarnings();
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});
