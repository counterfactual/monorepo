/* tslint:disable */
var byteToHex = [] as string[];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf) {
  var i = 0;
  var bth = byteToHex;
  // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
  return [
    bth[buf[i++]],
    bth[buf[i++]],
    bth[buf[i++]],
    bth[buf[i++]],
    "-",
    bth[buf[i++]],
    bth[buf[i++]],
    "-",
    bth[buf[i++]],
    bth[buf[i++]],
    "-",
    bth[buf[i++]],
    bth[buf[i++]],
    "-",
    bth[buf[i++]],
    bth[buf[i++]],
    bth[buf[i++]],
    bth[buf[i++]],
    bth[buf[i++]],
    bth[buf[i++]]
  ].join("");
}

export default function v4() {
  var rnds = crypto.getRandomValues(new Uint8Array(16));

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  return bytesToUuid(rnds);
}
