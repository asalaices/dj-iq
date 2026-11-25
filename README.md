# DJ-IQ
GPLv3 AI-assisted DJ workstation for macOS. Independent of any private infrastructure.
## Run the first prototype
```sh
./install.sh
./server.sh --action start
```
Open http://127.0.0.1:8765. Load two local audio files, play both and move the crossfader. Audio stays in the browser. The browser now estimates BPM and beat phase, shows a waveform and provides pitch-preserving tempo matching (±16%) and manual cue alignment. Estimates are heuristic and may choose a half/double tempo or incorrect phase; verify by ear. Analysis uses the first channel, at most the first 180 seconds for tempo, in a worker after local decode. This is not sample-accurate sync or autonomous DJing.
Python 3.11+ is required; the installer creates an isolated environment using only the standard library. If missing, install Python from python.org or Homebrew first. No sudo, external audio uploads or automatic model downloads.
## AI
The planner supports deterministic mode, local Ollama, remote Ollama HTTPS and Anthropic/OpenAI-compatible APIs. Select provider/model in the UI. Set remote endpoints in server environment variables DJIQ_REMOTE_URL (Ollama base URL) or DJIQ_OPENAI_URL (compatible API base URL including /v1 if required). Credentials are supplied in DJIQ_API_KEY or DJIQ_ANTHROPIC_KEY, never stored in Git. Use only trusted endpoints; do not share keys across unrelated providers. The existing private gateway authentication contract still needs end-to-end validation. Copilot integration is pending supported SDK authentication validation. AI output is advisory only in this release.
## Themes
Execution Desk-inspired palette values sourced from master-01 commit 99ef471d0b39a351003db643fafa31f44f2cd59d. Six named themes plus the Execution Desk custom default. Original DJ-IQ implementation; no private configuration or application code copied.
Optional analysis tests: run `node tests/test_analysis.cjs` with Node.js installed. See ROADMAP.md for acceptance gates.
