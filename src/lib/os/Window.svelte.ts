import { mount, unmount, type MountOptions, type Snippet } from 'svelte';
import { innerHeight, innerWidth } from 'svelte/reactivity/window';
import type { Attachment } from 'svelte/attachments';
import { browser } from '$app/environment';
import { Clamped } from '$lib/utils/number';
import Window from '$lib/components/Window.svelte';

const defaults = {
	initiallyMaximized: false,
	initiallyFullscreen: false,
	initialWidth: 768,
	initialHeight: 420,
	minWidth: 384,
	minHeight: 192
};

interface OSWindowOptions {
	title: string;
	target?: Exclude<MountOptions['target'], Document> | string;
	wrapper?: HTMLDivElement;
	ref?: HTMLDivElement;
	initiallyMaximized?: boolean;
	initiallyFullscreen?: boolean;
	initialWidth?: number;
	initialHeight?: number;
	minWidth?: number;
	minHeight?: number;
}

export class OSWindows {
	#stack: OSWindow[] = $state([]);
	#positions: string[] = $state([]);

	getStackPosition = $derived((w: OSWindow) => {
		const index = this.#positions.indexOf(w.id);
		return index !== -1 ? index : -1;
	});

	get stack() {
		return this.#stack;
	}

	open(children: Snippet, options: OSWindowOptions) {
		const w = new OSWindow(children, options);
		this.#stack.push(w);
		this.#positions.push(w.id);
		w.render();
		return w;
	}

	destroy(w: OSWindow) {
		w.destroy();
		const index = this.#stack.indexOf(w);
		if (index !== -1) {
			this.#stack.splice(index, 1);
			this.#positions = this.#positions.filter((id) => id !== w.id);
		}
	}

	destroyAll() {
		this.#stack.forEach((w) => w.destroy());
		this.#stack = [];
		this.#positions = [];
	}

	focusWindow(w: OSWindow) {
		if (this.#stack.length < 2) return;
		const index = this.#positions.indexOf(w.id);
		if (index !== -1 && index !== this.#positions.length - 1) {
			this.#positions.splice(index, 1);
			this.#positions.push(w.id);
			this.#positions = [...this.#positions];
		}
	}

	windowHasFocus(w: OSWindow) {
		return this.#positions.at(-1) === w.id && !w.isMinimized;
	}
}

export const WindowsManager = new OSWindows();

export class OSWindow {
	#id: string = $state(`w${WindowsManager.stack.length + 1}-${Date.now()}`);
	wrapper: HTMLDivElement | undefined = $state();
	ref: HTMLDivElement | undefined = $state();
	#target: HTMLElement;
	title: string;

	#instance: ReturnType<typeof mount> | null = null;
	#children: Snippet;

	#minWidth: number;
	#minHeight: number;

	#width: Clamped;
	#height: Clamped;
	#left: Clamped;
	#top: Clamped;

	#previousLeft: number | undefined;
	#previousTop: number | undefined;
	#previousWidth: number | undefined;
	#previousHeight: number | undefined;

	#minimized: boolean = $state(false);
	#maximized: boolean = $state(false);
	#fullscreen: boolean = $state(false);

	#saveRect = () => {
		this.#previousWidth = this.#width.current;
		this.#previousHeight = this.#height.current;
		this.#previousLeft = this.#left.current;
		this.#previousTop = this.#top.current;
	};

