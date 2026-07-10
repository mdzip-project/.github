' Launches the MDZip workspace dashboard with no visible console window.
' Used by a Windows Startup-folder shortcut so the dashboard is already
' running whenever a work session begins. Safe to double-click by hand too.
' Output (including the "already running" error if a copy is up already)
' goes to %TEMP%\mdzip-dashboard.log for diagnostics.

Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
logFile = fso.GetSpecialFolder(2) & "\mdzip-dashboard.log"

Set shell = CreateObject("WScript.Shell")
cmd = "cmd /c cd /d """ & scriptDir & """ && node server.js >> """ & logFile & """ 2>&1"
shell.Run cmd, 0, False

' Give the server a moment to bind, then open a tab in the default browser.
' If a copy was already running (e.g. a prior login session), this just
' opens one more tab pointed at the existing server -- harmless, and this
' script only runs once per logon anyway.
WScript.Sleep 1500
shell.Run "http://localhost:7777", 1, False
