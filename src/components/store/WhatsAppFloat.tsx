export function WhatsAppFloat({ phone, label }: { phone: string; label: string }) {
  if (!phone) return null;
  return (
    <a
      href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hi ${label}, I need help with`)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-[#25D366] text-white pl-4 pr-5 h-14 shadow-lift hover:scale-105 transition-transform"
    >
      <svg viewBox="0 0 32 32" className="w-7 h-7 fill-white" aria-hidden="true">
        <path d="M16.004 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.6 4.46 1.72 6.4L3.2 28.8l6.56-1.68a12.74 12.74 0 0 0 6.24 1.6h.01c7.06 0 12.8-5.74 12.8-12.8s-5.75-12.72-12.81-12.72Zm0 23.35h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-4.02 1.05 1.07-3.92-.25-.4a10.55 10.55 0 0 1-1.62-5.62c0-5.85 4.77-10.61 10.62-10.61 2.84 0 5.5 1.1 7.5 3.11a10.55 10.55 0 0 1 3.11 7.51c0 5.85-4.77 10.59-10.61 10.59Zm5.82-7.94c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.72.16-.21.32-.83.97-1.01 1.17-.19.2-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.5.14-.66.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.09 1.07-1.09 2.6s1.12 3.01 1.28 3.22c.16.21 2.2 3.36 5.32 4.71.74.32 1.32.51 1.77.65.75.24 1.42.2 1.96.12.6-.09 1.85-.76 2.11-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.61-.37Z" />
      </svg>
      <span className="text-sm font-bold hidden sm:block">Chat with us</span>
    </a>
  );
}
