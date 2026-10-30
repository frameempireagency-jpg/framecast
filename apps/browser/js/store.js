const DB_NAME = "framecast";
const DB_VERSION = 1;

let dbPromise;

function db() {
	if (!dbPromise) {
		dbPromise = new Promise((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, DB_VERSION);
			req.onupgradeneeded = () => {
				const d = req.result;
				if (!d.objectStoreNames.contains("recordings")) {
					d.createObjectStore("recordings", { keyPath: "id" });
				}
				if (!d.objectStoreNames.contains("chunks")) {
					d.createObjectStore("chunks", { keyPath: ["id", "seq"] });
				}
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	}
	return dbPromise;
}

function tx(stores, mode, fn) {
	return db().then(
		(d) =>
			new Promise((resolve, reject) => {
				const t = d.transaction(stores, mode);
				const out = fn(t);
				t.oncomplete = () => resolve(out?.result ?? out);
				t.onerror = () => reject(t.error);
				t.onabort = () => reject(t.error);
			}),
	);
}

export function newId() {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function putRecording(rec) {
	return tx(["recordings"], "readwrite", (t) =>
		t.objectStore("recordings").put(rec),
	);
}

export function getRecording(id) {
	return tx(["recordings"], "readonly", (t) =>
		t.objectStore("recordings").get(id),
	);
}

export async function listRecordings() {
	const all = await tx(["recordings"], "readonly", (t) =>
		t.objectStore("recordings").getAll(),
	);
	return all.sort((a, b) => b.createdAt - a.createdAt);
}

export function putChunk(id, seq, blob) {
	return tx(["chunks"], "readwrite", (t) =>
		t.objectStore("chunks").put({ id, seq, blob }),
	);
}

export async function chunkCount(id) {
	const range = IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
	return tx(["chunks"], "readonly", (t) =>
		t.objectStore("chunks").count(range),
	);
}

export async function readVideo(id, mime) {
	const range = IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
	const rows = await tx(["chunks"], "readonly", (t) =>
		t.objectStore("chunks").getAll(range),
	);
	return new Blob(
		rows.sort((a, b) => a.seq - b.seq).map((r) => r.blob),
		{ type: mime },
	);
}

export async function replaceVideo(id, blob) {
	const range = IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
	await tx(["chunks"], "readwrite", (t) => {
		const s = t.objectStore("chunks");
		s.delete(range);
		s.put({ id, seq: 0, blob });
	});
}

export async function deleteRecording(id) {
	const range = IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
	await tx(["recordings", "chunks"], "readwrite", (t) => {
		t.objectStore("recordings").delete(id);
		t.objectStore("chunks").delete(range);
	});
}

export async function recoverInterrupted() {
	const all = await listRecordings();
	const recovered = [];
	for (const rec of all) {
		if (rec.status !== "recording") continue;
		const n = await chunkCount(rec.id);
		if (n === 0) {
			await deleteRecording(rec.id);
			continue;
		}
		rec.status = "recovered";
		rec.duration = rec.duration || n;
		rec.opened = false;
		await putRecording(rec);
		recovered.push(rec);
	}
	return recovered;
}

export async function storageInfo() {
	if (!navigator.storage?.estimate) return null;
	const { quota = 0, usage = 0 } = await navigator.storage.estimate();
	return { free: Math.max(0, quota - usage), usage };
}

export async function askToKeep() {
	if (!navigator.storage?.persist) return false;
	if (await navigator.storage.persisted()) return true;
	return navigator.storage.persist();
}
