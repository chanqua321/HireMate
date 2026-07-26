# AI (Ollama / OpenAI / Heuristic)

HireMate gọi API **OpenAI-compatible** `POST {BaseUrl}/chat/completions`. Offline → **heuristic**.

## Local Ollama

```json
"Ai": {
  "Enabled": true,
  "Provider": "Ollama",
  "BaseUrl": "http://localhost:11434/v1",
  "Model": "llama3.2",
  "ApiKey": "",
  "TimeoutSeconds": 60
}
```

```bash
ollama serve
ollama pull llama3.2
```

## OpenAI (hoặc Groq / gateway tương thích)

```json
"Ai": {
  "Enabled": true,
  "Provider": "OpenAI",
  "BaseUrl": "https://api.openai.com/v1",
  "Model": "gpt-4o-mini",
  "ApiKey": "sk-...",
  "TimeoutSeconds": 60
}
```

```powershell
dotnet user-secrets set "Ai:ApiKey" "sk-..." --project APIs
```

## Gemini (Google AI)

```json
"Ai": {
  "Enabled": true,
  "Provider": "Gemini",
  "BaseUrl": "https://generativelanguage.googleapis.com/v1beta",
  "Model": "gemini-3-flash-preview",
  "ApiKey": "",
  "TimeoutSeconds": 120
}
```

```powershell
dotnet user-secrets set "Ai:ApiKey" "YOUR_KEY" --project APIs
```

Không commit ApiKey vào git. Embedding model chưa dùng trong HireMate.

## Chỉ heuristic (deploy free không tốn token)

```json
"Ai": { "Enabled": true, "Provider": "Heuristic" }
```

hoặc `Enabled: false`.
