import { Suspense } from "react";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen grid place-items-center bg-secondary/50 p-4">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
