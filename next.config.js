/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['cdn.pixabay.com', 'images.unsplash.com']
  }
  // Tắt dòng experimental.turbo để tránh warning
}
module.exports = nextConfig
