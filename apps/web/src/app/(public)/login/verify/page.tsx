import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Проверь почту</CardTitle>
          <CardDescription>
            Мы отправили ссылку для входа. Перейди по ней чтобы войти.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Письмо может попасть в спам.
        </CardContent>
      </Card>
    </div>
  );
}
