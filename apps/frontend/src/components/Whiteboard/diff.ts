import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types"
import { moveArrayItem } from "@ide/ts-utils/src/lib/utils"
import { WhiteboardProps } from "./Whiteboard"
import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';
import { getSortedArray } from "./utils";
import { Map as YMap } from 'yjs'


export type UpdateOperation = { type: 'update', index: number, id: string, element: ExcalidrawElement }
export type AppendOperation = { type: 'append', id: string, element: ExcalidrawElement }
export type DeleteOperation = { type: 'delete', index: number, id: string, element: ExcalidrawElement }
export type MoveOperation = { type: 'move', fromIndex: number, toIndex: number, id: string, element: ExcalidrawElement }
export type BulkAppendOperation = { type: 'bulkAppend', data: { id: string, element: ExcalidrawElement }[] }
export type BulkDeleteOperation = { type: 'bulkDelete', index: number, id: string, data: { id: string, element: ExcalidrawElement }[] }

export type Operation = UpdateOperation | AppendOperation | DeleteOperation | MoveOperation | BulkAppendOperation | BulkDeleteOperation

type OperationTracker = { elementIds: string[], idMap: { [id: string]: { element: ExcalidrawElement, index: number } } }


export const getDeltaOperationsForYjs = (oldElements: readonly ExcalidrawElement[], newElements: readonly ExcalidrawElement[], bulkify = true) => {
  // Final operations are always in this order -> All updates + All appends + All deletes + All moves
  const updateOperations: UpdateOperation[] = []
  const appendOperations: AppendOperation[] = []
  const deleteOperations: DeleteOperation[] = []
  const moveOperations: MoveOperation[] = []

  // Updates the old elements as and when an operation is performed on it
  const opsTracker: OperationTracker = {
    elementIds: oldElements.map((x) => x.id),
    // id map is needed to quickly look up index for the element with a given id
    idMap: oldElements.reduce((map, element, index) => {
      map[element.id] = { element, index }
      return map
    }, {})
  }

  const _updateIdIndexLookup = () => {
    opsTracker.idMap = opsTracker.elementIds.reduce((map, id, index) => {
      map[id] = { element: opsTracker.idMap[id].element, index }
      return map
    }, {})
  }

  for (let newElement of newElements) {
    // Ignoring isDeleted behaviour and calculating append and update
    const { element: oldElement, index: oldIndex } = opsTracker.idMap[newElement.id] || {}
    if (!oldElement) {
      // Always add at the end
      opsTracker.elementIds.push(newElement.id)
      opsTracker.idMap[newElement.id] = { element: newElement, index: opsTracker.elementIds.length - 1 }
      appendOperations.push({ type: 'append', id: newElement.id, element: newElement })
    }
    else if (oldElement && newElement.version !== oldElement.version) {
      opsTracker.idMap[newElement.id].element = newElement
      updateOperations.push({ type: 'update', index: oldIndex, id: newElement.id, element: newElement })
    }
  }

  // Form delete operations
  // We are deleting from left to right
  const newElementIds = new Set(newElements.map((x) => x.id))
  const newOpsTrackerElementIds = []
  let runningIndex = 0
  for (let i = 0; i < opsTracker.elementIds.length; i++) {
    const id = opsTracker.elementIds[i]
    const element = opsTracker.idMap[id].element
    const toDelete = !newElementIds.has(id) || element.isDeleted
    if (toDelete) {
      deleteOperations.push({ type: 'delete', index: runningIndex, id, element })
    }
    else {
      newOpsTrackerElementIds.push(id)
      runningIndex += 1
    }
  }
  // Update ops tracker
  opsTracker.elementIds = newOpsTrackerElementIds
  _updateIdIndexLookup()

  // Find move operations
  newElements = newElements.filter((x) => !x.isDeleted)
  for (let newIndex = 0; newIndex < newElements.length; newIndex++) {
    const id = newElements[newIndex].id
    const { element, index: oldIndex } = opsTracker.idMap[id]

    if (newIndex !== oldIndex) {
      // move to correct position, O(n)
      opsTracker.elementIds = moveArrayItem(opsTracker.elementIds, oldIndex, newIndex, true)
      _updateIdIndexLookup()
      moveOperations.push({ type: 'move', fromIndex: oldIndex, toIndex: newIndex, id: element.id, element: element })
    }
  }

  const bulkAppendOperations: BulkAppendOperation[] = []
  const bulkDeleteOperations: BulkDeleteOperation[] = []
  if (bulkify) {
    // Merge append operations
    if (appendOperations.length > 0) {
      bulkAppendOperations.push({
        type: 'bulkAppend',
        data: appendOperations.map((op) => ({ id: op.id, element: op.element }))
      })
    }

    // Merge continuos delete operations
    // deleteOperations is already sorted i.e items are deleted from left to right
    let lastIndex = null
    for (let op of deleteOperations) {
      if (lastIndex === null || op.index > lastIndex) {
        bulkDeleteOperations.push({
          type: 'bulkDelete',
          index: op.index,
          id: op.id,
          data: [{ id: op.id, element: op.element }]
        })
        lastIndex = op.index
      }
      else {
        bulkDeleteOperations[bulkDeleteOperations.length - 1].data.push({ id: op.id, element: op.element })
      }
    }
  }

  const operations: Operation[] = !bulkify ?
    [...updateOperations, ...appendOperations, ...deleteOperations, ...moveOperations] :
    [...updateOperations, ...bulkAppendOperations, ...bulkDeleteOperations, ...moveOperations]
  return operations;
}


