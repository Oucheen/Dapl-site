import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  async redirects() {
    return [
      {
        source: "/contact",
        destination: "/booking",
        permanent: true,
      },
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
