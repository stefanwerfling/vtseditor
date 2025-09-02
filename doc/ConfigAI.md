# ⚙️ Configuring AI Providers in VTS Editor

The **VTS Editor** can connect to different AI providers to help you generate or refine your schemas 🚀.  
Currently supported providers are:

- **Gemini (Google AI Studio)**
- **LocalAI (self-hosted)**
- **OpenAI**

---

## 1. `vtseditor.json` Configuration

The file `vtseditor.json` defines which AI providers are available to the editor.  
Each provider is listed inside the `providers` array.

### Example

```json
{
  "editor": {
    "providers": [
      {
        "apiProvider": "gemini",
        "apiKey": "$GEMINI_API_KEY",
        "apiUrl": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
      },
      {
        "apiProvider": "localai",
        "apiKey": "",
        "apiUrl": "https://a.server.org/",
        "model": "deepseek-r1-distill-qwen-7b"
      },
      {
        "apiProvider": "openai",
        "apiKey": "$OPENAI_API_KEY",
        "apiUrl": "https://api.openai.com/v1/chat/completions",
        "model": "gpt-4o-mini"
      }
    ]
  },
  "projects": [
    {
      "name": "MyProject",
      "schemaPath": "./schemas/schema.json",
      "code": {
        "schemaPrefix": "Schema",
        "createTypes": true,
        "createIndex": false,
        "codeComment": true,
        "codeIndent": "    "
      },
      "autoGenerate": false,
      "destinationPath": "./schemas/src",
      "destinationClear": false
    }
  ],
  "server": {
    "port": 5173
  },
  "browser": {
    "open": true
  }
}
```

### Field Explanations

- **`apiProvider`** → Select which provider to use (`gemini`, `openai`, `localai`).
- **`apiKey`** → The API key used for authentication.  
  You can use environment variables (recommended) like `$GEMINI_API_KEY`.
- **`apiUrl`** → The endpoint of the provider’s API.
- **`model`** → (Optional) The model name, required for some providers like **LocalAI** or **OpenAI**.

---

## 2. `.env` File for Secrets

Instead of placing your API keys directly inside `vtseditor.json`,  
store them securely in an `.env` file:

```dotenv
GEMINI_API_KEY=your_google_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

When you use `$GEMINI_API_KEY` or `$OPENAI_API_KEY` in the config, the values will be loaded from this file.

---

## 3. Getting API Keys

### Gemini (Google AI Studio)
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Navigate to **Get API Key**.
4. Copy the key and paste it into your `.env` file as `GEMINI_API_KEY`.

### OpenAI
1. Go to [OpenAI API Keys](https://platform.openai.com/account/api-keys).
2. Create a new secret key.
3. Store it in your `.env` file as `OPENAI_API_KEY`.

### LocalAI
LocalAI is self-hosted. You don’t need an API key by default.  
Just set the `apiUrl` to your LocalAI server and specify the `model`.

Read more on [LocalAI](https://localai.io/)

---

## 4. Example with OpenAI

Here is how an OpenAI provider can be defined in `vtseditor.json`:

```json
{
  "apiProvider": "openai",
  "apiKey": "$OPENAI_API_KEY",
  "apiUrl": "https://api.openai.com/v1/chat/completions",
  "model": "gpt-4o-mini"
}
```

---

## 🧠 AI Schema Help

If you sometimes have to think for a long time and don't know which fields are right for your new schema,  
let the AI help you 🚀.

You can:

- Quickly generate draft schemas
- Ask AI to add missing fields
- Refine your schema with contextual hints