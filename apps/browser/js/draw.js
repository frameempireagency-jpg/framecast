export function easeOut(t) {
	return 1 - (1 - t) ** 3;
}

export function roundRect(c, x, y, w, h, r) {
	c.beginPath();
	c.moveTo(x + r, y);
	c.arcTo(x + w, y, x + w, y + h, r);
	c.arcTo(x + w, y + h, x, y + h, r);
	c.arcTo(x, y + h, x, y, r);
	c.arcTo(x, y, x + w, y, r);
	c.closePath();
}

export function brandGround(c, w, h) {
	const g = c.createLinearGradient(0, 0, w, h);
	g.addColorStop(0, "#6a2bb3");
	g.addColorStop(0.55, "#521f88");
	g.addColorStop(1, "#26093f");
	c.fillStyle = g;
	c.fillRect(0, 0, w, h);
	const glow = c.createRadialGradient(
		w * 0.22,
		h * 0.18,
		0,
		w * 0.22,
		h * 0.18,
		Math.max(w, h) * 0.6,
	);
	glow.addColorStop(0, "rgba(255,255,255,0.14)");
	glow.addColorStop(1, "rgba(255,255,255,0)");
	c.fillStyle = glow;
	c.fillRect(0, 0, w, h);
}

function unitOf(w, h) {
	return Math.min(w, h) / 1080;
}

export function drawIntro(c, w, h, forWho, seconds, font) {
	if (!forWho || seconds > 3.2 || seconds < 0) return;
	const enter = easeOut(Math.min(1, seconds / 0.5));
	const leave = seconds > 2.6 ? Math.min(1, (seconds - 2.6) / 0.6) : 0;
	const u = unitOf(w, h);
	const label = "A video for";
	c.font = font(600, 54 * u);
	const nameW = c.measureText(forWho).width;
	c.font = font(400, 26 * u);
	const labelW = c.measureText(label).width;
	const bw = Math.min(w - 128 * u, Math.max(nameW, labelW) + 72 * u);
	const bh = 150 * u;
	const x = 64 * u;
	const y = h - bh - 72 * u + (1 - enter) * 30 * u;
	c.save();
	c.globalAlpha = enter * (1 - leave);
	c.shadowColor = "rgba(0, 0, 0, 0.4)";
	c.shadowBlur = 40 * u;
	c.shadowOffsetY = 14 * u;
	roundRect(c, x, y, bw, bh, 20 * u);
	c.fillStyle = "#521f88";
	c.fill();
	c.shadowColor = "transparent";
	c.fillStyle = "#c4a9ec";
	c.font = font(400, 26 * u);
	c.fillText(label, x + 36 * u, y + 54 * u);
	c.fillStyle = "#efe9f8";
	c.font = font(600, 54 * u);
	c.fillText(forWho, x + 36 * u, y + 112 * u, bw - 72 * u);
	c.restore();
}

export function drawEndCard(c, w, h, forWho, progress, icon, font) {
	const u = unitOf(w, h);
	c.save();
	c.globalAlpha = easeOut(Math.min(1, progress / 0.25));
	brandGround(c, w, h);
	const s = 150 * u;
	const top = h / 2 - 170 * u;
	if (icon) c.drawImage(icon, (w - s) / 2, top, s, s);
	c.textAlign = "center";
	c.fillStyle = "#efe9f8";
	c.font = font(600, 64 * u);
	const name = forWho ? forWho.split(",")[0].trim() : "";
	c.fillText(
		name ? `Thanks, ${name}` : "Thanks for watching",
		w / 2,
		top + s + 100 * u,
		w - 80 * u,
	);
	c.fillStyle = "#c4a9ec";
	c.font = font(400, 34 * u);
	c.fillText(
		"Frame Empire  ·  frameempire.co.uk",
		w / 2,
		top + s + 160 * u,
		w - 80 * u,
	);
	c.restore();
}

export const END_CARD_SECONDS = 2.2;
