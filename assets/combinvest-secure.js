/* =============================================================================
 * combinvest-secure.js  —  Gemeinsame Sicherheits- & Speicherschicht
 * -----------------------------------------------------------------------------
 * Zweck: Alle personenbezogenen Daten (Profil, Budget, Verträge, Notizen)
 * werden VERSCHLÜSSELT im Browser gespeichert — nicht mehr als Klartext in
 * localStorage. Schlüssel: AES-GCM-256, nicht-extrahierbar, in IndexedDB.
 *
 * Nutzung (Claude UND Codex verwenden dieselbe API):
 *
 *   <script src="assets/combinvest-secure.js"></script>
 *   ...
 *   (async function(){
 *     await Combinvest.ready;                        // einmalig warten
 *     var profile = Combinvest.store.get(KEY);       // entschlüsselt (sync)
 *     Combinvest.store.set(KEY, JSON.stringify(obj));// verschlüsselt (persist)
 *     Combinvest.store.remove(KEY);
 *     Combinvest.store.clearAll();                   // alle PII löschen
 *   })();
 *
 * Threat-Model & Grenzen: siehe SECURITY.md. Dies ist eine Client-only-App
 * ohne Backend — die Verschlüsselung schützt Daten im Ruhezustand (z. B. vor
 * einfachem localStorage-Auslesen) und den Schlüssel vor Extraktion. Gegen
 * XSS schützt zusätzlich die Content-Security-Policy in jedem <head>.
 * ========================================================================== */
