const concat = require("concat");
const glob = require("glob");

glob("src/components/**/*.html", (err, matches) => {
  if (err) return;

  concat(matches, "./dist/web-components.html");
});

glob("src/components/**/*.css", (err, matches) => {
  if (err) return;

  concat(matches, "./dist/web-components.css");
})
