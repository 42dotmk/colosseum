/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-param-reassign */
export const flattenObj: any = (data: any) => {
  const isObject = (data: any) => typeof data === 'object' && data !== null;

  const flatten = (data: any) => {
    if (!data.attributes) return data;
    return {
      id: data.id,
      ...data.attributes,
    };
  };

  if (Array.isArray(data)) {
    return data.map(flattenObj);
  }

  if (isObject(data)) {
    if (Array.isArray(data.data)) {
      data = [...data.data];
    } else if (isObject(data.data)) {
      data = flatten({ ...data.data });
    } else if (data.data === null) {
      data = null;
    } else {
      data = flatten(data);
    }

    for (const key in data) {
      data[key] = flattenObj(data[key]);
    }
    return data;
  }
  return data;
};
