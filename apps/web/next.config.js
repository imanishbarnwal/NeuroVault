/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@neurovault/eeg-utils"],
  experimental: {
    // Prevent webpack from bundling these server-side packages —
    // they use Node.js APIs and have ESM subpath exports that
    // conflict with webpack's module resolution.
    serverComponentsExternalPackages: [
      "@storacha/client",
      "multiformats",
      "@ucanto/principal",
      "@ucanto/client",
      "@ucanto/transport",
      "@ucanto/core",
    ],
  },
  webpack: (config, { isServer }) => {
    // Lit Protocol needs Node.js polyfills in the browser bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        buffer: require.resolve("buffer/"),
        process: require.resolve("process/browser"),
        path: false,
        os: false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };

      const webpack = require("webpack");
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: "process/browser",
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;
