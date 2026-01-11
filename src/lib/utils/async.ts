export class Timer {
	delay: number;
	#timerId: NodeJS.Timeout | undefined;
	#start: number | undefined;
	#remaining: number;
	#callback: (...args: unknown[]) => void;

	constructor(
		callback: (...args: unknown[]) => void,
		delay: number,
		{ autostart = true }: { autostart: boolean } = { autostart: true }
	) {
		this.delay = delay;
		this.#remaining = delay;
		this.#callback = callback;

		if (autostart) {
			this.resume();
		}
	}

	pause() {
		this.clear();
		this.#timerId = undefined;
		this.#remaining -= Date.now() - (this.#start as number);
	}

	clear() {
		clearTimeout(this.#timerId);
	}

	resume() {
		if (this.#timerId) {
			return;
		}

		this.#start = Date.now();
		this.#timerId = setTimeout(this.#callback, this.#remaining);
	}

	restart() {
		this.clear();
		this.#timerId = undefined;
		this.#remaining = this.delay;
		this.resume();
	}
}
