declare module 'stripe' {
  const Stripe: any;
  export default Stripe;
}

declare module '@/lib/server' {
  const anyExport: any;
  export = anyExport;
}

// fallback for deep relative imports used in dynamic import()
declare module '*';
