const concat = require("concat");
const fs = require("fs");
const glob = require("glob");
const path = require("path");

glob("src/components/**/*.html", (err, matches) => {
  if (err) return;

  concat(matches, "./dist/web-components.html");
});

glob("src/components/**/*.css", (err, matches) => {
  if (err) return;

  matches.forEach(match => fs.copyFileSync(match, "./dist/" + path.basename(match)));
})
