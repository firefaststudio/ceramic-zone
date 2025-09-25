const securityHeaders = [
  { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' https: data:; script-src 'self' 'unsafe-inline' https:; connect-src 'self' https:;" },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

module.exports = {
  images: { domains: ['cdn.tuodominio.com'], formats: ['image/avif', 'image/webp'] },
  experimental: { optimizeCss: true, optimizePackageImports: ['react'] },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
