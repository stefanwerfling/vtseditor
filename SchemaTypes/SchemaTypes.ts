export const TypeVtsObject = 'object';
export const TypeVtsObject2 = 'object2';
export const TypeVtsArray = 'array';
export const TypeVtsString = 'string';
export const TypeVtsNumber = 'number';
export const TypeVtsBoolean = 'boolean';
export const TypeVtsNull = 'null';
export const TypeVtsUnknown = 'unknown';
export const TypeVtsDate = 'date';
export const TypeVtsDateString = 'datestring';
export const TypeVtsOr = 'or';
export const TypeVtsUndefined = 'undefined';
export const TypeVtsTrue = 'true';
export const TypeVtsFalse = 'false';


export const MapVtsExtends: Map<string, string> = new Map<string, string>([
    [TypeVtsObject, 'Object']
]);

export const MapVtsComplex: Map<string, string> = new Map<string, string>([
    [TypeVtsObject2, 'Object2'],
    [TypeVtsArray, 'Array']
]);

export const MapVtsSimple: Map<string, string> = new Map<string, string>([
    [TypeVtsString, 'String'],
    [TypeVtsNumber, 'Number'],
    [TypeVtsBoolean, 'Boolean'],
    [TypeVtsNull, 'Null'],
    [TypeVtsUnknown, 'Unknown'],
    [TypeVtsDate, 'Date'],
    [TypeVtsDateString, 'DateString']
]);

export const MapVtsSimple2: Map<string, string> = new Map<string, string>([
    [TypeVtsOr, 'Or'],
    [TypeVtsUndefined, 'Undefined'],
    [TypeVtsTrue, 'True'],
    [TypeVtsFalse, 'False']
]);

export const MapVtsAll:  Map<string, string> = new Map<string, string>([
    ...MapVtsExtends,
    ...MapVtsComplex,
    ...MapVtsSimple,
    ...MapVtsSimple2
]);