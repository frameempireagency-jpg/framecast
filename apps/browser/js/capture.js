import { newId, putChunk, putRecording } from "./store.js";

const MIME_CHOICES = [
	"video/mp4;codecs=avc1.640028,mp4a.40.2",
	"video/mp4;codecs=avc1,mp4a",
	"video/mp4",
	"video/webm;codecs=vp9,opus",
	"video/webm;codecs=vp8,opus",
	"video/webm",
];

export function pickMime() {
	if (typeof MediaRecorder === "undefined") return null;
	return MIME_CHOICES.find((m) => MediaRecorder.isTypeSupported(m)) || "";
}

export function canComposite() {
	return (
		typeof MediaStreamTrackProcessor !== "undefined" &&
		typeof MediaStreamTrackGenerator !== "undefined"
	);
}

export function support() {
	return {
		screen:
			!!navigator.mediaDevices?.getDisplayMedia &&
			!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
		camera: !!navigator.mediaDevices?.getUserMedia,
		recorder: typeof MediaRecorder !== "undefined",
		composite: canComposite(),
		floating: "documentPictureInPicture" in window,
		mp4: (pickMime() || "").startsWith("video/mp4"),
		share: !!navigator.canShare,
		saveAs: "showSaveFilePicker" in window,
	};
}

async function iconBitmap() {
	try {
		const res = await fetch("icons/icon-512.png");
		return await createImageBitmap(await res.blob());
	} catch {
		return null;
	}
}

export async function startSession(cfg, hooks) {
	const cameraOnly = cfg.what === "camera";
	const display = cameraOnly
		? null
		: await navigator.mediaDevices.getDisplayMedia({
				video: {
					displaySurface: cfg.what,
					frameRate: { ideal: 30, max: 30 },
					width: { ideal: 1920 },
					height: { ideal: 1080 },
				},
				audio: cfg.system ? { suppressLocalAudioPlayback: false } : false,
				systemAudio: cfg.system ? "include" : "exclude",
				selfBrowserSurface: "exclude",
				surfaceSwitching: "include",
				monitorTypeSurfaces: "include",
			});

	if (cameraOnly && cfg.camTrack?.readyState !== "live")
		throw new Error("The camera is not on. Choose a camera first.");
	const displayVideo = cameraOnly
		? cfg.camTrack.clone()
		: display.getVideoTracks()[0];
	const systemAudio = cameraOnly ? null : display.getAudioTracks()[0] || null;
	const micTrack = cfg.micTrack ? cfg.micTrack.clone() : null;
	const camTrack = !cameraOnly && cfg.camTrack ? cfg.camTrack.clone() : null;
	const notes = [];
	if (!cameraOnly && cfg.system && !systemAudio) notes.push("no-system-audio");

	const studio = cfg.studio && !cameraOnly;
	const needsCompositor = canComposite() && (studio || camTrack || cfg.forWho);
	let worker = null;
	let videoTrack = displayVideo;
	if (needsCompositor) {
		const displayProc = new MediaStreamTrackProcessor({ track: displayVideo });
		const camProc = camTrack
			? new MediaStreamTrackProcessor({ track: camTrack })
			: null;
		const generator = new MediaStreamTrackGenerator({ kind: "video" });
		worker = new Worker(new URL("./compositor-worker.js", import.meta.url), {
			type: "module",
		});
		const icon = cfg.forWho ? await iconBitmap() : null;
		const transfer = [displayProc.readable, generator.writable];
		if (camProc) transfer.push(camProc.readable);
		if (icon) transfer.push(icon);
		worker.postMessage(
			{
				type: "start",
				display: displayProc.readable,
				camera: camProc?.readable || null,
				output: generator.writable,
				icon,
				opts: {
					studio,
					bubble: camTrack ? { corner: cfg.bubbleCorner, size: 0.24 } : null,
					forWho: cfg.forWho || "",
				},
			},
			transfer,
		);
		videoTrack = generator;
	} else if (camTrack) {
		notes.push("no-bubble");
	}

	let audioCtx = null;
	let micGain = null;
	const audioTracks = [];
	if (micTrack || systemAudio) {
		audioCtx = new AudioContext();
		const dest = audioCtx.createMediaStreamDestination();
		if (micTrack) {
			micGain = audioCtx.createGain();
			audioCtx
				.createMediaStreamSource(new MediaStream([micTrack]))
				.connect(micGain)
				.connect(dest);
		}
		if (systemAudio) {
			audioCtx
				.createMediaStreamSource(new MediaStream([systemAudio]))
				.connect(dest);
		}
		audioTracks.push(dest.stream.getAudioTracks()[0]);
	}

	const stream = new MediaStream([videoTrack, ...audioTracks]);
	const mime = pickMime();
	const recorder = new MediaRecorder(stream, {
		mimeType: mime || undefined,
		videoBitsPerSecond: studio ? 8_000_000 : 6_000_000,
		audioBitsPerSecond: 160_000,
	});

	const id = newId();
	const rec = {
		id,
		title: cfg.title,
		forWho: cfg.forWho || "",
		createdAt: Date.now(),
		status: "recording",
		mime: recorder.mimeType || mime || "video/webm",
		duration: 0,
		size: 0,
		opened: false,
		notes,
		cards: needsCompositor && cfg.forWho ? cfg.forWho : "",
	};
	await putRecording(rec);

	let seq = 0;
	let size = 0;
	let pending = Promise.resolve();
	recorder.ondataavailable = (e) => {
		if (!e.data || e.data.size === 0) return;
		size += e.data.size;
		const n = seq++;
		pending = pending
			.then(() => putChunk(id, n, e.data))
			.catch((err) => hooks.onError?.(err));
	};

	let runStart = 0;
	let banked = 0;
	const elapsed = () => banked + (runStart ? performance.now() - runStart : 0);

	let stopping = null;
	const cleanup = () => {
		for (const t of [
			displayVideo,
			systemAudio,
			micTrack,
			camTrack,
			videoTrack,
			...audioTracks,
		])
			t?.stop();
		audioCtx?.close();
		worker?.postMessage({ type: "close" });
	};

	const stop = () => {
		if (stopping) return stopping;
		stopping = (async () => {
			if (recorder.state === "paused") recorder.resume();
			if (worker && cfg.forWho) {
				await new Promise((resolve) => {
					const onMsg = (e) => {
						if (e.data.type === "ended") {
							worker.removeEventListener("message", onMsg);
							resolve();
						}
					};
					worker.addEventListener("message", onMsg);
					worker.postMessage({ type: "end", endCard: true });
				});
			}
			const done = new Promise((resolve) => {
				recorder.onstop = resolve;
			});
			if (recorder.state !== "inactive") recorder.stop();
			await done;
			await pending;
			const duration = elapsed() / 1000 + (worker && cfg.forWho ? 2.2 : 0);
			runStart = 0;
			cleanup();
			const finished = {
				...rec,
				status: "done",
				duration,
				size,
				opened: false,
			};
			await putRecording(finished);
			return finished;
		})();
		return stopping;
	};

	displayVideo.addEventListener("ended", () => hooks.onSourceEnded?.());
	worker?.addEventListener("message", (e) => {
		if (e.data.type === "display-ended") hooks.onSourceEnded?.();
	});

	return {
		id,
		notes,
		hasSystemAudio: !!systemAudio,
		hasMic: !!micTrack,
		elapsed,
		begin() {
			worker?.postMessage({ type: "begin" });
			recorder.start(1000);
			runStart = performance.now();
		},
		get state() {
			return recorder.state;
		},
		pause() {
			if (recorder.state !== "recording") return;
			recorder.pause();
			banked = elapsed();
			runStart = 0;
		},
		resume() {
			if (recorder.state !== "paused") return;
			recorder.resume();
			runStart = performance.now();
		},
		setMuted(muted) {
			if (micGain) micGain.gain.value = muted ? 0 : 1;
		},
		cancel: async () => {
			recorder.ondataavailable = null;
			if (recorder.state !== "inactive") recorder.stop();
			cleanup();
		},
		stop,
	};
}