export const applyOperations = (yArray: WhiteboardProps["yWhiteboard"], operations: Operation[], origin: string) => {
  // NOTE: yArray doesn't support a move operation (that is reordering elements within an array).
  // So to re-order the only way is to delete the element and insert it at the desired location
  // But that can lead to duplocation in some cases (when 1 person updates the same element and other reorders it)
  // So in order to avoid those cases, for sort order we are creating a new variable called pos which stores the fractoral index
  // We depend on that rather than the elements position in the array to get its correct ordering
  // See the post to understand more -> https://discuss.yjs.dev/t/moving-elements-in-lists/92/15
  // See this to understand more about fratcoral indexing -> https://observablehq.com/@dgreensp/implementing-fractional-indexing

  // Also we could have used yMap at top level rather than yArray
  // But yMaps at top level are not very efficient (memory wise). See this comment for more info -> https://discuss.yjs.dev/t/moving-elements-in-lists/92/23

  const findIndex = (id: string): number => {
    for (let i = 0; i < yArray.length; i++) {
      let item = yArray.get(i).get("el") as ExcalidrawElement
      if (item.id === id) {
        return i
      }
    }
    return -1
  }

  yArray.doc!.transact(tr => {
    for (let op of operations) {
      switch (op.type) {
        case "update": {
          yArray.get(findIndex(op.id)).set("el", op.element)
          break
        }
        case "append":
        case "bulkAppend": {
          // All appends go to end of the sorted array, so left = last element, right = null
          const currentLargestSortIndex = yArray.length === 0 ? null : getSortedArray(yArray.toArray())[yArray.length - 1].get("pos") as string

          if (op.type === "append") {
            const sortIndex = generateKeyBetween(currentLargestSortIndex, null)
            yArray.push([new YMap<ExcalidrawElement | string>(Object.entries({ pos: sortIndex, el: op.element }))])
          }
          else {
            const sortIndexes = generateNKeysBetween(currentLargestSortIndex, null, op.data.length)
            yArray.push(
              op.data.map((x, i) => new YMap<ExcalidrawElement>(Object.entries({ pos: sortIndexes[i], el: x.element })))
            )
          }
          break
        }
        case "delete":
        case "bulkDelete": {
          if (op.type === "delete") {
            yArray.delete(findIndex(op.id), 1)
          }
          else {
            yArray.delete(findIndex(op.id), op.data.length)
          }
          break
        }
        case "move": {
          // The move code was inspired by this comment -> https://discuss.yjs.dev/t/moving-elements-in-lists/92/15
          const sortedArray = getSortedArray(yArray.toArray());
          const fromIndex = op.fromIndex
          const toIndex = op.toIndex

          let left: YMap<ExcalidrawElement | string> | null;
          let right: YMap<ExcalidrawElement | string> | null;
          if (fromIndex >= 0 && fromIndex < toIndex) {
            // we're moving an item down in the list
            left = sortedArray[toIndex] || null;
            right = sortedArray[toIndex + 1] || null;
          } else {
            // we are moving up in list
            left = sortedArray[toIndex - 1] || null;
            right = sortedArray[toIndex] || null;
          }

          const leftSortIndex = left?.get("pos") as string
          const rightSortIndex = right?.get("pos") as string

          const newSortIndex = generateKeyBetween(leftSortIndex, rightSortIndex)

          // Update sort index
          yArray.get(findIndex(op.id)).set("pos", newSortIndex)
          break
        }
      }
    }
  }, origin)
}