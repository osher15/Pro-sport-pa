"use strict";
const {run}=require("./harness.js");
const suites=[
  require("./identity.e2e.js"),
  require("./storage.e2e.js"),
  require("./backup.e2e.js"),
  require("./classes.e2e.js"),
  require("./progress.e2e.js"),
  require("./corrective.e2e.js"),
  require("./session.e2e.js"),
  require("./profile.e2e.js"),
  require("./teach.e2e.js"),
  require("./identity8.e2e.js"),
  require("./rename9.e2e.js"),
  require("./coverage10.e2e.js"),
  require("./polish10_5.e2e.js"),
  require("./progress11.e2e.js"),
  require("./attendgrade12.e2e.js"),
  require("./pilotpolish13.e2e.js")
];
run(suites).then(fail=>process.exit(fail?1:0))
  .catch(e=>{ console.error(e); process.exit(1); });
