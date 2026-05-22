"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestPasswordReset, type ForgotState } from "./actions";
import { KeyRound, ChevronLeft } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Отправка…" : "Прислать ссылку на почту"}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const [state, action] = useActionState<ForgotState, FormData>(requestPasswordReset, { status: "idle" });

  return (
    <main className="min-h-screen grid place-items-center bg-secondary/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 grid place-items-center h-12 w-12 rounded-full bg-primary text-primary-foreground">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Восстановление пароля</CardTitle>
          <CardDescription>
            Укажите email, привязанный к учётной записи. Мы пришлём ссылку, по которой можно задать новый пароль.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.status === "ok" ? (
            <div className="space-y-4">
              <div className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
                {state.message}
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Вернуться ко входу
                </Link>
              </Button>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              {state.status === "error" && (
                <p className="text-sm text-destructive">{state.message}</p>
              )}
              <SubmitButton />
              <div className="text-center">
                <Link
                  href="/login"
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline inline-flex items-center"
                >
                  <ChevronLeft className="h-3 w-3 mr-1" />
                  Назад ко входу
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
