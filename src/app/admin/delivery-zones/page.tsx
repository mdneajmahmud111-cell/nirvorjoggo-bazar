import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { DeliveryZoneList } from "./_components/delivery-zone-list";
import { MasterLocationSection } from "./_components/master-location-section";
import type { DeliveryZoneData } from "./_components/delivery-zone-form";

export default async function AdminDeliveryZonesPage() {
  await requireRole("ADMIN", "STAFF");

  const [zones, locations] = await Promise.all([
    prisma.deliveryZone.findMany({ orderBy: { name: "asc" } }),
    prisma.masterLocation.findMany({
      include: { deliveryZone: { select: { id: true, name: true } } },
      orderBy: [{ division: "asc" }, { district: "asc" }],
    }),
  ]);

  const zoneRows: DeliveryZoneData[] = JSON.parse(JSON.stringify(zones));
  const locationRows = JSON.parse(JSON.stringify(locations));
  const activeZoneOptions = zoneRows.filter((z) => z.isActive).map((z) => ({ id: z.id, name: z.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Delivery Zones</h1>
        <p className="mt-1 text-sm text-gray-500">
          This is the only place shipping fees are configured — nothing is hard-coded elsewhere in the app.
        </p>
      </div>

      <DeliveryZoneList zones={zoneRows} />
      <MasterLocationSection locations={locationRows} zoneOptions={activeZoneOptions} />
    </div>
  );
}
