/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Exclude puppeteer packages from webpack bundling (server-only)
  serverExternalPackages: [
    "puppeteer",
    "puppeteer-core",
    "puppeteer-extra",
    "puppeteer-extra-plugin-stealth",
  ],

  // Webpack configuration for handling puppeteer dependencies
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark puppeteer as external for server-side builds
      config.externals = config.externals || [];
      config.externals.push({
        puppeteer: "commonjs puppeteer",
        "puppeteer-core": "commonjs puppeteer-core",
        "puppeteer-extra": "commonjs puppeteer-extra",
        "puppeteer-extra-plugin-stealth":
          "commonjs puppeteer-extra-plugin-stealth",
      });
    }
    return config;
  },
};

export default nextConfig;
