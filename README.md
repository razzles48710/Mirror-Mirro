# Laptop Screen Enchanted Mirror

Your Windows laptop is the complete mirror: its screen displays your reflection from its built-in camera, and its built-in microphone listens for the wake phrase. No additional display or mirror materials are needed.

Your Intel i3-1005G1 / 20 GB RAM laptop can be used for the initial test. AI image answers may be slow; close unnecessary apps, keep it plugged in, and prevent sleep while using the mirror. Uncheck image analysis for questions that do not need it; the camera reflection remains visible.

## What it does

1. Click **Enable camera + wake listening** once and grant camera/microphone permission.
2. The screen shows your mirrored camera view, waiting for **“magic mirror on the wall.”**
3. Pause briefly after the phrase. The face appears and greets you. Ask your question after it finishes speaking.
4. A current camera snapshot accompanies each question when **Let the mirror see** is checked. The vision model can discuss what is visible. This is not identity recognition.
5. Say **“go to sleep”**, click Sleep, or leave it idle for 60 seconds after a response. The face disappears and the camera mirror view returns. The microphone keeps listening locally for the wake phrase.
6. **Stop camera + microphone** releases both devices. Sleep is standby, not a device-off control.

The app and speech listener must already be running to hear the phrase. A browser cannot launch a closed application from a spoken phrase. After a browser restart, enabling devices/audio may require another click. Wake detection uses recognized words rather than a dedicated wake-word neural model; noise, distance and accents can cause missed or false activations. Keep one mirror tab open (one recognizer per server).

## Windows setup — step by step

1. Extract the ZIP. Open PowerShell in the folder containing `server.py`.
2. Install Python 3.10+ and [Ollama](https://ollama.com/download). Make sure Ollama is running.
3. Install local voice recognition:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

4. Download **vosk-model-small-en-us-0.15** from [Vosk models](https://alphacephei.com/vosk/models). Extract it into `models/`. The model directory should contain `am`, `conf`, and other model files directly, not another nested folder of the same name.
5. Install a vision-capable Ollama model. The earlier text-only `llama3.2:3b` cannot interpret the camera:

```powershell
ollama pull llava:7b
```

6. Start the mirror (adjust the model path if you extracted it elsewhere):

```powershell
$env:VOSK_MODEL="$PWD\models\vosk-model-small-en-us-0.15"
$env:OLLAMA_MODEL="llava:7b"
.\.venv\Scripts\python.exe server.py
```

7. Open **http://localhost:8080** in Chrome. Click Enable camera + wake listening, allow both devices, and test the phrase. A visible camera image confirms camera access. Stop speaking briefly to let local recognition finalize the phrase.
8. Click Fullscreen. Leave the terminal and browser running.

Typing works even without Vosk or a camera. Browser speech output is the fallback if Piper is not configured. Install an OS voice and test speakers. If camera/mic permission was denied, use Chrome's site controls for localhost to allow it, then reload. If a vision response fails, verify `ollama run llava:7b` works. Vision models can be slow on modest hardware.

## Local voice output with Piper (optional)

Install `piper-tts` in the same virtual environment. Download a compatible voice `.onnx` and matching `.onnx.json` file from the [Piper project](https://github.com/OHF-Voice/piper1-gpl), checking the voice's license. Set `PIPER_MODEL` to the absolute `.onnx` path. Set `PIPER_BIN` to your virtual environment's Piper executable if it is not on PATH. Then restart the server. Piper is separate software under its own license.

```powershell
.\.venv\Scripts\python.exe -m pip install piper-tts
$env:PIPER_MODEL="$PWD\voices\en_US-lessac-medium.onnx"
$env:PIPER_BIN="$PWD\.venv\Scripts\piper.exe"
.\.venv\Scripts\python.exe server.py
```

Download the voice files before running this example. Mouth motion is a stylized speaking animation, not accurate phoneme lip sync. Microphone samples are ignored during thinking and playback to reduce feedback.

## Everyday use on your laptop

After completing setup, double-click **Start-Mirror.cmd**. It starts the local server and opens the page in your default browser. Use Chrome or Edge if that browser cannot access camera/audio. The launcher expects the virtual environment and Vosk model at the paths used above, but respects existing environment settings.

Click **Enable camera + wake listening**, allow camera/mic access, then click **Fullscreen** (Esc exits). Your reflection fills the background while waiting. The mirror face replaces the reflection when you say the wake phrase. Say “go to sleep” to return to the camera reflection. Stop camera + microphone turns both off. Close the page and press Ctrl+C in the terminal when finished.

In Windows Settings, find **Power & battery / Screen and sleep** (wording varies by Windows version) and prevent the laptop from sleeping while plugged in during use. Keep its lid open so the camera can see you. Use comfortable speaker volume to reduce microphone feedback.

## Data handling

Audio goes from the browser to the loopback Python server for Vosk transcription, including while waiting for the wake phrase. Audio is not saved. Video stays in the browser while idle. When awake, one JPEG per question is sent to the configured Ollama server if the vision checkbox is on; it is not a continuous vision feed. Untick it to keep the preview without image analysis. The application does not save snapshots or transcripts to disk; conversations are in page memory and clear on sleep/reload. External services you configure have their own data behavior. There is no browser cloud speech-recognition service in this version.

## Configuration and tests

`OLLAMA_MODEL` defaults to `llava:7b`; `OLLAMA_URL` to `http://127.0.0.1:11434`; `PORT` to `8080`. Other settings: `VOSK_MODEL`, `PIPER_MODEL`, `PIPER_BIN`. Server binds only to loopback. Camera/microphone access requires localhost or an appropriately secured origin.

Run `python -m unittest discover -s tests -v` and `node tests/test_voice.js`. Tests use a fake Ollama endpoint and simulated recognized phrases. Live camera, Vosk recognition quality, audio output, and hardware performance must be verified on your device.

Original renderer and integration; no unidentified Mirror Me code is bundled. References: [Ollama vision API](https://docs.ollama.com/capabilities/vision), [Vosk microphone example](https://github.com/alphacep/vosk-api/blob/master/python/example/test_microphone.py), [Piper](https://github.com/OHF-Voice/piper1-gpl). No paid AI API key is needed.
