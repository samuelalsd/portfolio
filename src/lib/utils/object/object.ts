import type { IObject, IOptions, TMerged } from './types';

/**
 * Checks if a value is a plain object.
 *
 * A plain object is an object created by the `{}` syntax or `new Object()`,
 * and not an instance of a custom class, array, or date.
 *
 * @example
 * ```typescript
 * isObject({}); // true
 * isObject(new Object()); // true
 * isObject([]); // false
 * isObject(new Date()); // false
 * isObject(null); // false
 * isObject(42); // false
 * ```
 */
export function isObject(value: unknown) {
	if (
		typeof value !== 'object' ||
		value === null ||
		value instanceof Date ||
		Array.isArray(value)
	) {
		return false;
	}

	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

/**
 * Merges multiple objects into one.
 *
 * @example
 * const obj1 = { a: 1, b: { c: 2 } };
 * const obj2 = { b: { d: 3 }, e: 4 };
 * const result = merge(obj1, obj2);
 * // result is { a: 1, b: { c: 2, d: 3 }, e: 4 }
 */
export const merge = <T extends IObject[]>(...objects: T): TMerged<T[number]> =>
	objects.reduce((result, current) => {
		if (Array.isArray(current)) {
			throw new TypeError('Arguments provided to ts-deepmerge must be objects, not arrays.');
		}

		Object.keys(current).forEach((key) => {
			if (['__proto__', 'constructor', 'prototype'].includes(key)) {
				return;
			}

			if (Array.isArray(result[key]) && Array.isArray(current[key])) {
				result[key] = merge.options.mergeArrays
					? merge.options.uniqueArrayItems
						? Array.from(new Set((result[key] as unknown[]).concat(current[key])))
						: [...result[key], ...current[key]]
					: current[key];
			} else if (isObject(result[key]) && isObject(current[key])) {
				result[key] = merge(result[key] as IObject, current[key] as IObject);
			} else {
				result[key] =
					current[key] === undefined
						? merge.options.allowUndefinedOverrides
							? current[key]
							: result[key]
						: current[key];
			}
		});

		return result;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	}, {}) as any;
const defaultOptions: IOptions = {
	allowUndefinedOverrides: true,
	mergeArrays: true,
	uniqueArrayItems: true
};
merge.options = defaultOptions;
/**
 * Merges multiple objects into one with custom options.
 *
 * @example
 * const obj1 = { a: 1, b: { c: 2 } };
 * const obj2 = { b: { d: 3 }, e: 4 };
 * const result = merge.withOptions({ mergeArrays: false }, obj1, obj2);
 */
merge.withOptions = <T extends IObject[]>(options: Partial<IOptions>, ...objects: T) => {
	merge.options = {
		...defaultOptions,
		...options
	};
	const result = merge(...objects);
	merge.options = defaultOptions;
	return result;
};
