/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cấu hình này giúp fix lỗi CORS cho audio
  async headers() {
    return [
      {
        source: '/sounds/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;