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
};

module.exports = nextConfig;
