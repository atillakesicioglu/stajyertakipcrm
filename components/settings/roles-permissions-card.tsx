import { Check, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type RoleKey,
} from "@/lib/permissions";

export function RolesPermissionsCard({
  roleCounts,
}: {
  roleCounts: Record<RoleKey, number>;
}) {
  const roles: RoleKey[] = ["ADMIN", "INTERN"];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Kullanıcı Rolleri & Yetkiler</CardTitle>
        <CardDescription>
          Mevcut rol yapısı ve modül izinleri
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Rol</th>
              {PERMISSION_MODULES.map((mod) => (
                <th key={mod.key} className="pb-2 px-1 text-center font-medium">
                  {mod.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role} className="border-b last:border-0">
                <td className="py-3 pr-4 align-top">
                  <div className="font-medium">{ROLE_LABELS[role]}</div>
                  <div className="text-xs text-muted-foreground">
                    {ROLE_DESCRIPTIONS[role]}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {roleCounts[role]} kullanıcı
                  </div>
                </td>
                {PERMISSION_MODULES.map((mod) => {
                  const perms = ROLE_PERMISSIONS[role][mod.key];
                  const hasAny = perms.length > 0;
                  return (
                    <td key={mod.key} className="px-1 py-3 text-center align-top">
                      {hasAny ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <Check className="size-4 text-green-600" />
                          <span className="text-[10px] text-muted-foreground">
                            {perms
                              .map(
                                (p) =>
                                  PERMISSION_ACTIONS.find((a) => a.key === p)
                                    ?.label ?? p
                              )
                              .join(", ")}
                          </span>
                        </div>
                      ) : (
                        <X className="mx-auto size-4 text-muted-foreground/50" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
