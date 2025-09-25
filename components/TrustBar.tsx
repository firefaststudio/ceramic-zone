export default function TrustBar() {
  return (
    <div className="fixed top-0 z-50 w-full bg-white/95 backdrop-blur border-b text-sm">
      <div className="mx-auto max-w-7xl px-4 py-2 flex gap-6 items-center justify-between">
        <div className="flex gap-4">
          <a href="/contatti" className="font-medium">Chat live</a>
          <a href="tel:+39..." className="hidden md:inline">+39 …</a>
          <a href="mailto:support@..." className="hidden md:inline">support@…</a>
        </div>
        <div className="flex gap-3 items-center">
          <img src="/badges/ssl.svg" alt="SSL" className="h-5" />
          <img src="/badges/3ds2.svg" alt="3DS2" className="h-5" />
          <a href="/reso-garanzia" className="underline">Reso & Garanzia</a>
        </div>
      </div>
    </div>
  );
}
