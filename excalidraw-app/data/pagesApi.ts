import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/element/types";

export type StoredScene = {
  elements: readonly OrderedExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
};

export type ServerPageSummary = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type ServerPage = ServerPageSummary & {
  scene_json: StoredScene;
};

const assertResponse = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Server request failed");
  }
};

export const listServerPages = async (limit = 50) => {
  const response = await fetch(`/api/pages?limit=${limit}`);
  await assertResponse(response);
  const json = (await response.json()) as { pages: ServerPageSummary[] };
  return json.pages;
};

export const createServerPage = async (title: string) => {
  const response = await fetch("/api/pages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  await assertResponse(response);
  const json = (await response.json()) as { page: ServerPageSummary };
  return json.page;
};

export const getServerPage = async (id: string) => {
  const response = await fetch(`/api/pages/${id}`);
  await assertResponse(response);
  const json = (await response.json()) as { page: ServerPage };
  return json.page;
};

export const saveServerPage = async (params: {
  id: string;
  title: string;
  scene: StoredScene;
}) => {
  const response = await fetch(`/api/pages/${params.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  await assertResponse(response);
  const json = (await response.json()) as { page: ServerPageSummary };
  return json.page;
};

export const captureScene = (
  excalidrawAPI: ExcalidrawImperativeAPI,
): StoredScene => {
  return {
    elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
    appState: excalidrawAPI.getAppState(),
    files: excalidrawAPI.getFiles(),
  };
};
