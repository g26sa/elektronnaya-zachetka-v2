// Прямая проверка SMTP-настроек: пытаемся отправить тестовое письмо.
// Использует переменные SMTP_* из .env.
import "dotenv/config";
import { sendMail } from "../src/lib/mailer";

async function main() {
  console.log("SMTP_HOST:", process.env.SMTP_HOST);
  console.log("SMTP_PORT:", process.env.SMTP_PORT);
  console.log("SMTP_SECURE:", process.env.SMTP_SECURE);
  console.log("SMTP_USER:", process.env.SMTP_USER);
  console.log("SMTP_PASS:", process.env.SMTP_PASS ? "***" + process.env.SMTP_PASS.slice(-4) : "(не задан)");
  console.log("SMTP_FROM:", process.env.SMTP_FROM);
  console.log("");

  const target = process.argv[2] || process.env.SMTP_USER!;
  console.log(`Отправляю тестовое письмо на: ${target}\n`);

  const result = await sendMail({
    to: target,
    subject: "Проверка SMTP — Электронная зачётная книжка",
    text:
      "Это тестовое письмо от приложения «Электронная зачётная книжка».\n\n" +
      "Если вы видите это сообщение — SMTP настроен корректно.\n" +
      `Время отправки: ${new Date().toLocaleString("ru-RU")}\n`,
    html:
      `<h2 style="font-family:sans-serif">Проверка SMTP</h2>` +
      `<p>Это тестовое письмо от приложения «Электронная зачётная книжка».</p>` +
      `<p>Если вы видите это сообщение — SMTP настроен корректно.</p>` +
      `<p style="color:#6b7280">Время отправки: ${new Date().toLocaleString("ru-RU")}</p>`,
  });

  if (result.ok) {
    console.log("✅ Письмо отправлено успешно. Проверьте почту (и папку «Спам»).");
  } else {
    console.log(`❌ Не удалось отправить: ${result.reason}`);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
