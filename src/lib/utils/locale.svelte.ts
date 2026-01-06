import memoize from 'memoize';

type UserLocaleOptions = {
	useFallback?: boolean;
	fallback?: string;
};

function fix_commas(str: string): string | string[] {
	return str.indexOf(',') !== -1 ? str.split(',') : str;
}

function is_string(value: unknown): value is string {
	return typeof value === 'string';
}

function is_unique(value: string, index: number, array: string[]): boolean {
	return array.indexOf(value) === index;
}

function is_all_lowercase(str: string): boolean {
	return str === str.toLowerCase();
}

function normalize_locale(locale: string): string {
	if (!locale) return locale;
	if (locale === 'C' || locale === 'posix' || locale === 'POSIX') return 'en-US';
	if (locale.indexOf('.') !== -1) return normalize_locale(locale.split('.')[0] ?? '');
	if (locale.indexOf('@') !== -1) return normalize_locale(locale.split('@')[0] ?? '');
	if (locale.indexOf('-') !== -1 && !is_all_lowercase(locale)) return locale;
	const parts = locale.split('-');
	if (parts.length === 2) return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
	return parts[0];
}

function get_user_locales({ useFallback = true, fallback = 'en-US' }: UserLocaleOptions = {}) {
	let list: string[] = [];

	if (!navigator) return list;

	const rawLanguages = navigator.languages || [];
	const languages: string[] = [];

	for (const l of rawLanguages) {
		languages.concat(fix_commas(l));
	}

	const rawLanguage = navigator.language;
	const language = rawLanguage ? fix_commas(rawLanguage) : rawLanguage;

	list = list.concat(languages, language);

	if (useFallback) {
		list.push(fallback);
	}

	return list.filter(is_string).map(normalize_locale).filter(is_unique);
}

function get_user_locale(options?: undefined): string;
function get_user_locale(options?: Record<string, never>): string;
function get_user_locale(options?: { useFallback: false; fallback?: string }): string | null;
function get_user_locale(options?: { useFallback?: true; fallback?: string }): string;

function get_user_locale(options?: UserLocaleOptions | undefined) {
	return get_user_locales(options)[0] || null;
}

export const getUserLocales: (options?: UserLocaleOptions | undefined) => string[] = memoize(
	get_user_locales,
	{
		cacheKey: JSON.stringify
	}
);

export const getUserLocale: {
	(options?: undefined): string;
	(options?: Record<string, never>): string;
	(options?: { useFallback: false; fallback?: string }): string | null;
	(options?: { useFallback?: true; fallback?: string }): string;
} = memoize(get_user_locale, {
	cacheKey: JSON.stringify
});

export class UserLocale {
	#current: Intl.LocalesArgument = $state('en-US');
	constructor() {
		this.#current = getUserLocale();
	}
	get current() {
		return this.#current;
	}
	set current(value: Intl.LocalesArgument) {
		this.#current = value;
	}
}
