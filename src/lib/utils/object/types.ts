// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TAllKeys<T> = T extends any ? keyof T : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TIndexValue<T, K extends PropertyKey, D = never> = T extends any
	? K extends keyof T
		? T[K]
		: D
	: never;

export type TPartialKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>> extends infer O
	? { [P in keyof O]: O[P] }
	: never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TFunction = (...a: any[]) => any;

export type TPrimitives = string | number | boolean | bigint | symbol | Date | TFunction;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TMerged<T> = [T] extends [Array<any>]
	? { [K in keyof T]: TMerged<T[K]> }
	: [T] extends [TPrimitives]
		? T
		: [T] extends [object]
			? TPartialKeys<{ [K in TAllKeys<T>]: TMerged<TIndexValue<T, K>> }, never>
			: T;

export interface IObject {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}

export interface IOptions {
	/**
	 * When `true`, values explicitly provided as `undefined` will override existing values, though properties that are simply omitted won't affect anything.
	 * When `false`, values explicitly provided as `undefined` won't override existing values.
	 *
	 * Default: `true`
	 */
	allowUndefinedOverrides: boolean;

	/**
	 * When `true` it will merge array properties.
	 * When `false` it will replace array properties with the last instance entirely instead of merging their contents.
	 *
	 * Default: `true`
	 */
	mergeArrays: boolean;

	/**
	 * When `true` it will ensure there are no duplicate array items.
	 * When `false` it will allow duplicates when merging arrays.
	 *
	 * Default: `true`
	 */
	uniqueArrayItems: boolean;
}

export type NestedPropertyPaths<T, Path extends string | number = ''> = T extends (infer U)[]
	? Path extends ''
		? `${number}` | NestedPropertyPaths<U, `${number}`>
		: Path extends string
			? `${Path}.${number}` | NestedPropertyPaths<U, `${Path}.${number}`>
			: Path extends number
				? `${number}` | NestedPropertyPaths<U, `${number}`>
				: never
	: T extends object
		? Path extends ''
			?
					| keyof T
					| {
							[K in keyof T]: K extends string
								? NestedPropertyPaths<T[K], Path extends '' ? K : `${Path}.${K}`>
								: never;
					  }[keyof T]
			: Path extends string
				? Path | `${Path}.${NestedPropertyPaths<T>}`
				: never
		: never;

export type ExtractNestedType<T, K> = K extends keyof T
	? T[K]
	: K extends `${infer Head}.${infer Tail}`
		? Head extends keyof T
			? ExtractNestedType<T[Head], Tail>
			: Head extends `${number}`
				? T extends (infer A)[]
					? ExtractNestedType<A, Tail> | undefined
					: never
				: never
		: K extends `${number}`
			? ExtractNestedType<T, number> | undefined
			: never;
