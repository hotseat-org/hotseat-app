require('dotenv').config();

/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  ignoredRouteFiles: ['.*'],
  future: {
    v2_routeConvention: true,
  },
  publicPath: process.env.ASSETS_PATH || "/build/",
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "build/index.js",
  // devServerPort: 8002
}
