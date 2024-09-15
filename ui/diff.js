const moveArrayItem = (arr, from, to, inPlace=true) => {
  if (!inPlace) {
    arr = [...arr]
  }
  arr.splice(to, 0, arr.splice(from, 1)[0]);
  return arr
};


class ArrayOps {
  elements
  idMap

  constructor(elements) {
    this.elements = elements
    this.updateIdMap()
  }

  updateIdMap() {
    this.idMap = this.elements.reduce((map, element, index) => {
      map[element.id] = {element, index}
      return map
    }, {})
  }

  push(element) {
    this.elements.push(element)
    const newIndex = this.elements.length - 1
    this.idMap[element.id] = {element, index: newIndex}
    return newIndex
  }

  delete(element) {
    const {index} = this.idMap[element.id]
    this.elements.splice(index, 1)
    this.updateIdMap()
    return index
  }

  move(element, to) {
    const {index: from} = this.idMap[element.id]
    console.log(element.id, from, to)
    this.elements = moveArrayItem(this.elements, from, to, true)
    this.updateIdMap()
    console.log(this.elements)
    return to
  }
}



const diffForYjs = (oldElements, newElements) => {
  newElements = newElements.filter((x) => !x.isDeleted)
  oldElements = oldElements.filter((x) => !x.isDeleted)
  
  const updateOperations = []
  const insertOperations = []
  const deleteOperations = []
  const moveOperations = []

  const arrayOps = new ArrayOps(oldElements)
  const idsToDelete = new Map(arrayOps.elements.map((x) => [x.id, null]))  // using map and not set, as i need to preserve the order
  for (let newElement of newElements) {
    const {element: oldElement, index: oldIndex} = arrayOps.idMap[newElement.id] || {}
    if (!oldElement) {
      // Always add at the end
      const indexToInsert = arrayOps.push(newElement)
      insertOperations.push({type: 'insert', index: indexToInsert, id: newElement.id, element: newElement})
    }
    else if (oldElement && newElement.version !== oldElement.version) {
      updateOperations.push({type: 'update', index: oldIndex, id: newElement.id, element: newElement})
    }
    idsToDelete.delete(newElement.id)
  }
  for (let [id, _] of idsToDelete) {
    const element = arrayOps.idMap[id].element
    const index = arrayOps.delete(element)
    deleteOperations.push({type: 'delete', index: index, id, element })
  }

  // Find move operations
  for (let [newIndex, newElement] of newElements.entries()) {
    const {index: oldIndex, element: oldElement} = arrayOps.idMap[newElement.id]
    if (newIndex !== oldIndex) {
      // move to correct position
      arrayOps.move(oldElement, newIndex)
      moveOperations.push({type: 'move', fromIndex: oldIndex, toIndex: newIndex, id: newElement.id, element: newElement})
    }
  }

  // Merge continuos insert operations
  // insertOperations is already sorted
  const bulkInsertOperations = []
  let lastIndex = null
  for (let op of insertOperations) {
    if (lastIndex === null || op.index !== lastIndex) {
      bulkInsertOperations.push({
        type: 'bulkInsert',
        index: op.index,
        data: [{id: op.id, element: op.element}]
      })
      lastIndex = op.index + 1
    }
    else {
      bulkInsertOperations[0].data.push({id: op.id, element: op.element})
      lastIndex += 1
    }
  }

  // Merge continuos delete operations
  // deleteOperations is already sorted
  const bulkDeleteOperations = []
  lastIndex = null
  for (let op of deleteOperations) {
    if (lastIndex === null || op.index !== lastIndex) {
      bulkDeleteOperations.push({
        type: 'bulkDelete',
        index: op.index,
        data: [{id: op.id, element: op.element}]
      })
      lastIndex = op.index + 1
    }
    else {
      bulkDeleteOperations[0].data.push({id: op.id, element: op.element})
      lastIndex += 1
    }
  }

  const operations = updateOperations.concat(bulkInsertOperations).concat(bulkDeleteOperations).concat(moveOperations)
  // const operations = updateOperations.concat(insertOperations).concat(deleteOperations).concat(moveOperations)
  return operations;
}


