' Электронная зачётная книжка — автозапуск Next.js production-сервера.
' Запускается из shell:startup без видимого окна. Логи — в app.log.
'
' Что делает:
'   1. Переходит в папку проекта
'   2. Записывает в app.log заголовок со временем старта
'   3. Запускает: npm run start  (порт 3000), stdout+stderr -> app.log
'   4. Возвращает управление сразу (False = не ждать завершения)

Dim objShell, projectDir, fso, logFile, ts
Set objShell = CreateObject("WScript.Shell")
Set fso      = CreateObject("Scripting.FileSystemObject")

projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
logFile    = projectDir & "\app.log"

' Заголовок в лог — упрощает диагностику, если что-то не стартанёт
ts = FormatDateTime(Now, 0)
Dim log
Set log = fso.OpenTextFile(logFile, 2, True)  ' 2 = ForWriting (overwrite)
log.WriteLine "──────── EZK autostart " & ts & " ────────"
log.Close

' 0 = окно скрыто, False = не ждать завершения.
' >> append (вместо >) чтобы заголовок выше не затёрся.
objShell.Run "cmd /c cd /d """ & projectDir & """ && npm run start >> app.log 2>&1", 0, False
