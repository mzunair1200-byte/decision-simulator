const nextConfig = {
  eslint: {
    // This ignores ESLint errors during build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // This ignores TypeScript type errors during build
    ignoreBuildErrors: true, 
  },
};

export default nextConfig;