import { pickMime } from "./capture.js";
import { drawEndCard, drawIntro, END_CARD_SECONDS } from "./draw.js";

export function loadVideo(blob) {
	const url = URL.createObjectURL(blob);
	const video = document.createElement("video");
	video.preload = "auto";
	video.playsInline = true;
	video.src = url;
	const ready = new Promise((resolve, reject) => {
		video.onloadedmetadata = async () => {
			if (!Number.isFinite(video.duration)) {
				await new Promise((r) => {
					video.ontimeupdate = () => {
						video.ontimeupdate = null;
						r();
					};
					video.currentTime = 1e101;
				});
				video.currentTime = 0;
			}
			resolve(video);
		};
		video.onerror = () =>
			reject(video.error || new Error("This video could not be opened"));
	});
	return { video, url, ready };
}

export function seek(video, t) {
	return new Promise((resolve) => {
		const done = () => {
			video.removeEventListener("seeked", done);
			resolve();
		};
		video.addEventListener("seeked", done);
		video.currentTime = Math.max(0, Math.min(t, video.duration - 0.05));
	});
}

export async function frameAt(video, t, width) {
	await seek(video, t);
	const ratio = video.videoHeight / video.videoWidth || 9 / 16;
	const c = document.createElement("canvas");
	c.width = width;
	c.height = Math.round(width * ratio);
	c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
	return c;
}

export async function thumbnail(blob) {
	const { video, url, ready } = loadVideo(blob);
	try {
		await ready;
		const c = await frameAt(video, Math.min(1, video.duration / 3), 320);
		return await new Promise((r) => c.toBlob(r, "image/jpeg", 0.82));
	} finally {
		URL.revokeObjectURL(url);
	}
}

export async function filmstrip(video, count, width) {
	const out = [];
	for (let i = 0; i < count; i++) {
		const t = (video.duration * (i + 0.5)) / count;
		out.push(await frameAt(video, t, width));
	}
	return out;
}

let iconPromise;
function brandIcon() {
	iconPromise ??= fetch(new URL("../icons/icon-512.png", import.meta.url))
		.then((r) => r.blob())
		.then((b) => createImageBitmap(b))
		.catch(() => null);
	return iconPromise;
}

const pageFont = (weight, px) =>
	`${weight} ${px}px Geist, "Segoe UI", system-ui, sans-serif`;

export async function renderVideo(
	blob,
	{ start, end, forWho = "", endCard = false },
	onProgress,
) {
	const { video, url, ready } = loadVideo(blob);
	await ready;
	const icon = endCard ? await brandIcon() : null;
	const canvas = document.createElement("canvas");
	const even = (n) => Math.max(2, n - (n % 2));
	canvas.width = even(video.videoWidth || 1280);
	canvas.height = even(video.videoHeight || 720);
	const c = canvas.getContext("2d", { alpha: false });
	const audioCtx = new AudioContext();
	const dest = audioCtx.createMediaStreamDestination();
	audioCtx.createMediaElementSource(video).connect(dest);
	const stream = new MediaStream([
		...canvas.captureStream(30).getVideoTracks(),
		...dest.stream.getAudioTracks(),
	]);
	const mime = pickMime();
	const recorder = new MediaRecorder(stream, {
		mimeType: mime || undefined,
		videoBitsPerSecond: 8_000_000,
	});
	const parts = [];
	recorder.ondataavailable = (e) => e.data.size && parts.push(e.data);
	const finished = new Promise((resolve) => {
		recorder.onstop = resolve;
	});
	await seek(video, start);
	const total = end - start + (endCard ? END_CARD_SECONDS : 0);
	const draw = () => {
		c.drawImage(video, 0, 0, canvas.width, canvas.height);
		drawIntro(
			c,
			canvas.width,
			canvas.height,
			forWho,
			video.currentTime - start,
			pageFont,
		);
	};
	draw();
	recorder.start(1000);
	await video.play();
	await new Promise((resolve) => {
		const step = () => {
			if (video.currentTime >= end || video.ended) {
				video.pause();
				return resolve();
			}
			draw();
			onProgress?.(Math.min(1, (video.currentTime - start) / total));
			video.requestVideoFrameCallback(step);
		};
		video.requestVideoFrameCallback(step);
	});
	if (endCard) {
		const t0 = performance.now();
		await new Promise((resolve) => {
			const tick = () => {
				const p = Math.min(
					1,
					(performance.now() - t0) / (END_CARD_SECONDS * 1000),
				);
				drawEndCard(c, canvas.width, canvas.height, forWho, p, icon, pageFont);
				onProgress?.(Math.min(1, (end - start + p * END_CARD_SECONDS) / total));
				if (p >= 1) resolve();
				else setTimeout(tick, 1000 / 30);
			};
			tick();
		});
	}
	recorder.stop();
	await finished;
	audioCtx.close();
	URL.revokeObjectURL(url);
	onProgress?.(1);
	return new Blob(parts, { type: recorder.mimeType || mime });
}

export function fileName(title, mime) {
	const ext = (mime || "").includes("mp4") ? "mp4" : "webm";
	const safe = (title || "FrameCast recording")
		.replace(/[\\/:*?"<>|]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 90);
	return `${safe}.${ext}`;
}

export async function saveFile(blob, name) {
	if ("showSaveFilePicker" in window) {
		try {
			const ext = name.split(".").pop();
			const handle = await window.showSaveFilePicker({
				suggestedName: name,
				types: [
					{
						description: "Video",
						accept: { [blob.type.split(";")[0] || "video/mp4"]: [`.${ext}`] },
					},
				],
			});
			const w = await handle.createWritable();
			await w.write(blob);
			await w.close();
			return "saved";
		} catch (err) {
			if (err?.name === "AbortError") return "cancelled";
		}
	}
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = name;
	document.body.append(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
	return "downloaded";
}

export async function shareFile(blob, name, title) {
	const file = new File([blob], name, { type: blob.type.split(";")[0] });
	if (!navigator.canShare?.({ files: [file] })) return "unsupported";
	try {
		await navigator.share({ files: [file], title });
		return "shared";
	} catch (err) {
		return err?.name === "AbortError" ? "cancelled" : "failed";
	}
}
