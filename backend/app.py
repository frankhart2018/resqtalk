from contextlib import asynccontextmanager
import logging
import asyncio
from fastapi import FastAPI, HTTPException, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from fastapi.responses import StreamingResponse
from enum import Enum
import gc
import uuid
from pathlib import Path
from dotenv import load_dotenv
import os


load_dotenv()

from service.agents import (
    CommunicationAgent,
    MemoryAgent,
    VoiceCommunicationAgent,
    VoiceMemoryAgent,
)
from service.data_models.generate_text import PromptRequest
from service.data_models.set_prompt import SetPromptRequest
from service.data_models.onboarding import (
    OnboardingRequest,
    OnboardingResponse,
    Disaster,
    Phase,
)
from service.data_models.disaster_context import DisasterContextRequest
from service.utils.constants import (
    COMM_AGENT_SYS_PROMPT_KEY,
    MEMORY_AGENT_SYS_PROMPT_KEY,
    CACHED_MAP_RADIUS,
    CACHED_MAP_MIN_ZOOM_LEVEL,
    CACHED_MAP_MAX_ZOOM_LEVEL,
    WAIT_BETWEEN_RETRIES,
)
from service.utils.prompt_store import SystemPromptStore
from service.utils.user_info_store import UserInfoStore
from service.utils.memory_store import MemoryStore
from service.utils.checklist_store import ChecklistStore
from service.utils.nws_api import NWSApiFacade
from service.utils.map_store import MapStore
from service.utils.map_downloader import MapDownloader
from service.agents.checklist_agent import ChecklistBuilderAgent


logging.basicConfig(level=logging.DEBUG)
otlp_exporter_logger = logging.getLogger(
    "opentelemetry.exporter.otlp.proto.http.trace_exporter"
)
otlp_exporter_logger.addHandler(logging.NullHandler())
otlp_exporter_logger.propagate = False
logger = logging.getLogger(__name__)


class Mode(Enum):
    TEXT = "text"
    VOICE = "voice"


memory_agent: Optional[MemoryAgent] = None
memory_queue: Optional[asyncio.Queue] = None
comm_agent: Optional[CommunicationAgent] = None
voice_agent: Optional[VoiceCommunicationAgent] = None
voice_memory_agent: Optional[VoiceMemoryAgent] = None
onboarding_task: Optional[asyncio.Task] = None
current_mode: Mode = Mode.TEXT
disaster_context: Optional[DisasterContextRequest] = None


async def memory_processor():
    global memory_queue, memory_agent, voice_memory_agent

    while True:
        try:
            user_message = await memory_queue.get()

            if current_mode == Mode.TEXT:
                asyncio.create_task(memory_agent.store_memory(user_message))
            else:
                asyncio.create_task(voice_memory_agent.store_memory(user_message))
            memory_queue.task_done()
        except asyncio.CancelledError:
            logging.error("Memory processor cancelled")
            break
        except Exception as e:
            logging.error(f"Error in memory processor: {e}")


async def map_downloader(lat: float, lon: float):
    while True:
        map_downloader = MapDownloader()
        result = await map_downloader.download_area(
            center_lat=lat,
            center_lon=lon,
            radius_miles=CACHED_MAP_RADIUS,
            min_zoom=CACHED_MAP_MIN_ZOOM_LEVEL,
            max_zoom=CACHED_MAP_MAX_ZOOM_LEVEL,
        )

        if result:
            logger.info("Download complete, existing map downloader coroutine.")
            break
        else:
            logger.error(
                f"Failed to complete download, retring in {WAIT_BETWEEN_RETRIES} seconds!"
            )
            asyncio.sleep(WAIT_BETWEEN_RETRIES)


async def checklist_builder(user_details: OnboardingRequest):
    checklist_builder_agent = ChecklistBuilderAgent()
    disasters = user_details.selectedDisasters
    phases = ["pre", "post"]
    for disaster in disasters:
        for phase in phases:
            logging.info(
                f"Building checklist for disaster '{disaster}' and phase '{phase}'"
            )
            await checklist_builder_agent.build_checklist(
                user_details=user_details, phase=phase, disaster=disaster
            )


