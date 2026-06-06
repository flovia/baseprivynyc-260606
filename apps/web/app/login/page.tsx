import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginClient } from "./login-client";

export default function LoginPage() {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <main className="min-h-screen bg-surface-page px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <Badge className="w-fit">Privy</Badge>
            <CardTitle className="display text-3xl">Login</CardTitle>
            <CardDescription>Privy App ID is required.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-warn bg-warn-soft p-3 text-sm text-text-2">
              Set `NEXT_PUBLIC_PRIVY_APP_ID` to enable Privy login.
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-page px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <LoginClient />
    </main>
  );
}
