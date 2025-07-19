export interface GetCurrentModeResponse {
  mode: string;
}

export interface GetCurrentPrivilegesResponse {
  isGodMode: boolean;
}

export interface VoiceModeResponse {
  response: string;
}

export interface GetSystempPromptResponse {
  prompt: string;
}

export interface GetMemoriesResponse {
  memories: Array<Array<Record<string, unknown>>>;
}