async def onboarding_tasks(onboarding_request: OnboardingRequest):
    await checklist_builder(onboarding_request)
    await map_downloader(
        lat=onboarding_request.location.latitude,
        lon=onboarding_request.location.longitude,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialization
    global memory_agent, memory_queue, comm_agent, voice_agent, voice_memory_agent
    memory_agent = MemoryAgent()
    comm_agent = CommunicationAgent()
    memory_queue = asyncio.Queue(maxsize=1000)

    memory_task = asyncio.create_task(memory_processor())

    is_god_mode = os.getenv("GOD_MODE") == "true"
    logger.info(
        f"API Server ready for requests, current processing mode: '{current_mode.name}', God Mode: {is_god_mode}"
    )

    try:
        map_store = MapStore()
        is_map_downloaded = map_store.is_download_complete()
        logger.info(f"Map download complete? {is_map_downloaded}")
        if not is_map_downloaded:
            logger.info("Restarting map download, as it is not complete.")
            lat, lon = map_store.get_cached_lat_lon()
            logger.info(f"Cached (lat, lon) = ({lat}, {lon})")
            if (lat is not None and lon is not None) and (lat != 0.0 and lon != 0.0):
                logger.info("Restart map downloader coroutine.")
                asyncio.create_task(map_downloader(lat, lon))
            else:
                logger.info("No cached lat lon, giving up.")
    except:
        logger.info("Map cache store not created yet.")

    yield

    if memory_task and not memory_task.done():
        memory_task.cancel()
        try:
            await memory_task
        except asyncio.CancelledError:
            pass

    if onboarding_task and not onboarding_task.done():
        onboarding_task.cancel()
        try:
            await onboarding_task
        except asyncio.CancelledError:
            pass

    # Clean up
    memory_agent = None
    memory_queue = None
    comm_agent = None
    voice_agent = None
    voice_memory_agent = None


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/generate/text")
async def generate_aprompt(request: PromptRequest):
    global current_mode

    if current_mode != Mode.TEXT:
        raise HTTPException(
            status_code=500,
            detail="Switch to text mode first using '/switch?mode='text''",
        )

    prompt_with_tools = f"{request.frontendTools}\n\n{request.prompt}"

    async def generate_chunks():
        full_response = []
        async for chunk in comm_agent.generate(prompt_with_tools):
            full_response.append(chunk)
            yield f"data: {chunk}\n\n"

        memory_queue.put_nowait(request.prompt)

    return StreamingResponse(generate_chunks(), media_type="text/event-stream")


@app.post("/generate/voice")
async def voice_stream(file: UploadFile = File(...), frontendTools: str = ""):
    if current_mode != Mode.VOICE:
        raise HTTPException(
            status_code=500,
            detail="Switch to voice mode first using '/switch?mode='voice''",
        )

    filename = Path(f"{uuid.uuid4()}.wav")
    contents = await file.read()
    with open(filename, "wb") as f:
        f.write(contents)

    output = voice_agent.generate(str(filename), frontendTools)
    logger.info(f"Output from model: {output}")

    memory_queue.put_nowait(str(filename))

    return {"response": output}


@app.post("/mode/switch")
async def switch_mode(mode: Mode):
    global current_mode
    global comm_agent, voice_agent
    global memory_agent, voice_memory_agent

    if mode == current_mode:
        logger.info(f"Nothing to switch, already in {mode.value}")
        return {"status": "ok"}

    logger.info(f"Switching from {current_mode.value} to {mode.value}")

    if mode == Mode.TEXT and current_mode == Mode.VOICE:
        logger.info("Off-loading voice agents, loading text agents")
        voice_agent = None
        voice_memory_agent = None
        gc.collect()

        comm_agent = CommunicationAgent()
        memory_agent = MemoryAgent()
        logger.info("Successfully loaded text agents")
    elif mode == Mode.VOICE and current_mode == Mode.TEXT:
        logger.info("Off-loading text agents, loading voice agents")
        comm_agent = None
        memory_agent = None
        gc.collect()

        voice_agent = VoiceCommunicationAgent()
        voice_memory_agent = VoiceMemoryAgent()
        logger.info("Successfully loaded voice agents")
    else:
        raise HTTPException(status_code=500, detail="Invalid state, restart server!")

    current_mode = mode

    return {"status": "ok"}


@app.get("/mode")
def get_mode():
    return {"mode": current_mode.value}


@app.get("/privileges")
def get_privileges():
    return {"isGodMode": os.getenv("GOD_MODE") == "true"}


def _check_god_mode():
    if os.getenv("GOD_MODE") != "true":
        raise HTTPException(
            status_code=400, detail="This operation is only allowed in God Mode."
        )


@app.get("/prompt")
def get_prompt(key: str):
    _check_god_mode()
    if key == COMM_AGENT_SYS_PROMPT_KEY:
        return {"prompt": SystemPromptStore().get_prompt(key=COMM_AGENT_SYS_PROMPT_KEY)}
    elif key == MEMORY_AGENT_SYS_PROMPT_KEY:
        return {
            "prompt": SystemPromptStore().get_prompt(key=MEMORY_AGENT_SYS_PROMPT_KEY)
        }
    else:
        raise HTTPException(status_code=400, detail=f"Invalid key: '{key}'")


@app.put("/prompt")
def set_prompt(request: SetPromptRequest):
    _check_god_mode()
    if request.key not in [COMM_AGENT_SYS_PROMPT_KEY, MEMORY_AGENT_SYS_PROMPT_KEY]:
        raise HTTPException(status_code=400, detail=f"Invalid key: '{request.key}'")

    SystemPromptStore().store_prompt(key=request.key, prompt=request.prompt)

    return {"status": "ok"}


@app.get("/memories")
def get_memories():
    _check_god_mode()
    return {"memories": MemoryStore().list_memory()}


@app.post("/onboarding")
async def onboard_device(onboarding_request: OnboardingRequest):
    user_info_store = UserInfoStore()
    if user_info_store.find_singular_user():
        return {"status": OnboardingResponse.ALREADY_REGISTERED}

    global onboarding_task
    user_info_store.onboard_user(onboarding_request)
    onboarding_task = asyncio.create_task(onboarding_tasks(onboarding_request))
    return {"status": OnboardingResponse.OK}


@app.delete("/user")
def delete_user():
    _check_god_mode()
    UserInfoStore().delete_user()
    MapStore(create_if_no_exists=True).delete_cache()
    ChecklistStore().delete_cache()
    return {"status": "ok"}


@app.get("/disasters")
def get_disasters():
    user_info_store = UserInfoStore()
    user_info = user_info_store.get_user_document()
    if not user_info:
        raise HTTPException(status_code=404, detail="User not onboarded yet.")
    return {"disasters": user_info["selectedDisasters"]}


@app.get("/user/details")
def get_user_details():
    _check_god_mode()
    user_info_store = UserInfoStore()
    user_info = user_info_store.get_user_document()
    if not user_info:
        raise HTTPException(status_code=404, detail="User not onboarded yet.")
    user_info["_id"] = str(user_info["_id"])
    return user_info


@app.post("/disaster-context")
def set_disaster_context(disaster_context_request: DisasterContextRequest):
    global disaster_context
    disaster_context = disaster_context_request
    logger.info(f"Disaster context set: {disaster_context}")
    return {"status": "ok"}


@app.get("/disaster-context")
def get_disaster_context():
    global disaster_context
    logger.info(f"Fetching disaster context: {disaster_context}")
    if not disaster_context:
        raise HTTPException(status_code=404, detail="Disaster context not set yet.")
    return disaster_context


@app.delete("/disaster-context")
def delete_disaster_context():
    logger.info("Deleting disaster context")
    global disaster_context
    disaster_context = None
    logger.info("Disaster context deleted")
    return {"status": "ok"}


@app.get("/active-alerts")
def get_active_alerts(latitude: float, longitude: float):
    nws_api = NWSApiFacade(latitude=latitude, longitude=longitude)
    return {"activeAlerts": nws_api.get_active_alerts()}


@app.get("/map/{z}/{x}/{y}.png")
def get_map_tiles(z: int, x: int, y: int):
    map_store = MapStore()
    tile_data = map_store.get_tile(x, y, z)
    if tile_data is None:
        logger.error("Tile not found")
        raise HTTPException(status_code=404, detail="Tile not found")
    return Response(tile_data, media_type="image/png")


@app.get("/map/download-status")
def get_map_download_status():
    try:
        map_store = MapStore()

        return {"downloadStatus": map_store.get_download_status()}
    except ValueError:
        return {"downloadStatus": 0}


@app.get("/checklists")
def get_checklist(disaster: Disaster, phase: Phase):
    checklist = ChecklistStore().get_checklist(disaster, phase)
    if checklist is None:
        return HTTPException(
            status_code=404,
            detail=f"No checklist for disaster: '{disaster.value}', phase: '{phase.value}'",
        )

    return {"checklist": checklist.get("checklist", [])}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, workers=1)
