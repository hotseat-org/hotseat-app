import { createRequestHandler } from "@remix-run/architect";

const build = require(".");

exports.handler = createRequestHandler({
  build,
  getLoadContext(event) {
    return {};
  }
});
