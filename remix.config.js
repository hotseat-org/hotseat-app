require('dotenv').config();

/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  ignoredRouteFiles: ['.*'],
  tailwind: true,
  serverModuleFormat: "cjs",
  future: {
    v2_routeConvention: true,
    v2_errorBoundary: true,
    v2_meta: true, 
    v2_normalizeFormMethod: true,
    v2_dev: true,
    v2_headers: true,
  },
  publicPath: process.env.ASSETS_PATH || "/build/",
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "build/index.js",
  // devServerPort: 8002
}
