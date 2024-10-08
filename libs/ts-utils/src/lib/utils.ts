export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const isNullOrUndefined = (data: any): data is null | undefined => {
  return data === null || data === undefined
}

export const isEmptyString = (data: any) => {
  return isNullOrUndefined(data) || data.toString()?.trim() === ""
}

export const roundNumber = (num: number, digits = 0) => {
  const x = 10 ** digits;
  return Math.round(num * x) / x;
};

export const isSameNumber = (num1: number, num2: number, epsilon: number) => {
  const diff = Math.abs(num1 - num2)
  return diff <= epsilon
}

export const isNumber = (num: any) => {
  /*
      Returns true if the passed data can be converted to a number, else returns false
      Returns true for : 0, -1, "+1", "-11", "11.23", 23e4, "23e4", "   1"
      Returns false for: null, undefined, {}, [], "++1", "--1", etc
  */
  return !isNaN(parseFloat(num)) && !isNaN(num - 0);
}

export const getObjectHash = (obj: any, props?: { round?: number }) => {
  const round = props?.round || 6

  // Check if object is undefined or null
  if (isNullOrUndefined(obj)) {
    return undefined
  }

  const _formatPrimitives = (value: string | number | boolean) => {
    if (typeof value === 'number' && value % 1 !== 0) {
      return Number(value.toFixed(round));
    }
    return value;
  };

  // Replacer function for JSON.stringify
  const _replacer = (key: any, value: any) => {
    if (value instanceof Object && !(value instanceof Array)) {
      // This sorts the object keys
      return Object.keys(value)
        .sort()
        .reduce((sorted: any, key) => {
          sorted[key] = _formatPrimitives(value[key]);
          return sorted;
        }, {});
    }

    return _formatPrimitives(value);
  };

  // Return JSON string of object with sorted keys and rounded floating point numbers
  return JSON.stringify(obj, _replacer);
};

export const deepClone = <T>(data: T): T => {
  if (isNullOrUndefined(data)) return data;
  return JSON.parse(JSON.stringify(data))
}

export const moveArrayItem = <T>(arr: T[], from: number, to: number, inPlace = true) => {
  if (!inPlace) {
    arr = [...arr]
  }
  arr.splice(to, 0, arr.splice(from, 1)[0]);
  return arr
};


export const formUrl = ({basePath, otherPath, params}: {basePath: string, otherPath?: string, params: {[key: string]: any}}) => {
  params = !params ? {} : params
  const formattedParams: {[key: string]: string} = {}
  for (let key of Object.keys(params)) {
    const value = params[key]
    if (isNullOrUndefined(value)) {
      continue
    }
    formattedParams[key] = typeof value === "string" ? value: JSON.stringify(value)
  }
  
  const base = otherPath ? new URL(otherPath, basePath).toString() : basePath
  const queryParams = new URLSearchParams(Object.entries(formattedParams)).toString();

  return queryParams ? `${base}?${queryParams}` : base
}