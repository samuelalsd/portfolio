import { SvelteDate } from 'svelte/reactivity';
import { UserLocale } from './locale.svelte';

export class CurrentDateTime {
	#date: Date = new SvelteDate();
	#locale = new UserLocale();

	#defaultFormatterOptions: Intl.DateTimeFormatOptions = {
		weekday: 'short',
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	};
	#formatterOptions: Intl.DateTimeFormatOptions = $state({});

	#formatter = $derived(
		new Intl.DateTimeFormat(this.#locale.current, {
			...this.#defaultFormatterOptions,
			...this.#formatterOptions
		})
	);

	constructor({ formatterOptions }: { formatterOptions?: Intl.DateTimeFormatOptions } = {}) {
		console.log(this.#locale.current);
		if (formatterOptions) this.#formatterOptions = formatterOptions;

		$effect(() => {
			const interval = setInterval(() => {
				this.#date.setTime(Date.now());
			}, 1000);

			return () => {
				clearInterval(interval);
			};
		});
	}

	updateFormatterOptions(options: Intl.DateTimeFormatOptions) {
		this.#formatterOptions = { ...this.#formatterOptions, ...options };
	}

	get formattedDate() {
		return this.#formatter.format(this.#date);
	}
}
