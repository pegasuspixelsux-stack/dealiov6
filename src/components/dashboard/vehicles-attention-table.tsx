import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format-price";
import { VEHICLE_STATUS_LABELS, type Vehicle, type VehicleStatus } from "@/types";

const STATUS_BADGE_VARIANT: Record<VehicleStatus, "default" | "secondary" | "outline"> = {
  disponible: "default",
  reservado: "secondary",
  vendido: "outline",
};

function daysOnline(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

export function VehiclesAttentionTable({
  vehicles,
  staleListingDays,
}: {
  vehicles: Vehicle[];
  staleListingDays: number;
}) {
  const listed = [...vehicles]
    .filter((v) => v.status !== "vendido")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, 10);

  if (listed.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay vehículos publicados.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4">Foto</th>
          <th className="py-2 pr-4">Vehículo</th>
          <th className="py-2 pr-4">Publicado</th>
          <th className="py-2 pr-4">Días en línea</th>
          <th className="py-2 pr-4">Precio</th>
          <th className="py-2 pr-4">Estado</th>
          <th className="py-2 pr-4">Acción</th>
        </tr>
      </thead>
      <tbody>
        {listed.map((vehicle) => {
          const days = daysOnline(vehicle.createdAt);
          const stale = days > staleListingDays;
          return (
            <tr key={vehicle.id} className={cn("border-b", stale && "bg-red-50")}>
              <td className="py-2 pr-4">
                {vehicle.imageUrls[0] && (
                  <div className="relative size-12 overflow-hidden rounded-md">
                    <Image src={vehicle.imageUrls[0]} alt="" fill className="object-cover" />
                  </div>
                )}
              </td>
              <td className="py-2 pr-4">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </td>
              <td className="py-2 pr-4">
                {new Date(vehicle.createdAt).toLocaleDateString()}
              </td>
              <td className={cn("py-2 pr-4", stale && "font-semibold text-red-600")}>
                {days}
              </td>
              <td className="py-2 pr-4">{formatPrice(vehicle.price)}</td>
              <td className="py-2 pr-4">
                <Badge variant={STATUS_BADGE_VARIANT[vehicle.status]}>
                  {VEHICLE_STATUS_LABELS[vehicle.status]}
                </Badge>
              </td>
              <td className="py-2 pr-4">
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <Link href={`/inventory/${vehicle.id}`} target="_blank">
                      Ver Vehículo
                    </Link>
                  }
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
