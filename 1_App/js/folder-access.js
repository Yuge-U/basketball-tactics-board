// ブラウザーのフォルダアクセスを管理します。
window.PlayFolderAccess = (() => {
  let rootHandle = null;
  const DB_NAME = "basketball-tactics-board-v20";
  const STORE_NAME = "handles";
  function supported(){ return typeof window.showDirectoryPicker === "function"; }
  function openDb(){ return new Promise((resolve,reject)=>{ const req=indexedDB.open(DB_NAME,1); req.onupgradeneeded=()=>req.result.createObjectStore(STORE_NAME); req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); }); }
  async function remember(handle){ const db=await openDb(); return new Promise((resolve,reject)=>{ const tx=db.transaction(STORE_NAME,"readwrite"); tx.objectStore(STORE_NAME).put(handle,"play-root"); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); }); }
  async function restore(){ if(!supported()) return null; try{ const db=await openDb(); const handle=await new Promise((resolve,reject)=>{ const tx=db.transaction(STORE_NAME,"readonly"); const req=tx.objectStore(STORE_NAME).get("play-root"); req.onsuccess=()=>resolve(req.result||null); req.onerror=()=>reject(req.error); }); if(handle){ const p=await handle.queryPermission({mode:"readwrite"}); if(p==="granted") rootHandle=handle; } return rootHandle; }catch{return null;} }
  async function choose(){ if(!supported()) throw new Error("このブラウザーはフォルダ直接保存に対応していません。iPadではJSON保存・JSON読込を利用してください。"); rootHandle=await window.showDirectoryPicker({mode:"readwrite"}); const p=await rootHandle.requestPermission({mode:"readwrite"}); if(p!=="granted") throw new Error("フォルダへの書込みが許可されませんでした。"); await remember(rootHandle); return rootHandle; }
  async function ensure(){ if(rootHandle) return rootHandle; await restore(); return rootHandle; }
  async function getDir(path,create=false){ let dir=await ensure(); if(!dir) throw new Error("保存フォルダが選択されていません。"); for(const part of String(path||"").split("/").filter(Boolean)){ dir=await dir.getDirectoryHandle(part,{create}); } return dir; }
  function safeName(name){ return String(name||"名称未設定の作戦").replace(/[\\/:*?"<>|]/g,"_").trim().replace(/[. ]+$/g,"")||"名称未設定の作戦"; }
  async function save(folder,name,data){ const dir=await getDir(folder,true); const fh=await dir.getFileHandle(`${safeName(name)}.json`,{create:true}); const w=await fh.createWritable(); await w.write(JSON.stringify(data,null,2)); await w.close(); return `${folder}/${safeName(name)}.json`; }
  async function walk(dir,prefix=""){ const items=[]; for await(const [name,handle] of dir.entries()){ const rel=prefix?`${prefix}/${name}`:name; if(handle.kind==="directory") items.push(...await walk(handle,rel)); else if(name.toLowerCase().endsWith(".json")){ try{ const file=await handle.getFile(); const data=JSON.parse(await file.text()); const snap=data.snapshot||data; items.push({name:snap.playName||name.replace(/\.json$/i,""),relativePath:rel,updatedAt:new Date(file.lastModified).toISOString(),stepCount:Array.isArray(snap.steps)?snap.steps.length:0,tags:Array.isArray(snap.libraryMeta?.tags)?snap.libraryMeta.tags:[],favorite:Boolean(snap.libraryMeta?.favorite),source:"browser-folder",handle}); }catch{} } } return items.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))); }
  async function list(){ const root=await ensure(); return root?walk(root):[]; }
  async function load(item){ const file=await item.handle.getFile(); return JSON.parse(await file.text()); }
  async function remove(item){ const parts=item.relativePath.split("/"); const file=parts.pop(); const dir=await getDir(parts.join("/")); await dir.removeEntry(file); }
  return {supported,restore,choose,save,list,load,remove,hasHandle:()=>Boolean(rootHandle)};
})();
