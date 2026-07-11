import { MapPin, Phone, MessageCircle, Mail } from "lucide-react";
import type { DealershipConfig } from "@/types";

const DAY_LABELS: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

export function Footer({ dealership }: { dealership: DealershipConfig }) {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2">
        <div>
          <h2 className="font-semibold">{dealership.name}</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" />
              {dealership.address}
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0" />
              {dealership.phone}
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="size-4 shrink-0" />
              {dealership.whatsapp}
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 shrink-0" />
              {dealership.email}
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold">Horario</h3>
          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
            {Object.entries(dealership.hours).map(([day, hours]) => (
              <li key={day} className="flex justify-between gap-4">
                <span>{DAY_LABELS[day] ?? day}</span>
                <span>{hours}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} {dealership.name}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
