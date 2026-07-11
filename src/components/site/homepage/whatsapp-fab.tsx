import { MessageCircle } from "lucide-react";
import type { DealershipConfig } from "@/types";

export function WhatsAppFab({
  dealership,
}: {
  dealership: DealershipConfig;
}) {
  return (
    <a
      href={`https://wa.me/${dealership.whatsapp.replace(/[^\d]/g, "")}`}
      aria-label="Chatear por WhatsApp"
      className="fixed right-6 bottom-6 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 md:right-[100px] md:bottom-[100px]"
    >
      <MessageCircle className="size-7" />
    </a>
  );
}