	constructor(children: Snippet, options: OSWindowOptions) {
		if (!browser) throw new Error('OSWindow cannot be created outside of a browser environment.');

		const {
			ref,
			wrapper,
			target = document.querySelector('main'),
			title,
			initiallyMaximized,
			initiallyFullscreen,
			initialWidth,
			initialHeight,
			minWidth,
			minHeight
		} = {
			...defaults,
			...options
		};

		if (typeof target === 'string') {
			const found = document.querySelector(target);
			if (!found) throw new Error(`Target element with selector "${target}" not found.`);
			if (!(found instanceof HTMLElement))
				throw new Error('Target element must be an HTMLElement.');
			this.#target = found;
		} else if (target instanceof HTMLElement) {
			this.#target = target;
		} else {
			throw new Error('Invalid target element.');
		}

		this.#children = children;
		this.title = title;
		this.wrapper = wrapper;
		this.ref = ref;

		this.#minWidth = minWidth;
		this.#minHeight = minHeight;

		this.#width = new Clamped(initialWidth, {
			min: this.#minWidth,
			max: () => innerWidth.current! // TODO: should be changed to reactive container width
		});
		this.#height = new Clamped(initialHeight, {
			min: this.#minHeight,
			max: () => innerHeight.current! // TODO: should be changed to reactive container height
		});
		this.#left = new Clamped(0, {
			min: -this.#target.clientWidth + 64,
			max: () => this.#target.clientWidth - 64
		});
		this.#top = new Clamped(0, {
			min: 0,
			max: () => this.#target.clientHeight - 64
		});

		if (initiallyFullscreen) this.toggleFullscreen(true);
		else if (initiallyMaximized) this.toggleMaximized(true);
		else {
			this.#width.current = initialWidth;
			this.#height.current = initialHeight;
			this.#previousWidth = initialWidth;
			this.#previousHeight = initialHeight;
		}

		$effect.root(() => {
			$effect(() => {
				if (this.wrapper) {
					this.wrapper.style.setProperty('left', `${this.#left.current}px`);
					this.wrapper.style.setProperty('top', `${this.#top.current}px`);
					this.wrapper.style.setProperty('width', `${this.#width.current}px`);
					this.wrapper.style.setProperty('height', `${this.#height.current}px`);
				}
			});

			$effect(() => {
				if (this.ref) {
					this.ref.style.setProperty('width', `${this.#width.current}px`);
					this.ref.style.setProperty('height', `${this.#height.current}px`);
				}
			});

			$effect(() => {
				if (this.wrapper) {
					this.wrapper.style.setProperty(
						'z-index',
						(WindowsManager.getStackPosition(this) + 20).toString()
					);
				}
			});
		});
	}

	get id() {
		return this.#id;
	}

	get children() {
		return this.#children;
	}

	get left() {
		return this.#left;
	}

	get top() {
		return this.#top;
	}

	get width() {
		return this.#width;
	}

	get height() {
		return this.#height;
	}

	get instance() {
		return this.#instance;
	}

	get isMinimized() {
		return this.#minimized;
	}

	get isMaximized() {
		return this.#maximized;
	}

	setId = (id: string) => {
		// if (this.#id) throw new Error(`Cannot override ID: it was already set as ${this.#id}`);
		this.#id = id;
	};

	clearInstance = () => {
		this.#instance = null;
	};

	render = () => {
		if (this.#instance) return;
		this.#instance = mount(Window, {
			target: this.#target,
			props: {
				self: this
			}
		});
	};

	destroy = () => {
		if (!this.#instance) return;
		unmount(this.#instance, { outro: true });
		this.#instance = null;
		WindowsManager.destroy(this);
	};

	toggleMinimized: {
		(value?: true): void;
		(
			value?: false,
			{ left, top }?: { left?: number; top?: number; width?: number; height?: number }
		): void;
	} = (
		value,
		{
			left = this.#previousLeft,
			top = this.#previousTop,
			width = this.#previousWidth,
			height = this.#previousHeight
		} = {}
	) => {
		if (!WindowsManager.windowHasFocus(this)) {
			WindowsManager.focusWindow(this);
			this.#minimized = false;
			return;
		}

		const newState = typeof value === 'boolean' ? value : !this.#minimized;

		// we need a way to bypass the clamped values... maybe should NOT use instances of Clamped()
		if (newState) {
			console.log('minimizing and saving rect...');
			// play some animation (with gsap or just native????)
			this.#saveRect();
		} else {
			if (left) this.#left.current = left;
			else this.#left.current = 0;
			if (top) this.#top.current = top;
			else this.#top.current = 0;
			if (width) this.#width.current = width;
			else this.#width.current = this.#target.clientWidth;
			if (height) this.#height.current = height;
			else this.#height.current = this.#target.clientHeight;
			// something here
			WindowsManager.focusWindow(this);
		}

		this.#minimized = newState;
	};

	toggleMaximized: {
		(value?: true): void;
		(value?: false, { left, top }?: { left?: number; top?: number }): void;
	} = (value, { left = this.#previousLeft, top = this.#previousTop } = {}) => {
		const newState = typeof value === 'boolean' ? value : !this.#maximized;
		if (newState) {
			this.#saveRect();

			const rect = this.#target.getBoundingClientRect();

			this.#width.current = rect.width;
			this.#height.current = rect.height;

			this.#left.current = 0;
			this.#top.current = 0;
		} else {
			if (typeof this.#previousWidth === 'number') {
				this.#width.current = this.#previousWidth;
			}
			if (typeof this.#previousHeight === 'number') {
				this.#height.current = this.#previousHeight;
			}
			if (left) this.#left.current = left;
			if (top) this.#top.current = top;
		}
		this.#maximized = newState;
	};

	toggleFullscreen = (value?: boolean) => {
		//do stuff
		this.#fullscreen = typeof value === 'boolean' ? value : !this.#fullscreen;
		// this.ref.style.setProperty('position', 'fixed');
	};

	resizeHandle: (
		position: 'top' | 'bottom' | 'left' | 'right' | 'ne' | 'nw' | 'se' | 'sw'
	) => Attachment = (position, container = this.#target) => {
		return (node: Element) => {
			if (!(node instanceof HTMLElement))
				throw new Error('Invalid element: only HTMLElement supported.');

			let mouseIsDown = false;
			let startingX = 0;
			let startingY = 0;
			let startingWidth = 0;
			let startingHeight = 0;
			let startingMouseX = 0;
			let startingMouseY = 0;

			const setMoveStyles = () => {
				document.body.style.setProperty('user-select', 'none');
				document.body.style.setProperty('-webkit-user-select', 'none');
				this.wrapper?.style.setProperty('transition-property', 'width, height');
				this.ref?.style.setProperty('transition', 'none');
			};

			const resetStyles = () => {
				document.body.style.setProperty('user-select', 'initial');
				document.body.style.setProperty('-webkit-user-select', 'initial');
				this.wrapper?.style.removeProperty('transition');
				this.ref?.style.removeProperty('transition');
			};

			const snapLeft = () => {
				this.#width.current += this.#left.current;
				this.#left.current = 0;
			};
			const snapRight = (rect: DOMRect) => {
				this.#width.current = rect.width - startingX + rect.x;
			};
			const snapTop = () => {
				this.#height.current += this.#top.current;
				this.#top.current = 0;
			};
			const snapBottom = (rect: DOMRect) => {
				this.#height.current = rect.height - startingY + rect.y;
			};

			const resizeLeft = (deltaMouseX: number, rect: DOMRect) => {
				this.#width.current = startingWidth - deltaMouseX;
				this.#left.current = startingX + deltaMouseX - rect.x;
			};
			const resizeRight = (deltaMouseX: number) => {
				this.#width.current = startingWidth + deltaMouseX;
			};
			const resizeTop = (deltaMouseY: number, rect: DOMRect) => {
				this.#height.current = startingHeight - deltaMouseY;
				this.#top.current = startingY + deltaMouseY - rect.y;
			};
			const resizeBottom = (deltaMouseY: number) => {
				this.#height.current = startingHeight + deltaMouseY;
			};

			const handleMouseDown = (e: MouseEvent) => {
				if (!this.ref) throw new Error('Window reference not found.');
				e.preventDefault();

				mouseIsDown = true;

				const rect = this.ref.getBoundingClientRect();
				startingX = rect.x;
				startingY = rect.y;
				startingWidth = rect.width;
				startingHeight = rect.height;
				startingMouseX = e.clientX;
				startingMouseY = e.clientY;

				setMoveStyles();

				document.addEventListener('mousemove', handleMouseMove);
				document.addEventListener('mouseup', handleMouseUp);
			};

			const handleMouseMove = (e: MouseEvent) => {
				if (!mouseIsDown) return;

				const rect = container.getBoundingClientRect();
				const deltaMouseX = e.clientX - startingMouseX;
				const deltaMouseY = e.clientY - startingMouseY;
				const overflowTop = e.clientY < rect.y;
				const overflowRight = e.clientX > rect.width + rect.x;
				const overflowBottom = e.clientY > rect.height + rect.y;
				const overflowLeft = e.clientX < rect.x;
				const canResizeWest = e.clientX > rect.x && startingWidth - deltaMouseX > this.#minWidth;
				const canResizeEast = e.clientX < rect.width + rect.x;
				const canResizeNorth = e.clientY > rect.y && startingHeight - deltaMouseY > this.#minHeight;
				const canResizeSouth = e.clientY < rect.height + rect.y;

				if (position === 'left') {
					if (overflowLeft) {
						snapLeft();
					} else if (canResizeWest) {
						resizeLeft(deltaMouseX, rect);
					}
				}

				if (position === 'right') {
					if (overflowRight) {
						snapRight(rect);
					} else if (canResizeEast) {
						resizeRight(deltaMouseX);
					}
				}

				if (position === 'top') {
					if (overflowTop) {
						snapTop();
					} else if (canResizeNorth) {
						resizeTop(deltaMouseY, rect);
					}
					if (e.clientY - rect.y < 24) {
						this.wrapper?.style.setProperty('height', `${this.#target.clientHeight}px`);
					} else {
						this.wrapper?.style.setProperty('height', `${this.#height.current}px`);
					}
				}

				if (position === 'bottom') {
					if (overflowBottom) {
						snapBottom(rect);
					} else if (canResizeSouth) {
						resizeBottom(deltaMouseY);
					}
				}

				if (position === 'nw') {
					if (overflowLeft) {
						snapLeft();
					} else if (canResizeWest) {
						resizeLeft(deltaMouseX, rect);
					}
					if (overflowTop) {
						snapTop();
					} else if (canResizeNorth) {
						resizeTop(deltaMouseY, rect);
					}
				}

				if (position === 'ne') {
					if (overflowLeft) {
						snapLeft();
					} else if (canResizeEast) {
						resizeRight(deltaMouseX);
					}
					if (overflowTop) {
						snapTop();
					} else if (canResizeNorth) {
						resizeTop(deltaMouseY, rect);
					}
				}

				if (position === 'sw') {
					if (overflowBottom) {
						snapBottom(rect);
					} else if (canResizeSouth) {
						resizeBottom(deltaMouseY);
					}
					if (overflowLeft) {
						snapLeft();
					} else if (canResizeWest) {
						resizeLeft(deltaMouseX, rect);
					}
				}

				if (position === 'se') {
					if (overflowRight) {
						snapRight(rect);
					} else if (canResizeEast) {
						resizeRight(deltaMouseX);
					}
					if (overflowBottom) {
						snapBottom(rect);
					} else if (canResizeSouth) {
						resizeBottom(deltaMouseY);
					}
				}
			};

			const handleMouseUp = (e: MouseEvent) => {
				resetStyles();
				const rect = this.#target.getBoundingClientRect();

				if (position === 'top' && e.clientY - rect.y < 24) {
					this.#height.current = rect.height;
				}

				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};

			node.addEventListener('mousedown', handleMouseDown);

			return () => {
				node.removeEventListener('mousedown', handleMouseDown);
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};
		};
	};

	titleBar: Attachment = (node: Element) => {
		if (!(node instanceof HTMLElement))
			throw new Error('Invalid element: only HTMLElement supported.');

		let startingX = 0;
		let startingY = 0;
		let startingMouseX = 0;
		let startingMouseY = 0;
		let mouseIsDown = false;

		const setMoveStyles = () => {
			this.ref?.style.setProperty('user-select', 'none');
			this.ref?.style.setProperty('-webkit-user-select', 'none');
			this.wrapper?.style.setProperty('transition', 'none');
			this.ref?.style.setProperty('transition', 'none');
		};

		const resetStyles = () => {
			this.ref?.style.setProperty('user-select', 'initial');
			this.ref?.style.setProperty('-webkit-user-select', 'initial');
			this.wrapper?.style.removeProperty('transition');
			this.ref?.style.removeProperty('transition');
		};

		const handleDoubleClick = () => {
			this.toggleMaximized();
		};

		const handleMouseDown = (e: MouseEvent) => {
			if (!this.ref) throw new Error('Window reference not found.');
			e.preventDefault();

			mouseIsDown = true;

			const rect = this.ref?.getBoundingClientRect();
			startingX = rect.x;
			startingY = rect.y;
			startingMouseX = e.clientX;
			startingMouseY = e.clientY;

			setMoveStyles();

			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			this.#target.addEventListener('mouseenter', handleMouseEnter);
			this.#target.addEventListener('mouseleave', handleMouseLeave);
		};

		const handleMouseMove = (e: MouseEvent) => {
			if (!mouseIsDown) return;
			if (this.#maximized) {
				// this.minimize();
			}
			const rect = this.#target.getBoundingClientRect();
			const deltaX = e.clientX - startingMouseX;
			const deltaY = e.clientY - startingMouseY;
			this.#left.current = startingX + deltaX - rect.x;
			this.#top.current = startingY + deltaY - rect.y;
		};

		const handleMouseEnter = () => {
			// mouseIsDown = true;
		};

		const handleMouseLeave = () => {
			// mouseIsDown = false;
		};

		const handleMouseUp = () => {
			mouseIsDown = false;
			resetStyles();
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			this.#target.removeEventListener('mouseenter', handleMouseEnter);
			this.#target.removeEventListener('mouseleave', handleMouseLeave);
		};

		node.addEventListener('dblclick', handleDoubleClick);
		node.addEventListener('mousedown', handleMouseDown);

		return () => {
			if (node instanceof HTMLElement) {
				node.removeEventListener('mousedown', handleMouseDown);
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
				this.#target.removeEventListener('mouseenter', handleMouseEnter);
				this.#target.removeEventListener('mouseleave', handleMouseLeave);
			}
		};
	};
}
