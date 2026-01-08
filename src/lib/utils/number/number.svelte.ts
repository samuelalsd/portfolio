import { clamp } from './number';

export class Clamped {
	#value: number | undefined = $state();
	#current: number;
	#min: number;
	#max: number;

	constructor(
		initial: number = 0,
		{
			min = -Infinity,
			max = Infinity
		}: {
			min?: number | (() => number);
			max?: number | (() => number);
		}
	) {
		this.#value = initial;
		this.#current = $derived(this.#clamp(this.#value));
		this.#min = $derived(typeof min === 'number' ? min : min());
		this.#max = $derived(typeof max === 'number' ? max : max());
	}

	get current() {
		return this.#current;
	}

	set current(value) {
		this.#value = this.#clamp(value);
	}

	#getMinValue() {
		if (this.#min > this.#max) return this.#max;
		return this.#min;
	}

	#getMaxValue() {
		if (this.#min > this.#max) return this.#min;
		return this.#max;
	}

	#clamp(value: number) {
		return clamp(value, this.#getMinValue(), this.#getMaxValue());
	}
}
