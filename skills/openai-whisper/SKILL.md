---
name: openai-whisper
description: Local speech-to-text with the Whisper CLI (no API key).
homepage: https://openai.com/research/whisper
metadata: {"clawdbot":{"emoji":"🎙️","requires":{"bins":["whisper"],"python":true},"install":[{"id":"pip","kind":"pip","package":"openai-whisper","bins":["whisper"],"label":"Install OpenAI Whisper via pip"}]}}
---

# Whisper (CLI)

Use `whisper` to transcribe audio locally without requiring API keys.

Clawdbot supports three local audio transcription tools, checked in priority order:

## 1. sherpa-onnx-offline (ONNX Runtime)
Fast inference using ONNX models. Requires model directory with tokens, encoder, decoder, and joiner files.

Installation:
```bash
pip install sherpa-onnx
```

Environment setup:
```bash
export SHERPA_ONNX_MODEL_DIR=/path/to/model
```

The model directory must contain:
- `tokens.txt`
- `encoder.onnx`
- `decoder.onnx`
- `joiner.onnx`

## 2. whisper-cpp (C++ implementation)
Recommended for best speed/accuracy balance. Lightweight C++ implementation.

Installation:
```bash
brew install whisper-cpp
```

Environment setup (optional):
```bash
export WHISPER_CPP_MODEL=/path/to/model.bin
```

Default model location: `/opt/homebrew/share/whisper-cpp/for-tests-ggml-tiny.bin`

Quick start:
```bash
whisper-cli -m /path/to/model.bin -otxt -of output -np -nt audio.mp3
```

## 3. whisper (Python package)
Original OpenAI implementation via pip. Most compatible but slower than whisper-cpp.

Installation:
```bash
pip install openai-whisper
# or
uv pip install openai-whisper
```

Quick start:
```bash
whisper /path/audio.mp3 --model medium --output_format txt --output_dir .
whisper /path/audio.m4a --task translate --output_format srt
```

Notes:
- Models download to `~/.cache/whisper` on first run
- `--model` defaults to `turbo` on this install
- Use smaller models for speed, larger for accuracy
- Available models: tiny, base, small, medium, large, turbo

## Configuration

Control local vs API priority in your Clawdbot config:

```json
{
  "tools": {
    "media": {
      "audio": {
        "preferLocal": true
      }
    }
  }
}
```

- `preferLocal: true` (default): Check local tools before API providers
- `preferLocal: false`: Check API providers before local tools

When no local tools are available, Clawdbot automatically falls back to API providers (OpenAI, Groq, Deepgram, Google).
