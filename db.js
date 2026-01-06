const DB_NAME = 'cricket_pwa_db';
const STORE = 'matches';

function openDB() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () =>
			req.result.createObjectStore(STORE, { keyPath: 'id' });
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export async function saveMatch(match) {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).put(match);
		tx.oncomplete = () => resolve(true);
		tx.onerror = () => reject(tx.error);
	});
}

export async function listMatches() {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readonly');
		const req = tx.objectStore(STORE).getAll();
		req.onsuccess = () =>
			resolve(
				(req.result || []).sort(
					(a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
				)
			);
		req.onerror = () => reject(req.error);
	});
}

export async function loadMatch(id) {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readonly');
		const req = tx.objectStore(STORE).get(id);
		req.onsuccess = () => resolve(req.result || null);
		req.onerror = () => reject(req.error);
	});
}

export async function deleteAllMatches() {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).clear();
		tx.oncomplete = () => resolve(true);
		tx.onerror = () => reject(tx.error);
	});
}
