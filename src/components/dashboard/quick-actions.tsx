import Link from "next/link";
import { Button } from "@/components/ui/button";

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button render={<Link href="/dashboard/inventory">Agregar Vehículo</Link>} />
      <Button
        variant="outline"
        render={<Link href="/dashboard/inventory">Gestionar Inventario</Link>}
      />
      <Button variant="outline" render={<Link href="/dashboard/pipeline">Ver Leads</Link>} />
    </div>
  );
}
