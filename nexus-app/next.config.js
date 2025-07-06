/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude Supabase Edge functions from Next.js build
  webpack: (config, { isServer }) => {
    // Ignore Supabase functions directory during build
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/supabase/functions/**', '**/node_modules/**']
    };
    
    return config;
  }
}

module.exports = nextConfig 