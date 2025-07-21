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

export interface OnboardingPrimaryUserDetails {
  name: string;
  age: number;
  gender: "male" | "female";
  allergies: string[];
  medications: string[];
}

export interface OnboardingDependentUserDetails
  extends OnboardingPrimaryUserDetails {
  relationship: string;
}

export interface OnboardingLocation {
  latitude: number;
  longitude: number;
}

export interface OnboardingData {
  primaryUserDetails: OnboardingPrimaryUserDetails;
  dependentUserDetails: OnboardingDependentUserDetails[];
  location: OnboardingLocation;
  selectedDisasters: string[];
}