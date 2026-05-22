"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { completePasswordReset, type ResetState } from "./actions";
import { KeyRound, ChevronLeft } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Сохранение…" : "Сохранить новый пароль"}
    </Button>
  );
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, action] = useActionState<ResetState, FormData>(completePasswordReset, {});

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Ссылка неполная</CardTitle>
          <CardDescription>
            Запросите восстановление пароля ещё раз — в письме должна быть полная ссылка.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/forgot-password">Запросить ссылку</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state.ok) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Пароль обновлён</CardTitle>
          <CardDescription>Теперь можно войти с новым паролем.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Перейти ко входу</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 grid place-items-center h-12 w-12 rounded-full bg-primary text-primary-foreground">
          <KeyRound className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl">Новый пароль</CardTitle>
        <CardDescription>Не короче 8 символов.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <PasswordFields state={state} />
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
      </CardContent>
    </Card>
  );
}

function PasswordFields({ state }: { state: ResetState }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="password">Новый пароль</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="passwordConfirm">Повторите пароль</Label>
        <Input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </>
  );
}
