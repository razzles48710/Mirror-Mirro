@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Please complete the one-time setup in README.md first.
  pause
  exit /b 1
)
if not defined VOSK_MODEL set "VOSK_MODEL=%CD%\models\vosk-model-small-en-us-0.15"
if not defined OLLAMA_MODEL set "OLLAMA_MODEL=llava:7b"
if not exist "%VOSK_MODEL%\am" (
  echo Vosk model not found. Follow step 4 in README.md.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" start_mirror.py
pause
