const WC_CONNECT =
  "https://*.walletconnect.com https://*.walletconnect.org " +
  "https://relay.walletconnect.com https://rpc.walletconnect.com " +
  "https://verify.walletconnect.com https://verify.walletconnect.org " +
  "https://pulse.walletconnect.org https://*.hashpack.app https://*.hedera.com";
const WC_WS = "wss://*.walletconnect.com wss://*.walletconnect.org wss://relay.walletconnect.com";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent webpack from bundling native sharp binary incorrectly
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.ipfs.w3s.link",
      },
      {
        protocol: "https",
        hostname: "**.pinata.cloud",
      },
      {
        protocol: "https",
        hostname: "**.amazon.com",
      },
      {
        protocol: "https",
        hostname: "**.nike.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' blob: data: https://*.ipfs.w3s.link https://*.pinata.cloud https://*.amazon.com https://*.amazon.in https://*.nike.com https://*.stockx.com https://images.unsplash.com https://picsum.photos https://fastly.picsum.photos https://placehold.co; " +
              "connect-src 'self' " +
              WC_CONNECT +
              " https://*.pinata.cloud https://api.openai.com https://*.googleapis.com https://*.pinecone.io " +
              WC_WS +
              "; " +
              "frame-src 'self' https://*.hashpack.app https://*.bladewallet.io " +
              WC_CONNECT +
              ";",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
