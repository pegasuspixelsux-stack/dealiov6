import { Suspense } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Dashboard sign in</CardTitle>
          <CardDescription>
            Sign in to manage inventory, leads, and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
      <Link
        href="/"
        className="text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Volver al sitio
      </Link>
    </div>
  );
}
