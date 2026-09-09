/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    // Assets are local static files (logo + pre-optimized .webp illustrations).
    // The Next image optimizer requires the native `sharp` binary, which isn't
    // available in every environment and made /_next/image return 404, breaking
    // all <Image> renders. Serving the originals directly is robust everywhere.
    unoptimized: true,
  },
}

export default nextConfig
