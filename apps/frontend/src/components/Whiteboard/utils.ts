import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { Map as YMap } from "yjs"
import { WhiteboardProps } from "./Whiteboard";


export const getSortedArray = (array: YMap<ExcalidrawElement | string>[], inPlace = true): YMap<ExcalidrawElement | string>[] => {
  if (!inPlace) {
    array = [...array]
  }

  return array
    .sort((a, b) => {
      const key1 = a.get("pos") as string;
      const key2 = b.get("pos") as string;
      return key1 > key2 ? 1 : (key1 < key2 ? -1 : 0)
    })
}

export const yjsToExcalidraw = (yArray: WhiteboardProps["yWhiteboard"]): ExcalidrawElement[] => {
  let x = getSortedArray(yArray.toArray())
    .map((x) => (x.get("el") as ExcalidrawElement))
  return x
}