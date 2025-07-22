import { getPromptWithTools } from "../tools/tool-utils";
import type {
  GetCurrentModeResponse,
  GetCurrentPrivilegesResponse,
  GetDisastersResponse,
  GetMemoriesResponse,
  GetSystempPromptResponse,
  GetUserDetailsResponse,
  OnboardingData,
  VoiceModeResponse,
} from "./model";
import type { OptionalReadableBytesBuffer } from "./types";

const API_HOST =
  import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:8000`;

const getCfAuthHeaders = (): object => {
  return {
    "CF-Access-Client-Id": import.meta.env.VITE_CF_CLIENT_ID || "",
    "CF-Access-Client-Secret": import.meta.env.VITE_CF_CLIENT_SECRET || "",
  };
};

export const submitOnboarding = async (data: OnboardingData) => {
  const response = await fetch(`${API_HOST}/onboarding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getCfAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(`Onboarding failed: ${result.status}`);
  }

  return response.json();
};

export const getCurrentMode = async (): Promise<GetCurrentModeResponse> => {
  return fetch(`${API_HOST}/mode`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...getCfAuthHeaders(),
    },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
  });
};

export const getCurrentPrivileges =
  async (): Promise<GetCurrentPrivilegesResponse> => {
    return fetch(`${API_HOST}/privileges`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...getCfAuthHeaders(),
      },
    }).then((response) => {
      if (response.ok) {
        return response.json();
      }
    });
  };

export const getVoiceModeResponse = async (
  audioBlob: Blob
): Promise<VoiceModeResponse> => {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.wav");

  const response = await fetch(`${API_HOST}/generate/voice`, {
    method: "POST",
    body: formData,
    headers: {
      Accept: "application/json",
      ...getCfAuthHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const getTextModeResponse = async (
  prompt: string
): Promise<OptionalReadableBytesBuffer> => {
  const response = await fetch(`${API_HOST}/generate/text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...getCfAuthHeaders(),
    },
    body: JSON.stringify({
      frontendTools: getPromptWithTools(),
      prompt,
    }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.body?.getReader();
};

export const switchMode = (newMode: string) => {
  fetch(`${API_HOST}/mode/switch?mode=${newMode}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...getCfAuthHeaders(),
    },
  });
};

export const getSystemPrompt = async (
  key: string
): Promise<GetSystempPromptResponse> => {
  return fetch(`${API_HOST}/prompt?key=${key}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...getCfAuthHeaders(),
    },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
  });
};

export const setSystemPrompt = async (key: string, prompt: string) => {
  fetch(`${API_HOST}/prompt`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...getCfAuthHeaders(),
    },
    body: JSON.stringify({
      key,
      prompt,
    }),
  });
};

export const getMemories = async (): Promise<GetMemoriesResponse> => {
  return fetch(`${API_HOST}/memories`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...getCfAuthHeaders(),
    },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
  });
};

export const deleteUser = async () => {
  const response = await fetch(`${API_HOST}/user`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getCfAuthHeaders(),
    },
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(`User deletion failed: ${result.status}`);
  }

  return response.json();
};

export const getUserDetails = async (): Promise<GetUserDetailsResponse> => {
  return fetch(`${API_HOST}/user/details`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...getCfAuthHeaders(),
    },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  });
};

export const getDisasters = async (): Promise<GetDisastersResponse> => {
  return fetch(`${API_HOST}/disasters`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...getCfAuthHeaders(),
    },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  });
};
