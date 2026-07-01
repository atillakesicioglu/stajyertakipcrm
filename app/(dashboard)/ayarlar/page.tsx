import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ThemeSettings } from "@/components/theme-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AyarlarPage() {
  const session = await getSession();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { name: true, email: true, theme: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ayarlar</h1>
        <p className="text-sm text-muted-foreground">
          Hesap ve tema tercihlerinizi yönetin
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tema</CardTitle>
          <CardDescription>
            Panel görünümünü aydınlık veya karanlık olarak ayarlayın.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSettings initialTheme={user?.theme ?? "SYSTEM"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hesap Bilgileri</CardTitle>
          <CardDescription>Giriş yaptığınız hesap.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">Ad Soyad</span>
            <span className="font-medium">{user?.name}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">E-posta</span>
            <span className="font-medium">{user?.email}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
