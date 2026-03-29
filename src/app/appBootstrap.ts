import { PlayerProfile, normalizePlayerName } from "../types/game";

export type DevSceneMode = "layout-editor" | "layout-preview" | "content-inspector" | "content-editor" | null;

export const PLAYER_PROFILE_STORAGE_KEY = "syllable-battle:player-profile";

export function resolveDevSceneMode(search: string): DevSceneMode {
  const params = new URLSearchParams(search);
  if (params.get("battle-layout-editor") === "1") return "layout-editor";
  if (params.get("battle-layout-preview") === "1") return "layout-preview";
  if (params.get("content-inspector") === "1") return "content-inspector";
  if (params.get("content-editor") === "1") return "content-editor";
  return null;
}

export function loadStoredPlayerProfile(storage?: Pick<Storage, "getItem"> | null) {
  if (!storage) return null;

  try {
    const raw = storage.getItem(PLAYER_PROFILE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PlayerProfile;
    if (!parsed?.name || !parsed?.avatar) return null;

    return {
      name: normalizePlayerName(parsed.name),
      avatar: parsed.avatar,
    } satisfies PlayerProfile;
  } catch {
    return null;
  }
}

export function persistPlayerProfile(
  storage: Pick<Storage, "setItem"> | null | undefined,
  profile: PlayerProfile,
) {
  if (!storage) return;
  storage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}
