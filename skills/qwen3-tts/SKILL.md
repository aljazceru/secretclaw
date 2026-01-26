---
name: qwen3-tts
description: Self-hosted neural text-to-speech with Qwen3-TTS (no API key).
homepage: https://github.com/QwenLM/Qwen3-TTS
metadata: {"clawdbot":{"emoji":"🎤","requires":{"bins":["qwen-tts-demo"],"python":true},"install":[{"id":"pip","kind":"pip","package":"qwen-tts","bins":["qwen-tts-demo"],"label":"Install Qwen3-TTS (pip)"}]}}
---

# Qwen3-TTS

Use `qwen-tts-demo` to generate high-quality speech locally without requiring API keys.

Qwen3-TTS is an open-source neural TTS system developed by the Qwen team at Alibaba Cloud, supporting stable, expressive, and streaming speech generation with custom voices and voice cloning.

## Installation

```bash
pip install qwen-tts
```

Or with uv:
```bash
uv pip install qwen-tts
```

## Quick Start

Start the Gradio demo server:
```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice --ip 0.0.0.0 --port 8000
```

The server will start on `http://localhost:8000` and automatically download the model on first run.

## Available Voices

Qwen3-TTS includes 9 premium predefined voices:

- **Vivian** (Default): Clear, professional female voice
- **Serena**: Warm, friendly female voice
- **Uncle_Fu**: Mature, authoritative male voice
- **Dylan**: Young, energetic male voice
- **Eric**: Professional male voice
- **Ryan**: Casual male voice
- **Aiden**: Friendly male voice
- **Ono_Anna**: Japanese-accented female voice
- **Sohee**: Korean-accented female voice

## Supported Languages

- Auto (automatic language detection)
- Chinese
- English
- Japanese
- Korean
- German
- French
- Russian
- Portuguese
- Spanish
- Italian

## Configuration

Configure Qwen3-TTS in your Clawdbot config:

```json
{
  "messages": {
    "tts": {
      "provider": "qwen3",
      "qwen3": {
        "enabled": true,
        "baseUrl": "http://localhost:8000",
        "model": "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
        "voice": "Vivian",
        "language": "Auto",
        "instruct": ""
      }
    }
  }
}
```

### Configuration Options

- **enabled**: Enable or disable Qwen3-TTS (default: `true`)
- **baseUrl**: Server URL (default: `"http://localhost:8000"`)
- **model**: Model identifier (default: `"Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"`)
- **voice**: Speaker name (default: `"Vivian"`)
- **language**: Language selection (default: `"Auto"`)
- **instruct**: Optional emotion/tone instructions (e.g., "speak with excitement")

## Available Models

- **Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice**: 1.7B parameter model (recommended)
- **Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice**: 0.6B parameter model (faster, lower quality)
- **Qwen/Qwen3-TTS-25Hz-1.7B-Base**: 25Hz model for voice cloning
- **Qwen/Qwen3-TTS-25Hz-0.6B-Base**: 25Hz 0.6B model for voice cloning

## Advanced Usage

### Emotion and Tone Control

Use the `instruct` field to control speech characteristics:

```json
{
  "qwen3": {
    "instruct": "speak with a calm and soothing tone"
  }
}
```

### Custom Server Port

Run the server on a different port:
```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice --ip 0.0.0.0 --port 9000
```

Then update your config:
```json
{
  "qwen3": {
    "baseUrl": "http://localhost:9000"
  }
}
```

## Provider Fallback

Qwen3-TTS is the default TTS provider when enabled. If it fails or is unavailable, Clawdbot automatically falls back to:

1. **ElevenLabs** (if API key configured)
2. **OpenAI TTS** (if API key configured)
3. **Microsoft Edge TTS** (always available, no API key required)

## Notes

- First run downloads the model (~3GB for 1.7B, ~1GB for 0.6B)
- Models are cached in `~/.cache/huggingface/hub`
- GPU acceleration supported (requires CUDA/Metal)
- Server must be running for Clawdbot to use Qwen3-TTS
- Output format: WAV (16-bit PCM)
- Sample rates: 12kHz or 25kHz depending on model

## Troubleshooting

**Server not responding**:
```bash
# Check if server is running
curl http://localhost:8000/api/info

# Restart server
pkill -f qwen-tts-demo
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice --ip 0.0.0.0 --port 8000
```

**Model download issues**:
```bash
# Pre-download models
huggingface-cli download Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice
```

**Memory issues**:
Use the smaller 0.6B model:
```json
{
  "qwen3": {
    "model": "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice"
  }
}
```
