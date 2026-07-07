import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { LibraryItems } from "@excalidraw/excalidraw/types";

const LIBRARY_INSTALL_STORAGE_KEY = "excalidraw-system-libraries-installed-v1";

const CURATED_LIBRARY_SOURCES = [
  "youritjang/software-architecture.excalidrawlib",
  "dmitry-burnyshev/c4-architecture.excalidrawlib",
  "dwelle/network-topology-icons.excalidrawlib",
  "childishgirl/aws-architecture-icons.excalidrawlib",
  "jordangeurtsen/uml-component-diagram.excalidrawlib",
];

const toLibraryUrl = (source: string) =>
  `https://raw.githubusercontent.com/excalidraw/excalidraw-libraries/master/libraries/${source}`;

const fetchLibraryItems = async (source: string) => {
  const response = await fetch(toLibraryUrl(source));
  if (!response.ok) {
    throw new Error(`Failed to fetch library: ${source}`);
  }
  const json = (await response.json()) as { libraryItems?: LibraryItems };
  return json.libraryItems ?? [];
};

export const installCuratedSystemLibraries = async (
  excalidrawAPI: ExcalidrawImperativeAPI,
) => {
  const libraries = await Promise.all(
    CURATED_LIBRARY_SOURCES.map((source) => fetchLibraryItems(source)),
  );
  const libraryItems = libraries.flat();
  excalidrawAPI.updateLibrary({
    libraryItems,
    merge: true,
    openLibraryMenu: true,
  });
  window.localStorage.setItem(LIBRARY_INSTALL_STORAGE_KEY, "true");
  return libraryItems.length;
};

export const hasInstalledCuratedSystemLibraries = () => {
  return window.localStorage.getItem(LIBRARY_INSTALL_STORAGE_KEY) === "true";
};
