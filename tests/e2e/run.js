"use strict";
const {run}=require("./harness.js");
const suites=[
  require("./identity.e2e.js"),
  require("./storage.e2e.js"),
  require("./backup.e2e.js")
];
run(suites).then(fail=>process.exit(fail?1:0))
  .catch(e=>{ console.error(e); process.exit(1); });
