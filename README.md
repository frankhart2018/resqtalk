# 🚨 ResQTalk

**ResQTalk** is an intelligent disaster-assistance agentic platform designed to empower individuals and families before, during, and after emergencies such as floods, earthquakes, or tornadoes. It delivers multilingual 🌐, personalized guidance and resource coordination, even when internet connectivity is limited or a device is offline, ensuring actionable support is always available in crisis scenarios. The platform is driven by Google’s Gemma-3n AI 🤖, integrating real-time emergency advice, proactive checklists, and critical offline tools for maximum resilience and accessibility.

---

## ✨ Features

- 📝 **Personalized Onboarding:** Securely collect and store user and family profiles, including location, health, and risk specifics.
- 💬 **Gemma-3n Powered Chat Agent:** Proactively guide users with context-aware, empathetic advice in their preferred language.
- 🖥️ **Disaster Phase Dashboard:** Unified interface for pre- and post-disaster actions, tailored checklists, and instant access to critical resources.
- 🗺️ **Offline Map Support:** Locally cached OpenStreetMap tiles for reliable navigation—even without internet.
- ✔️ **Dynamic Preparedness Checklists:** Automated, scenario-based preparation and recovery tasks, always kept up-to-date.
- 🚨 **SOS Emergency Tools:** One-tap strobe light, siren, and direct agent controls for immediate help or signaling.
- 🌩️ **Live Alerts (Online):** Real-time local updates via National Weather Service integration (when connected).
- 🧠 **Agent Memory & Logs:** Automated, structured capture of critical event logs and context to support seamless user guidance.

---

## 🤖 Gemma-3n Usage

ResQTalk leverages **Gemma-3n** to deliver both a proactive Communication Agent (guiding and supporting the user) and a Memory Agent (extracting and persisting key situational/context data as JSON). Gemma-3n powers multilingual and multimodal (text/voice) user interactions, dynamically builds preparation and recovery checklists, and proactively suggests critical next steps in real time—providing highly contextual support focused on maximizing user safety, even when connectivity is unreliable.

## 🛠️ Pre-requisites

- 🐋 [Ollama](https://ollama.com) is installed and has [`gemma3n:latest`](https://ollama.com/library/gemma3n) pulled.

---

## 🚀 Steps to Run

1. **Run the frontend:**

```
cd frontend && npm run dev
```

2. **Start MongoDB & redis servers:**

```
docker-compose up -d mongo redis
```

2.1: (_Optional_) If you want tracing, also start Langfuse server:

```
docker-compsoe up -d langfuse-web langfuse-worker
```

3. **Run the backend:**

```
cd backend && uv run app.py
```
---

## ⚙️ Environment Variables

### 🌐 Frontend


```
VITE_API_BASE=<URL-TO-BACKEND-SERVER-WITH-PORT>
VITE_OSM_SERVER=<URL-TO-BACKEND-SERVER-WITH-PORT>/map
```

**Example**

```
VITE_API_BASE=http://localhost:8000
VITE_OSM_SERVER=http://localhost:8000/map
```

**Notes**

- The `VITE_API_BASE` and `VITE_OSM_SERVER` should have the same base URL, this ensures the maps rendered are fetched from local cache, if you don't want that feel free to replace the entire URL. If you're using a different server needs to be in a format: `<BASE-URL>/{z}/{x}/{y}.png` as the frontend makes request to this for fetching individual tiles. 

### 🖥️ Backend

```
LANGFUSE_SECRET_KEY=<SECRET-KEY>
LANGFUSE_PUBLIC_KEY=<PUBLIC-KEY>
LANGFUSE_HOST=<URL-TO-LANGFUSE-SERVER-WITH-PORT>
LANGFUSE_TRACING_ENABLED=<true|false>
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=<URL-TO-LANGFUSE-SERVER-WITH-PORT>
GOD_MODE=<true|failse>
MAP_TILE_SERVER=<URL-TO-OPENSTREETMAP-TILE-SERVER>
```

**Example**

```
LANGFUSE_SECRET_KEY=<REDCATED>
LANGFUSE_PUBLIC_KEY=<REDACTED>
LANGFUSE_HOST=http://localhost:3000
LANGFUSE_TRACING_ENABLED=true
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:3000
GOD_MODE=false
MAP_TILE_SERVER=https://tile.openstreetmap.org
```

**Notes**

- If `LANGFUSE_TRACING_ENABLED` is set to false, then none of the `LANGFUSE_*` variables need to be set, neither does the `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` need to be set. For more details about generating secret/public keys in langfuse see [official docs](https://langfuse.com/faq/all/where-are-langfuse-api-keys).
- Setting `GOD_MODE` to true will display an icon in top-left in the frontend, which allows you to change system prompts, wipe user data, memories, etc. Basically enables a super-user mode. NOT RECOMMENDED if you are deploying to production.
- `MAP_TILE_SERVER` ideally should always be https://tile.openstreetmap.org, unless you host your own OSM (Open Street Map) tile server.

---

🌟 _Stay prepared. Stay safe. With ResQTalk._ 🚒🆘🌎