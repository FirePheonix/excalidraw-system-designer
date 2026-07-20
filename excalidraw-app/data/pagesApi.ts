import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import { isInitializedImageElement } from "@excalidraw/element";
import type { FileId, OrderedExcalidrawElement } from "@excalidraw/element/types";

import { getSessionToken } from "../auth/clerk";

export type StoredScene = {
  elements: readonly OrderedExcalidrawElement[];
  appState: Partial<AppState>;
  files: Record<FileId, BinaryFileData>;
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

const S3_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const uploadedFileUrlCache = new Map<string, string>();

const isDataUrl = (value: string) => value.startsWith("data:");

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const authedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const token = await getSessionToken();
  if (!token) {
    throw new Error("You must sign in before saving pages");
  }

  const headers = new Headers(init?.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, { ...init, headers });
};

const assertResponse = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Server request failed");
  }
};

export const listServerPages = async (limit = 50) => {
  const response = await authedFetch(`/api/pages?limit=${limit}`);
  await assertResponse(response);
  const json = (await response.json()) as { pages: ServerPageSummary[] };
  return json.pages;
};

export const createServerPage = async (title: string) => {
  const response = await authedFetch("/api/pages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  await assertResponse(response);
  const json = (await response.json()) as { page: ServerPageSummary };
  return json.page;
};

export const getServerPage = async (id: string) => {
  const response = await authedFetch(`/api/pages/${id}`);
  await assertResponse(response);
  const json = (await response.json()) as { page: ServerPage };

  if (json.page.scene_json?.files) {
    json.page.scene_json.files = await rehydrateFilesForEditor(
      json.page.scene_json.files,
    );
  }

  return json.page;
};

export const saveServerPage = async (params: {
  id: string;
  title: string;
  scene: StoredScene;
}) => {
  const response = await authedFetch(`/api/pages/${params.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  await assertResponse(response);
  const json = (await response.json()) as { page: ServerPageSummary };
  return json.page;
};

export const deleteServerPage = async (id: string) => {
  const response = await authedFetch(`/api/pages/${id}`, {
    method: "DELETE",
  });
  await assertResponse(response);
};

const uploadFileToS3 = async (file: BinaryFileData) => {
  const fileVersion = file.version ?? 1;
  const cacheKey = `${file.id}:${fileVersion}`;
  const cachedUrl = uploadedFileUrlCache.get(cacheKey);
  if (cachedUrl) {
    return cachedUrl;
  }

  const imageBlob = await fetch(file.dataURL).then((response) => response.blob());

  if (imageBlob.size > S3_UPLOAD_MAX_BYTES) {
    throw new Error("Image too large to upload");
  }

  const presignResponse = await authedFetch("/api/s3/presign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: `${file.id}`,
      contentType: file.mimeType || imageBlob.type || "image/png",
      contentLength: imageBlob.size,
    }),
  });
  await assertResponse(presignResponse);

  const { uploadUrl, publicUrl } = (await presignResponse.json()) as {
    uploadUrl: string;
    publicUrl: string;
  };

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.mimeType || imageBlob.type || "image/png",
      "x-amz-acl": "public-read",
    },
    body: imageBlob,
  });
  await assertResponse(uploadResponse);

  uploadedFileUrlCache.set(cacheKey, publicUrl);
  return publicUrl;
};

const rehydrateFilesForEditor = async (
  storedFiles: Record<FileId, BinaryFileData>,
) => {
  const hydratedEntries = await Promise.all(
    Object.entries(storedFiles).map(async ([fileId, file]) => {
      if (!file?.dataURL || isDataUrl(file.dataURL)) {
        return [fileId, file] as const;
      }

      try {
        const response = await fetch(file.dataURL);
        await assertResponse(response);
        const blob = await response.blob();
        const dataURL = await blobToDataUrl(blob);
        return [fileId, { ...file, dataURL: dataURL as BinaryFileData["dataURL"] }] as const;
      } catch (error) {
        console.error("Failed to load image from URL:", file.dataURL, error);
        return [fileId, file] as const;
      }
    }),
  );

  return Object.fromEntries(hydratedEntries) as Record<FileId, BinaryFileData>;
};

export const captureScene = async (
  excalidrawAPI: ExcalidrawImperativeAPI,
): Promise<StoredScene> => {
  // collaborators is a Map and cannot be safely round-tripped through JSON.
  const { collaborators: _collaborators, ...serializableAppState } =
    excalidrawAPI.getAppState();
  const allFiles = excalidrawAPI.getFiles();

  const referencedFileIds = new Set<FileId>();
  for (const element of excalidrawAPI.getSceneElementsIncludingDeleted()) {
    if (!element.isDeleted && isInitializedImageElement(element)) {
      referencedFileIds.add(element.fileId);
    }
  }

  const storedFiles: Record<FileId, BinaryFileData> = {};

  for (const fileId of referencedFileIds) {
    const file = allFiles[fileId];
    if (!file) {
      continue;
    }

    if (!isDataUrl(file.dataURL)) {
      storedFiles[fileId] = file;
      continue;
    }

    const publicUrl = await uploadFileToS3(file);
    storedFiles[fileId] = {
      ...file,
      dataURL: publicUrl as BinaryFileData["dataURL"],
    };
  }

  return {
    elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
    appState: serializableAppState,
    files: storedFiles,
  };
};
