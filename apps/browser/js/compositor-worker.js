import {
	brandGround,
	drawEndCard,
	drawIntro,
	END_CARD_SECONDS,
	roundRect,
} from "./draw.js";

const STUDIO_W = 1920;
const STUDIO_H = 1080;
const FPS_GAP = 1000 / 30;

let canvas;
let ctx;
let writer;
let opts = {};
let screenFrame = null;
let camFrame = null;
let icon = null;
let lastDraw = 0;
let startedAt = 0;
let ended = false;
let fontReady = false;

Promise.all(
	[
		new FontFace("Geist", "url(../fonts/geist-sans-latin-400-normal.woff2)", {
			weight: "400",
		}),
		new FontFace("Geist", "url(../fonts/geist-sans-latin-600-normal.woff2)", {
			weight: "600",
		}),
	].map((f) =>
		f
			.load()
			.then((loaded) => self.fonts.add(loaded))
			.catch(() => {}),
	),
).then(() => {
	fontReady = true;
});

const font = (weight, px) =>
	`${weight} ${px}px ${fontReady ? "Geist" : "sans-serif"}`;

function ensureSize(w, h) {
	if (canvas.width !== w || canvas.height !== h) {
		canvas.width = w;
		canvas.height = h;
	}
}

function drawScreen() {
	const sw = screenFrame.displayWidth;
	const sh = screenFrame.displayHeight;
	if (opts.studio) {
		ensureSize(STUDIO_W, STUDIO_H);
		brandGround(ctx, STUDIO_W, STUDIO_H);
		const pad = STUDIO_H * 0.07;
		const scale = Math.min(
			(STUDIO_W - pad * 2) / sw,
			(STUDIO_H - pad * 2) / sh,
		);
		const w = sw * scale;
		const h = sh * scale;
		const x = (STUDIO_W - w) / 2;
		const y = (STUDIO_H - h) / 2;
		const r = Math.min(22, h * 0.03);
		ctx.save();
		ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
		ctx.shadowBlur = 60;
		ctx.shadowOffsetY = 24;
		roundRect(ctx, x, y, w, h, r);
		ctx.fillStyle = "#0c0a0c";
		ctx.fill();
		ctx.restore();
		ctx.save();
		roundRect(ctx, x, y, w, h, r);
		ctx.clip();
		ctx.drawImage(screenFrame, x, y, w, h);
		ctx.restore();
	} else {
		const even = (n) => Math.max(2, n - (n % 2));
		ensureSize(even(sw), even(sh));
		ctx.drawImage(screenFrame, 0, 0, canvas.width, canvas.height);
	}
}

function drawBubble() {
	if (!camFrame || !opts.bubble) return;
	const W = canvas.width;
	const H = canvas.height;
	const d = Math.round(Math.min(W, H) * (opts.bubble.size || 0.24));
	const m = Math.round(Math.min(W, H) * 0.035);
	const corner = opts.bubble.corner || "br";
	const x = corner.includes("r") ? W - d - m : m;
	const y = corner.includes("b") ? H - d - m : m;
	const cw = camFrame.displayWidth;
	const ch = camFrame.displayHeight;
	const side = Math.min(cw, ch);
	ctx.save();
	ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
	ctx.shadowBlur = d * 0.12;
	ctx.shadowOffsetY = d * 0.05;
	ctx.beginPath();
	ctx.arc(x + d / 2, y + d / 2, d / 2 + 4, 0, Math.PI * 2);
	ctx.fillStyle = "#efe9f8";
	ctx.fill();
	ctx.restore();
	ctx.save();
	ctx.beginPath();
	ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
	ctx.clip();
	ctx.translate(x + d, y);
	ctx.scale(-1, 1);
	ctx.drawImage(
		camFrame,
		(cw - side) / 2,
		(ch - side) / 2,
		side,
		side,
		0,
		0,
		d,
		d,
	);
	ctx.restore();
}

async function emit() {
	const frame = new VideoFrame(canvas, {
		timestamp: Math.round(performance.now() * 1000),
	});
	try {
		await writer.write(frame);
	} catch {
		frame.close();
	}
}

async function render() {
	if (ended || !writer || !screenFrame) return;
	const now = performance.now();
	if (now - lastDraw < FPS_GAP) return;
	lastDraw = now;
	if (!startedAt) startedAt = now;
	drawScreen();
	drawBubble();
	drawIntro(
		ctx,
		canvas.width,
		canvas.height,
		opts.forWho,
		(now - startedAt) / 1000,
		font,
	);
	await emit();
}

async function pump(readable, onFrame) {
	const reader = readable.getReader();
	for (;;) {
		const { value, done } = await reader.read();
		if (done) return;
		onFrame(value);
	}
}

function playEndCard() {
	ended = true;
	const total = END_CARD_SECONDS * 1000;
	const t0 = performance.now();
	return new Promise((resolve) => {
		const tick = async () => {
			const p = Math.min(1, (performance.now() - t0) / total);
			drawEndCard(ctx, canvas.width, canvas.height, opts.forWho, p, icon, font);
			await emit();
			if (p >= 1) resolve();
			else setTimeout(tick, FPS_GAP);
		};
		tick();
	});
}

self.onmessage = async (e) => {
	const msg = e.data;
	if (msg.type === "start") {
		opts = msg.opts;
		icon = msg.icon || null;
		canvas = new OffscreenCanvas(STUDIO_W, STUDIO_H);
		ctx = canvas.getContext("2d", { alpha: false });
		writer = msg.output.getWriter();
		if (msg.camera) {
			pump(msg.camera, (f) => {
				camFrame?.close();
				camFrame = f;
				render();
			}).catch(() => {});
		}
		pump(msg.display, (f) => {
			screenFrame?.close();
			screenFrame = f;
			render();
		})
			.catch(() => {})
			.finally(() => self.postMessage({ type: "display-ended" }));
	} else if (msg.type === "begin") {
		startedAt = performance.now();
	} else if (msg.type === "end") {
		if (msg.endCard && canvas && screenFrame) await playEndCard();
		ended = true;
		self.postMessage({ type: "ended" });
	} else if (msg.type === "close") {
		screenFrame?.close();
		camFrame?.close();
		try {
			await writer?.close();
		} catch {}
		self.close();
	}
};
