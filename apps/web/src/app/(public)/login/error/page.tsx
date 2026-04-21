import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Ошибка входа</CardTitle>
          <CardDescription>Ссылка недействительна или истекла.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className={buttonVariants({ variant: "outline", className: "w-full" })}>
            Попробовать снова
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
