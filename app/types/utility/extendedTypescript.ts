// ------------------------------------------------------------ ------------------------------------------------------------
/**
 * ### SmartOmit
 *
 * Works like Omit but gives you autocomplete for the available keys.
 *
 * Caveat: It makes all the the other keys required (TODO if it can be solved).
 *
 * @author
 * https://github.com/microsoft/TypeScript/issues/50854
 */
export type SmartOmit<
  T,
  K extends keyof T | (string & {}) | (number & {}) | (symbol | {}),
> = {
  [P in Exclude<keyof T, K>]: T[P];
};
// ------------------------------------------------------------ ------------------------------------------------------------

// ------------------------------------------------------------ ------------------------------------------------------------
/**
 * ### DeepNonNullable
 *
 * Makes all the properties of an object non-nullable (removes `null` and `undefined`). Recursively.
 *
 * @author
 * https://stackoverflow.com/questions/57835286/deep-recursive-requiredt-on-specific-properties
 */
export type DeepNonNullable<T> = {
  [K in keyof T]: DeepNonNullable<Exclude<T[K], null | undefined>>;
};
// ------------------------------------------------------------ ------------------------------------------------------------

// ------------------------------------------------------------ ------------------------------------------------------------
/**
 * ### DeepNullable
 *
 * Makes all the properties of an object nullable (adds `null` and `undefined`). Recursively.
 *
 * @author
 * https://stackoverflow.com/questions/57835286/deep-recursive-requiredt-on-specific-properties
 */
export type DeepNullable<T> = {
  [K in keyof T]: DeepNullable<T[K] | null | undefined>;
};
// ------------------------------------------------------------ ------------------------------------------------------------

// ------------------------------------------------------------ ------------------------------------------------------------
/**
 * ### DeepReplaceTypes
 *
 * Replaces all the properties of an object with a specific type. Recursively.
 *
 * @author
 * https://stackoverflow.com/questions/60437172/typescript-deep-replace-multiple-types
 */
export type DeepReplaceTypes<T, M extends [any, any]> = {
  [P in keyof T]: T[P] extends M[0]
    ? Replacement<M, T[P]>
    : T[P] extends object
      ? DeepReplaceTypes<T[P], M>
      : T[P];
};

type Replacement<M extends [any, any], T> = M extends any
  ? [T] extends [M[0]]
    ? M[1]
    : never
  : never;
// ------------------------------------------------------------ ------------------------------------------------------------

// ------------------------------------------------------------ ------------------------------------------------------------
/**
 * ### KeysFrom
 *
 * Allows you to create a new type with keys from another type, and the values can be anything.
 *
 * @author
 * https://stackoverflow.com/questions/78264284/how-to-make-type-that-can-only-have-keys-from-another-type-but-the-keys-can-have?noredirect=1#comment138001021_78264284
 */
export type KeysFrom<
  T,
  U extends { [P in keyof T | keyof U]: P extends keyof T ? any : never },
> = U;
// ------------------------------------------------------------ ------------------------------------------------------------

// ------------------------------------------------------------ ------------------------------------------------------------
/**
 * ### RemoveFunctions
 *
 * Removes all the functions properties from a type.
 *
 * @author
 * https://umaranis.com/2022/11/28/type-transformations-in-typescript-removing-functions-from-a-type/
 */
export type RemoveFunctions<T> = {
  [key in keyof T]: T[key] extends Function ? never : T[key];
};
// ------------------------------------------------------------ ------------------------------------------------------------

// ------------------------------------------------------------ ------------------------------------------------------------
/**
 * ### RemovePromise
 *
 * Removes all the Promise properties from a type.
 *
 * @author
 * https://github.com/muchisx
 */
export type RemovePromise<T> = {
  [key in keyof T]: T[key] extends Promise<any> ? never : T[key];
};
// ------------------------------------------------------------ ------------------------------------------------------------

// ------------------------------------------------------------ ------------------------------------------------------------
/**
 * ### DeepReplacePropertyType
 *
 * Deep Replace a property called id type to string while keeping the shape of the original
 *
 * @author
 * https://github.com/muchisx
 */
export type DeepReplacePropertyType<
  T extends object,
  TargetKey extends string,
  TargetType,
> = {
  [P in keyof T]: P extends TargetKey
    ? TargetType
    : T[P] extends object
      ? DeepReplacePropertyType<T[P], TargetKey, TargetType>
      : T[P];
};
// ------------------------------------------------------------ ------------------------------------------------------------

// ------------------------------------------------------------ ------------------------------------------------------------
/**
 * ### TypeOfType
 *
 * Get the type of the `typeof` operator. Possible returns for `typeof`.
 *
 * @author
 * https://stackoverflow.com/questions/69654873/can-i-define-a-typescript-type-as-all-possible-resulting-values-from-typeof
 */
export type TypeOfType = typeof allTypes;
const allTypes = typeof (1 as any);
// ------------------------------------------------------------ ------------------------------------------------------------

// ------------------------------------------------------------ ------------------------------------------------------------
/**
 * ### ValueOf
 *
 * Get the value of a type. (opposite of `keyof`)
 *
 * @author
 * https://stackoverflow.com/questions/49285864/is-there-a-valueof-similar-to-keyof-in-typescript
 */
export type ValueOf<T> = T[keyof T];
// ------------------------------------------------------------ ------------------------------------------------------------

// ------------------------------------------------------------ ------------------------------------------------------------
/**
 * ### FirstParam
 *
 * Get the first parameter of a function.
 *
 * @author
 * https://github.com/muchisx
 */
export type FirstParam<T> = T extends (param: infer P, ...args: any[]) => any
  ? P
  : never;
// ------------------------------------------------------------ ------------------------------------------------------------

// ------------------------------------------------------------ ------------------------------------------------------------
/**
 * ### DeepOmit
 *
 * Omit nested properties in an object.
 *
 * @author
 * https://stackoverflow.com/questions/60529460/types-for-deleting-object-at-specific-nested-path
 */
export type DeepOmit<T, Path extends (string | number)[]> = T extends object
  ? Path["length"] extends 1
    ? Omit<T, Path[0]>
    : {
        [K in keyof T]: K extends Path[0] ? DeepOmit<T[K], Tail<Path>> : T[K];
      }
  : T;

type Tail<T extends any[]> = ((...t: T) => void) extends (
  h: any,
  ...r: infer R
) => void
  ? R
  : never;
// ------------------------------------------------------------ ------------------------------------------------------------

// ------------------------------------------------------------ ------------------------------------------------------------
/**
 * ### DeepObjectValues
 *
 * Get all the values of an object, including nested properties.
 *
 * @example
 * type Test = {
 *   a: {
 *     b: 'hi';
 *     c: 'bye';
 *   };
 *   d: 'hello';
 * };
 *
 * type Result = DeepObjectValues<Test>;
 * // Result = "hi" | "bye" | "hello"
 *
 * @author
 * https://github.com/muchisx
 */
export type DeepObjectValues<T> = T extends object
  ? { [K in keyof T]: DeepObjectValues<T[K]> }[keyof T]
  : T;
// ------------------------------------------------------------ ------------------------------------------------------------
