"use client";

export type BackgroundMode =
	| { type: "none" }
	| { type: "blur"; amount?: number }
	| { type: "color"; color: string }
	| { type: "image"; url: string };

const MP_VERSION = "0.10.18";
const TASKS_VISION_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.mjs`;
const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODEL_URL =
	"https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

type ImageSegmenterModule = {
	ImageSegmenter: {
		createFromOptions: (
			vision: unknown,
			options: Record<string, unknown>,
		) => Promise<{
			segmentForVideo: (
				image: HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
				timestampMs: number,
				callback: (result: {
					categoryMask?: {
						getAsUint8Array(): Uint8Array;
						width: number;
						height: number;
						close(): void;
					};
					confidenceMasks?: Array<{
						getAsFloat32Array(): Float32Array;
						width: number;
						height: number;
						close(): void;
					}>;
					close?: () => void;
				}) => void,
			) => void;
			close(): void;
		}>;
	};
	FilesetResolver: {
		forVisionTasks: (path: string) => Promise<unknown>;
	};
};

let modulePromise: Promise<ImageSegmenterModule> | null = null;

async function loadMediapipe(): Promise<ImageSegmenterModule> {
	if (modulePromise) return modulePromise;
	modulePromise = import(/* webpackIgnore: true */ TASKS_VISION_URL).then(
		(mod) => mod as ImageSegmenterModule,
	);
	return modulePromise;
}

type ImageSegmenterInstance = Awaited<
	ReturnType<ImageSegmenterModule["ImageSegmenter"]["createFromOptions"]>
>;

let segmenterPromise: Promise<ImageSegmenterInstance> | null = null;

async function getSegmenter(): Promise<ImageSegmenterInstance> {
	if (segmenterPromise) return segmenterPromise;
	segmenterPromise = (async () => {
		const mp = await loadMediapipe();
		const vision = await mp.FilesetResolver.forVisionTasks(WASM_BASE_URL);
		return mp.ImageSegmenter.createFromOptions(vision, {
			baseOptions: {
				modelAssetPath: MODEL_URL,
				delegate: "GPU",
			},
			runningMode: "VIDEO",
			outputCategoryMask: false,
			outputConfidenceMasks: true,
		});
	})();
	return segmenterPromise;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(url: string): Promise<HTMLImageElement> {
	const existing = imageCache.get(url);
	if (existing) return existing;
	const promise = new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
		img.src = url;
	});
	imageCache.set(url, promise);
	return promise;
}

export interface BackgroundProcessor {
	outputStream: MediaStream;
	setMode: (mode: BackgroundMode) => void;
	stop: () => void;
}

export async function createBackgroundProcessor(
	sourceStream: MediaStream,
	initialMode: BackgroundMode,
): Promise<BackgroundProcessor> {
	const videoTrack = sourceStream.getVideoTracks()[0];
	if (!videoTrack) {
		throw new Error("source stream has no video track");
	}
	const settings = videoTrack.getSettings();
	const width = settings.width ?? 1280;
	const height = settings.height ?? 720;
	const frameRate = settings.frameRate ?? 30;

	const sourceVideo = document.createElement("video");
	sourceVideo.muted = true;
	sourceVideo.playsInline = true;
	sourceVideo.autoplay = true;
	sourceVideo.srcObject = sourceStream;
	await sourceVideo.play().catch(() => {});

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d", { willReadFrequently: false });
	if (!ctx) throw new Error("2d canvas context unavailable");

	const maskCanvas = document.createElement("canvas");
	maskCanvas.width = width;
	maskCanvas.height = height;
	const maskCtx = maskCanvas.getContext("2d");
	if (!maskCtx) throw new Error("mask canvas context unavailable");

	let mode: BackgroundMode = initialMode;
	let stopped = false;
	let segmenter: ImageSegmenterInstance | null = null;

	if (initialMode.type !== "none") {
		try {
			segmenter = await getSegmenter();
		} catch (err) {
			console.warn(
				"MediaPipe segmenter failed to load; falling back to passthrough",
				err,
			);
		}
	}

	const drawBackground = async () => {
		if (mode.type === "blur") {
			const radius = mode.amount ?? 18;
			ctx.save();
			ctx.filter = `blur(${radius}px)`;
			ctx.drawImage(sourceVideo, 0, 0, width, height);
			ctx.restore();
		} else if (mode.type === "color") {
			ctx.fillStyle = mode.color;
			ctx.fillRect(0, 0, width, height);
		} else if (mode.type === "image") {
			try {
				const img = await loadImage(mode.url);
				const scale = Math.max(width / img.width, height / img.height);
				const drawW = img.width * scale;
				const drawH = img.height * scale;
				const dx = (width - drawW) / 2;
				const dy = (height - drawH) / 2;
				ctx.drawImage(img, dx, dy, drawW, drawH);
			} catch (err) {
				console.warn("background image failed, using black", err);
				ctx.fillStyle = "#000";
				ctx.fillRect(0, 0, width, height);
			}
		}
	};

	const personLayer = document.createElement("canvas");
	personLayer.width = width;
	personLayer.height = height;
	const pCtx = personLayer.getContext("2d");

	const renderFrame = async () => {
		if (stopped) return;
		try {
			if (mode.type === "none" || !segmenter || !pCtx) {
				ctx.drawImage(sourceVideo, 0, 0, width, height);
			} else {
				await drawBackground();
				await new Promise<void>((resolve) => {
					segmenter?.segmentForVideo(sourceVideo, performance.now(), (res) => {
						try {
							const conf = res.confidenceMasks?.[0];
							if (!conf) {
								ctx.drawImage(sourceVideo, 0, 0, width, height);
								return;
							}
							const data = conf.getAsFloat32Array();
							const maskW = conf.width;
							const maskH = conf.height;

							const personMask = maskCtx.createImageData(maskW, maskH);
							for (let i = 0; i < data.length; i++) {
								const personProb = data[i] ?? 0;
								const adjusted =
									personProb < 0.3
										? 0
										: personProb > 0.7
											? 1
											: (personProb - 0.3) / 0.4;
								const off = i * 4;
								personMask.data[off] = 255;
								personMask.data[off + 1] = 255;
								personMask.data[off + 2] = 255;
								personMask.data[off + 3] = Math.round(adjusted * 255);
							}
							maskCanvas.width = maskW;
							maskCanvas.height = maskH;
							maskCtx.putImageData(personMask, 0, 0);

							pCtx.clearRect(0, 0, width, height);
							pCtx.drawImage(sourceVideo, 0, 0, width, height);
							pCtx.save();
							pCtx.globalCompositeOperation = "destination-in";
							pCtx.filter = "blur(2.5px)";
							pCtx.drawImage(maskCanvas, 0, 0, width, height);
							pCtx.restore();

							ctx.drawImage(personLayer, 0, 0);
						} finally {
							res.confidenceMasks?.forEach((m) => {
								m.close();
							});
							resolve();
						}
					});
				});
			}
		} catch (err) {
			console.warn("frame render error", err);
			try {
				ctx.drawImage(sourceVideo, 0, 0, width, height);
			} catch {}
		}
		if (!stopped) {
			setTimeout(() => {
				if (!stopped) renderFrame();
			}, 1000 / 30);
		}
	};

	renderFrame();

	const captureStream = (
		canvas as HTMLCanvasElement & {
			captureStream: (frameRate: number) => MediaStream;
		}
	).captureStream(frameRate);

	const audioTracks = sourceStream.getAudioTracks();
	for (const t of audioTracks) {
		captureStream.addTrack(t);
	}

	return {
		outputStream: captureStream,
		setMode: (next) => {
			mode = next;
			if (next.type !== "none" && !segmenter) {
				getSegmenter()
					.then((s) => {
						segmenter = s;
					})
					.catch(() => {});
			}
		},
		stop: () => {
			stopped = true;
			sourceVideo.srcObject = null;
			captureStream.getVideoTracks().forEach((t) => {
				t.stop();
			});
			if (segmenter) {
				try {
					segmenter.close();
				} catch {}
			}
		},
	};
}