(function (global) {
  "use strict";

  var NS = "combinvest";
  var BLOB_KEY = NS + ".secure.v1";        // einziger (verschlüsselter) LS-Eintrag
  var IDB_NAME = NS + "-secure";
  var IDB_STORE = "keys";
  var KEY_ID = "master-aes-gcm";
  var TTL_DAYS = 90;                        // Profil nach 90 Tagen Inaktivität löschen
  var LEGACY_KEYS = [                       // Klartext-Altbestände -> migrieren & löschen
    "combinvest.customerProfile.v1",
    "combinvest.budget.v1",
    "cominvest-analysis",
    "kf_budget"
  ];

  var cache = {};          // key -> string  (entschlüsselt, im Speicher)
  var cryptoKey = null;    // CryptoKey (nicht-extrahierbar)
  var writeTimer = null;
  var degraded = false;    // true = kein WebCrypto/IndexedDB -> Klartext-Fallback

  var hasCrypto = !!(global.crypto && global.crypto.subtle && global.indexedDB);

  /* ---------- Base64 <-> ArrayBuffer ---------- */
  function bufToB64(buf) {
    var bytes = new Uint8Array(buf), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64ToBuf(b64) {
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  /* ---------- IndexedDB: Schlüssel dauerhaft, aber nicht-extrahierbar ---------- */
  function idbOpen() {
    return new Promise(function (res, rej) {
      var req = global.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(IDB_STORE); };
      req.onsuccess = function () { res(req.result); };
      req.onerror = function () { rej(req.error); };
    });
  }
  function idbGet(db, id) {
    return new Promise(function (res, rej) {
      var tx = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(id);
      tx.onsuccess = function () { res(tx.result); };
      tx.onerror = function () { rej(tx.error); };
    });
  }
  function idbPut(db, id, val) {
    return new Promise(function (res, rej) {
      var tx = db.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).put(val, id);
      tx.onsuccess = function () { res(); };
      tx.onerror = function () { rej(tx.error); };
    });
  }

  function getOrCreateKey() {
    var db;
    return idbOpen().then(function (d) {
      db = d;
      return idbGet(db, KEY_ID);
    }).then(function (existing) {
      if (existing) return existing;              // CryptoKey ist strukturell klonbar
      return global.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,                                     // extractable = false
        ["encrypt", "decrypt"]
      ).then(function (k) {
        return idbPut(db, KEY_ID, k).then(function () { return k; });
      });
    });
  }

  /* ---------- Verschlüsseln / Entschlüsseln des gesamten Cache-Objekts ---------- */
  function encryptCache() {
    var payload = JSON.stringify({ v: 1, t: Date.now(), data: cache });
    var iv = global.crypto.getRandomValues(new Uint8Array(12));
    var enc = new TextEncoder().encode(payload);
    return global.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, cryptoKey, enc)
      .then(function (ct) {
        return JSON.stringify({ iv: bufToB64(iv), ct: bufToB64(ct) });
      });
  }
  function decryptBlob(blobStr) {
    var obj;
    try { obj = JSON.parse(blobStr); } catch (e) { return Promise.resolve(null); }
    if (!obj || !obj.iv || !obj.ct) return Promise.resolve(null);
    return global.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(b64ToBuf(obj.iv)) },
      cryptoKey,
      b64ToBuf(obj.ct)
    ).then(function (pt) {
      try { return JSON.parse(new TextDecoder().decode(pt)); }
      catch (e) { return null; }
    }).catch(function () { return null; });   // falscher Schlüssel / manipuliert
  }

  /* ---------- Legacy-Klartext migrieren und aus localStorage entfernen ---------- */
  function migrateLegacy() {
    var migrated = false;
    LEGACY_KEYS.forEach(function (k) {
      try {
        var v = global.localStorage.getItem(k);
        if (v != null) {
          if (!(k in cache)) cache[k] = v;
          global.localStorage.removeItem(k);   // Klartext entfernen
          migrated = true;
        }
      } catch (e) {}
    });
    return migrated;
  }

  /* ---------- TTL: abgelaufene Daten verwerfen ---------- */
  function enforceTtl(meta) {
    if (!meta || !meta.t) return false;
    var age = Date.now() - meta.t;
    if (age > TTL_DAYS * 864e5) { cache = {}; return true; }
    return false;
  }

  function scheduleWrite() {
    if (degraded) { persistPlain(); return; }
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(function () {
      encryptCache().then(function (blob) {
        try { global.localStorage.setItem(BLOB_KEY, blob); } catch (e) {}
      }).catch(function () {});
    }, 120);
  }
  function persistPlain() {
    /* Fallback für Uralt-Browser ohne WebCrypto: wenigstens gebündelt speichern */
    try { global.localStorage.setItem(BLOB_KEY, JSON.stringify({ plain: cache })); } catch (e) {}
  }

  /* ---------- Öffentliche, synchrone API (nach `ready`) ---------- */
  var store = {
    get: function (k) { return (k in cache) ? cache[k] : null; },
    set: function (k, v) { cache[k] = String(v); scheduleWrite(); },
    remove: function (k) { delete cache[k]; scheduleWrite(); },
    keys: function () { return Object.keys(cache); },
    clearAll: function () {
      cache = {};
      if (writeTimer) clearTimeout(writeTimer);
      try { global.localStorage.removeItem(BLOB_KEY); } catch (e) {}
      LEGACY_KEYS.forEach(function (k) { try { global.localStorage.removeItem(k); } catch (e) {} });
    }
  };

  /* ---------- Bootstrap ---------- */
  function boot() {
    if (!hasCrypto) {
      degraded = true;
      try {
        var raw = global.localStorage.getItem(BLOB_KEY);
        if (raw) { var o = JSON.parse(raw); if (o && o.plain) cache = o.plain; }
      } catch (e) {}
      migrateLegacy();
      persistPlain();
      return Promise.resolve();
    }
    return getOrCreateKey().then(function (k) {
      cryptoKey = k;
      var blob = null;
      try { blob = global.localStorage.getItem(BLOB_KEY); } catch (e) {}
      if (!blob) return null;
      return decryptBlob(blob);
    }).then(function (payload) {
      if (payload && payload.data) {
        cache = payload.data;
        enforceTtl(payload);
      }
      var didMigrate = migrateLegacy();
      if (didMigrate || (payload && payload.data)) scheduleWrite();
    }).catch(function (err) {
      /* Krypto-Fehler -> sicherer Zustand: nichts entschlüsselbar, neu beginnen */
      cache = {};
      if (global.console && console.warn) console.warn("[combinvest-secure] init fallback:", err && err.message);
    });
  }

  var ready = boot();

  global.Combinvest = global.Combinvest || {};
  global.Combinvest.ready = ready;
  global.Combinvest.store = store;
  global.Combinvest.secure = {
    encrypted: !degraded,
    ttlDays: TTL_DAYS,
    version: 1
  };

})(typeof window !== "undefined" ? window : this);