export async function listDevices() {
	const all = await navigator.mediaDevices.enumerateDevices();
	return {
		mics: all.filter(
			(d) => d.kind === "audioinput" && d.deviceId !== "communications",
		),
		cams: all.filter((d) => d.kind === "videoinput"),
	};
}

function ask(constraints, ms) {
	return new Promise((resolve, reject) => {
		let late = false;
		const timer = setTimeout(() => {
			late = true;
			reject(new Error("The device did not answer"));
		}, ms);
		navigator.mediaDevices.getUserMedia(constraints).then(
			(stream) => {
				clearTimeout(timer);
				if (late) {
					for (const t of stream.getTracks()) t.stop();
				} else {
					resolve(stream);
				}
			},
			(err) => {
				clearTimeout(timer);
				reject(err);
			},
		);
	});
}

async function request(preferred, fallback) {
	try {
		return await ask(preferred, 8000);
	} catch (err) {
		if (err?.name === "NotAllowedError") throw err;
		return ask(fallback, 8000);
	}
}

export async function openMic(deviceId) {
	const s = await request(
		{
			audio: {
				deviceId: deviceId ? { exact: deviceId } : undefined,
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true,
			},
		},
		{ audio: true },
	);
	return s.getAudioTracks()[0];
}

export async function openCamera(deviceId) {
	const s = await request(
		{
			video: {
				deviceId: deviceId ? { exact: deviceId } : undefined,
				width: { ideal: 1280 },
				height: { ideal: 720 },
				frameRate: { ideal: 30 },
			},
		},
		{ video: true },
	);
	return s.getVideoTracks()[0];
}

export function meter(track, onLevel) {
	const ctx = new AudioContext();
	const src = ctx.createMediaStreamSource(new MediaStream([track]));
	const an = ctx.createAnalyser();
	an.fftSize = 512;
	src.connect(an);
	const buf = new Float32Array(an.fftSize);
	let raf = 0;
	const loop = () => {
		an.getFloatTimeDomainData(buf);
		let sum = 0;
		for (const v of buf) sum += v * v;
		onLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
		raf = requestAnimationFrame(loop);
	};
	loop();
	return () => {
		cancelAnimationFrame(raf);
		ctx.close();
	};
}
