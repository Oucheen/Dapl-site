import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        destination: "https://www.daplappliance.com/:path*",
        permanent: true,
        has: [
          {
            type: "host",
            value: "daplappliance.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
