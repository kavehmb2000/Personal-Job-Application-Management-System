import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // existing configuration
};

module.exports = nextConfig;

export default withSerwist(nextConfig);
