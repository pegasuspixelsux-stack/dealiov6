import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { getVehicles } from "@/lib/vehicles/vehicles";
import { AddVehicleModal } from "./add-vehicle-modal";
import { EditVehicleModal } from "./edit-vehicle-modal";

export default async function InventoryPage() {
  const session = await verifySession();
  if (!session) return null;

  const vehicles = await getVehicles(session.dealershipId);
  const canManage = can(session.role, "canManageVehicles");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Inventory</h1>
        {canManage && <AddVehicleModal />}
      </div>

      {vehicles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No vehicles yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Vehicle</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Price</th>
              <th className="py-2 pr-4">Mileage</th>
              <th className="py-2 pr-4">Featured</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="border-b">
                <td className="py-2 pr-4">
                  {vehicle.make} {vehicle.model} {vehicle.year}
                </td>
                <td className="py-2 pr-4 capitalize">{vehicle.category}</td>
                <td className="py-2 pr-4">${vehicle.price.toLocaleString()}</td>
                <td className="py-2 pr-4">{vehicle.mileage.toLocaleString()} km</td>
                <td className="py-2 pr-4">{vehicle.featured ? "Yes" : "No"}</td>
                <td className="py-2 pr-4">
                  {canManage && <EditVehicleModal vehicle={vehicle} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