let old = [
  {
      "id": "Fe6wy0pL8KLdgl0z9WLSC",
      "type": "freedraw",
      "x": 593.5999755859375,
      "y": 238.19999694824216,
      "width": 8.80002675781248,
      "height": 19.999899999999982,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#b2f2bb",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "roundness": null,
      "seed": 755337396,
      "version": 85,
      "versionNonce": 1852273972,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1725009666142,
      "link": null,
      "locked": false,
      "points": [
          [
              0,
              0
          ],
          [
              8.80002675781248,
              -19.999899999999982
          ]
      ],
      "pressures": [],
      "simulatePressure": true,
      "lastCommittedPoint": [
          0.0001,
          0.0001
      ]
  },
  {
      "id": "ApnkbTPqyBuuqME1Xc-S8",
      "type": "rectangle",
      "x": 430.4000244140625,
      "y": 122.20001983642578,
      "width": 234.4000244140625,
      "height": 163.19998931884766,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#b2f2bb",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "roundness": {
          "type": 3
      },
      "seed": 1578979084,
      "version": 102,
      "versionNonce": 279709196,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1725009648062,
      "link": null,
      "locked": false
  },
  {
      "id": "55qsJBDhzImqUE22Ca6Qa",
      "type": "freedraw",
      "x": 537.5999755859375,
      "y": 182.20001220703125,
      "width": 0.800048828125,
      "height": 0,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "roundness": null,
      "seed": 1808422196,
      "version": 5,
      "versionNonce": 2021897100,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1725009616927,
      "link": null,
      "locked": false,
      "points": [
          [
              0,
              0
          ],
          [
              0.800048828125,
              0
          ],
          [
              0,
              0
          ]
      ],
      "pressures": [],
      "simulatePressure": true,
      "lastCommittedPoint": [
          0.800048828125,
          0
      ]
  }
]
let updated = [
  {
      "id": "KtWIdfQjpwFLksPRcyA_T",
      "type": "freedraw",
      "x": 592.7999267578125,
      "y": 158.20001220703125,
      "width": 0.0001,
      "height": 0.0001,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#b2f2bb",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "roundness": null,
      "seed": 893785652,
      "version": 5,
      "versionNonce": 224321204,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1725011300649,
      "link": null,
      "locked": false,
      "points": [
          [
              0,
              0
          ],
          [
              0.0001,
              0.0001
          ]
      ],
      "pressures": [],
      "simulatePressure": true,
      "lastCommittedPoint": [
          0.0001,
          0.0001
      ]
  },
  {
      "id": "ApnkbTPqyBuuqME1Xc-S8",
      "type": "rectangle",
      "x": 430.4000244140625,
      "y": 121.40001678466797,
      "width": 234.4000244140625,
      "height": 163.19998931884766,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#b2f2bb",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "roundness": {
          "type": 3
      },
      "seed": 1578979084,
      "version": 105,
      "versionNonce": 1775427084,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1725009877914,
      "link": null,
      "locked": false
  },
  {
      "id": "Fe6wy0pL8KLdgl0z9WLSC",
      "type": "freedraw",
      "x": 593.5999755859375,
      "y": 238.19999694824216,
      "width": 8.80002675781248,
      "height": 19.999899999999982,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#b2f2bb",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "roundness": null,
      "seed": 755337396,
      "version": 85,
      "versionNonce": 1852273972,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1725009666142,
      "link": null,
      "locked": false,
      "points": [
          [
              0,
              0
          ],
          [
              8.80002675781248,
              -19.999899999999982
          ]
      ],
      "pressures": [],
      "simulatePressure": true,
      "lastCommittedPoint": [
          0.0001,
          0.0001
      ]
  },
  {
      "id": "55qsJBDhzImqUE22Ca6Qa",
      "type": "freedraw",
      "x": 537.5999755859375,
      "y": 182.20001220703125,
      "width": 0.800048828125,
      "height": 0,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "roundness": null,
      "seed": 1808422196,
      "version": 6,
      "versionNonce": 379831948,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1725009744028,
      "link": null,
      "locked": false,
      "points": [
          [
              0,
              0
          ],
          [
              0.800048828125,
              0
          ],
          [
              0,
              0
          ]
      ],
      "pressures": [],
      "simulatePressure": true,
      "lastCommittedPoint": [
          0.800048828125,
          0
      ]
  },
  {
      "id": "L2DF1r6LT1At-tf1yRJEk",
      "type": "freedraw",
      "x": 765.5999755859375,
      "y": 72.60000610351562,
      "width": 219.199951171875,
      "height": 66.39999389648438,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#b2f2bb",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "roundness": null,
      "seed": 1462604212,
      "version": 19,
      "versionNonce": 258386444,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1725009752406,
      "link": null,
      "locked": false,
      "points": [
          [
              0,
              0
          ],
          [
              0.800048828125,
              0
          ],
          [
              1.5999755859375,
              0.8000030517578125
          ],
          [
              3.199951171875,
              3.2000274658203125
          ],
          [
              14.4000244140625,
              9.600006103515625
          ],
          [
              18.4000244140625,
              12.800003051757812
          ],
          [
              40.800048828125,
              21.599990844726562
          ],
          [
              60,
              28
          ],
          [
              96.800048828125,
              38.399993896484375
          ],
          [
              109.5999755859375,
              41.59999084472656
          ],
          [
              136,
              48
          ],
          [
              148.800048828125,
              52
          ],
          [
              185.5999755859375,
              59.20002746582031
          ],
          [
              198.4000244140625,
              62.399993896484375
          ],
          [
              208.800048828125,
              64.79998779296875
          ],
          [
              217.5999755859375,
              66.39999389648438
          ],
          [
              219.199951171875,
              66.39999389648438
          ],
          [
              219.199951171875,
              66.39999389648438
          ]
      ],
      "pressures": [],
      "simulatePressure": true,
      "lastCommittedPoint": [
          219.199951171875,
          66.39999389648438
      ]
  }
]


old = old.map((x) => ({id: x.id, version: x.version, isDeleted: x.isDeleted}))
updated = updated.map((x) => ({id: x.id, version: x.version, isDeleted: x.isDeleted}))

const operations = diffForYjs(old, updated)

let result = JSON.parse(JSON.stringify(old))
for (let op of operations) {
  if (op.type === 'update') {
    continue
  }
  else if (op.type === 'insert') {
    result.splice(op.index, 0, op.element)
  }
  else if (op.type === 'delete') {
    result = result.filter((x) => x.id !== op.id)
  }
  else if (op.type === 'move') {
    result = moveArrayItem(result, op.fromIndex, op.toIndex)
  }
  else if (op.type === 'bulkInsert') {
    result.splice(op.index, 0, ...op.data)
  }
  else if (op.type === 'bulkDelete') {
    result.splice(op.index, op.data.elements.length)
  }
}

console.log(old.map((x) => x.id).join(', '))
console.log(updated.map((x) => x.id).join(', '))
for (let op of operations) {
  console.log(op)
}
console.log(result.map((x) => x.id).join(', '))

if (JSON.stringify(result.map((x) => x.id)) === JSON.stringify(updated.filter((x) => !x.isDeleted).map((x) => x.id))) {
 console.log('passed') 
} 
else {
  console.error('failed')
}