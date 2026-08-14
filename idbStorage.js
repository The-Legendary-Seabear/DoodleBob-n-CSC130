// Simple IndexedDB helper for storing audio blobs under store 'files'
(function(window){
  const DB_NAME = 'DoodleBobDB';
  const STORE_NAME = 'files';
  const DB_VERSION = 1;

  function openDB(){
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function(e){
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
  }

  async function saveBlob(file){
    if (!file) throw new Error('No file');
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const id = 'song-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const entry = { id, name: file.name, blob: file, created: Date.now() };
    return new Promise((resolve, reject) => {
      const req = store.add(entry);
      req.onsuccess = function(){ resolve(id); };
      req.onerror = function(){ reject(req.error); };
    });
  }

  async function getBlob(id){
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = function(){
        const res = req.result;
        if (!res) return resolve(null);
        resolve(res.blob);
      };
      req.onerror = function(){ reject(req.error); };
    });
  }

  async function listBlobs(){
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = function(){
        const results = (req.result || []).map(r => ({ id: r.id, name: r.name, created: r.created, size: r.blob && r.blob.size }));
        resolve(results);
      };
      req.onerror = function(){ reject(req.error); };
    });
  }

  async function deleteBlob(id){
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = function(){ resolve(); };
      req.onerror = function(){ reject(req.error); };
    });
  }

  window.IdbStorage = { saveBlob, getBlob, deleteBlob, listBlobs };
})(window);
