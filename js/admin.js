/**
 * Local admin tool for managing js/site.js, js/projects.js, and js/experience.js.
 *
 * Uses the File System Access API to read/write files directly in the
 * project folder you select — nothing is uploaded anywhere. Chrome/Edge only.
 */

const DB_NAME = "portfolio-admin";
const STORE_NAME = "handles";

let rootHandle = null;
let savedHandle = null;
let projectsCache = [];
let experienceCache = [];
let siteCache = {};
let statusTimer = null;

const SITE_HEADER = `/**
 * Site-wide info: hero name/bio/photo, resume + LinkedIn links, footer contact.
 * Edit here by hand, or use admin.html.
 */
`;

const PROJECTS_HEADER = `/**
 * Project data.
 *
 * To add a new project, use admin.html, or copy the object shape below,
 * give it a unique \`id\`, fill in the fields, and drop your files into the
 * matching folders. See README.md for the full walkthrough.
 */
`;

const EXPERIENCE_HEADER = `/**
 * Work / experience data — internships, clubs, research, leadership roles.
 * Use admin.html, or copy an entry below by hand. Newest first.
 */
`;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  if (!("showDirectoryPicker" in window)) {
    document.getElementById("unsupported-banner").hidden = false;
    document.getElementById("connect-btn").disabled = true;
    return;
  }

  document.getElementById("connect-btn").addEventListener("click", onConnectClick);
  document.getElementById("edit-site-btn").addEventListener("click", () => openSiteForm());
  document.getElementById("new-project-btn").addEventListener("click", () => openProjectForm(null));
  document.getElementById("new-experience-btn").addEventListener("click", () => openExperienceForm(null));
  document.getElementById("add-bullet-btn").addEventListener("click", () => addBulletRow(""));
  document.getElementById("show-model-checkbox").addEventListener("change", (e) => {
    document.getElementById("model-fields").hidden = !e.target.checked;
  });
  document.getElementById("site-form").addEventListener("submit", handleSiteFormSubmit);
  document.getElementById("project-form").addEventListener("submit", handleProjectFormSubmit);
  document.getElementById("experience-form").addEventListener("submit", handleExperienceFormSubmit);

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("site-modal").hidden = true;
      document.getElementById("project-modal").hidden = true;
      document.getElementById("experience-modal").hidden = true;
    });
  });

  wireFileNotePreview("site-form", "headshot", "headshot-file-note", false);
  wireFileNotePreview("site-form", "resume", "resume-file-note", false);
  wireImagesFilePreview();
  wireFileNotePreview("project-form", "stl", "stl-file-note", false);

  document.querySelectorAll(".format-btn[data-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      wrapFieldSelection(document.getElementById(btn.dataset.target), btn.dataset.wrap);
    });
  });
  document.getElementById("bullets-list").addEventListener("click", (e) => {
    const btn = e.target.closest(".format-btn");
    if (!btn) return;
    wrapFieldSelection(btn.closest(".bullet-row").querySelector("input"), btn.dataset.wrap);
  });

  await tryRestoreSavedFolder();
}

/* ---------------- IndexedDB handle persistence ---------------- */

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------------- Connecting to the project folder ---------------- */

async function tryRestoreSavedFolder() {
  const handle = await idbGet("projectRoot").catch(() => null);
  if (!handle) return;
  savedHandle = handle;
  const granted = await handle.queryPermission({ mode: "readwrite" }).catch(() => "denied");
  if (granted === "granted") {
    rootHandle = handle;
    await connectSucceeded();
  } else {
    setConnStatus(`Folder "${handle.name}" needs permission again — click Connect.`, false);
  }
}

async function onConnectClick() {
  if (savedHandle && rootHandle !== savedHandle) {
    const granted = await savedHandle.requestPermission({ mode: "readwrite" }).catch(() => "denied");
    if (granted === "granted") {
      rootHandle = savedHandle;
      await connectSucceeded();
      return;
    }
  }
  try {
    const handle = await window.showDirectoryPicker();
    let looksRight = true;
    try {
      await handle.getFileHandle("index.html");
      await handle.getDirectoryHandle("js");
    } catch {
      looksRight = false;
    }
    if (!looksRight) {
      setStatus('That folder doesn\'t look like the portfolio root (no index.html / js folder found). Pick the folder that directly contains index.html.', true);
      return;
    }
    rootHandle = handle;
    savedHandle = handle;
    await idbSet("projectRoot", handle);
    await connectSucceeded();
  } catch (err) {
    if (err.name !== "AbortError") setStatus("Couldn't open folder: " + err.message, true);
  }
}

async function connectSucceeded() {
  setConnStatus(`Connected: ${rootHandle.name}`, true);
  document.getElementById("connect-btn").textContent = "Change Folder";
  document.getElementById("admin-main").hidden = false;
  setStatus(`Connected to "${rootHandle.name}".`);
  await refreshAll();
}

function setConnStatus(text, connected) {
  const el = document.getElementById("connection-status");
  el.textContent = text;
  el.classList.toggle("conn-status--connected", connected);
  el.classList.toggle("conn-status--disconnected", !connected);
}

function setStatus(message, isError = false) {
  const el = document.getElementById("status-banner");
  el.textContent = message;
  el.hidden = false;
  el.classList.toggle("status-banner--error", isError);
  clearTimeout(statusTimer);
  if (!isError) {
    statusTimer = setTimeout(() => { el.hidden = true; }, 4000);
  }
}

/* ---------------- Filesystem helpers ---------------- */

async function getDir(pathParts, { create = false } = {}) {
  let dir = rootHandle;
  for (const part of pathParts) {
    dir = await dir.getDirectoryHandle(part, { create });
  }
  return dir;
}

async function readTextFile(path) {
  const parts = path.split("/");
  const filename = parts.pop();
  const dir = await getDir(parts);
  const fh = await dir.getFileHandle(filename);
  const file = await fh.getFile();
  return file.text();
}

async function writeTextFile(path, content) {
  const parts = path.split("/");
  const filename = parts.pop();
  const dir = await getDir(parts, { create: true });
  const fh = await dir.getFileHandle(filename, { create: true });
  const writable = await fh.createWritable();
  await writable.write(content);
  await writable.close();
}

async function writeBinaryFile(path, file) {
  const parts = path.split("/");
  const filename = parts.pop();
  const dir = await getDir(parts, { create: true });
  const fh = await dir.getFileHandle(filename, { create: true });
  const writable = await fh.createWritable();
  await writable.write(file);
  await writable.close();
}

async function listDirNames(pathParts) {
  try {
    const dir = await getDir(pathParts);
    const names = [];
    for await (const name of dir.keys()) names.push(name);
    return names;
  } catch {
    return [];
  }
}

async function removeFileIfExists(path) {
  const parts = path.split("/");
  const filename = parts.pop();
  try {
    const dir = await getDir(parts);
    await dir.removeEntry(filename);
  } catch {
    /* already gone, or never existed — fine */
  }
}

/* ---------------- Parsing / generating data files ---------------- */

function evalVar(sourceText, varName) {
  const fn = new Function(sourceText + `\n;return ${varName};`);
  return fn();
}

function parseDataArray(sourceText, varName) {
  const result = evalVar(sourceText, varName);
  if (!Array.isArray(result)) throw new Error(`${varName} is not an array`);
  return result;
}

function parseDataObject(sourceText, varName) {
  const result = evalVar(sourceText, varName);
  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    throw new Error(`${varName} is not an object`);
  }
  return result;
}

function generateProjectsSource(list) {
  return PROJECTS_HEADER + "const PROJECTS = " + JSON.stringify(list, null, 2) + ";\n";
}

function generateExperienceSource(list) {
  return EXPERIENCE_HEADER + "const EXPERIENCE = " + JSON.stringify(list, null, 2) + ";\n";
}

function generateSiteSource(obj) {
  return SITE_HEADER + "const SITE = " + JSON.stringify(obj, null, 2) + ";\n";
}

async function loadProjects() {
  const text = await readTextFile("js/projects.js");
  projectsCache = parseDataArray(text, "PROJECTS");
  return projectsCache;
}

async function saveProjects() {
  await writeTextFile("js/projects.js", generateProjectsSource(projectsCache));
}

async function loadExperience() {
  const text = await readTextFile("js/experience.js");
  experienceCache = parseDataArray(text, "EXPERIENCE");
  return experienceCache;
}

async function saveExperience() {
  await writeTextFile("js/experience.js", generateExperienceSource(experienceCache));
}

async function loadSite() {
  const text = await readTextFile("js/site.js");
  siteCache = parseDataObject(text, "SITE");
  return siteCache;
}

async function saveSite() {
  await writeTextFile("js/site.js", generateSiteSource(siteCache));
}

async function refreshAll() {
  try {
    await loadSite();
    await loadProjects();
    await loadExperience();
    renderSiteCard();
    renderProjectsList();
    renderExperienceList();
  } catch (err) {
    setStatus("Error reading data files: " + err.message, true);
  }
}

/* ---------------- Slug + file helpers ---------------- */

function slugify(str) {
  return (
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

async function writeProjectImages(id, files) {
  const existing = await listDirNames(["images", id]);
  let maxIndex = 0;
  for (const name of existing) {
    const m = name.match(/^photo-(\d+)\./);
    if (m) maxIndex = Math.max(maxIndex, parseInt(m[1], 10));
  }
  const written = [];
  for (const file of files) {
    maxIndex += 1;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const filename = `photo-${maxIndex}.${ext}`;
    await writeBinaryFile(`images/${id}/${filename}`, file);
    written.push(`images/${id}/${filename}`);
  }
  return written;
}

async function writeProjectModel(kind, id, file) {
  const path = `models/${kind}/${id}.${kind}`;
  await writeBinaryFile(path, file);
  return path;
}

/* ---------------- Site Info ---------------- */

function renderSiteCard() {
  const container = document.getElementById("site-admin-card");
  container.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-thumb">${siteCache.headshot ? `<img src="${escapeAttr(siteCache.headshot)}" alt="" />` : ""}</div>
      <div class="admin-card-body">
        <p class="admin-card-title">${escapeHtml(siteCache.name || "")}</p>
        <p class="admin-card-meta">${escapeHtml(siteCache.eyebrow || "")} · ${escapeHtml(siteCache.footerEmail || "")}</p>
      </div>
    </div>
  `;
}

function openSiteForm() {
  const form = document.getElementById("site-form");
  form.reset();
  form.name.value = siteCache.name || "";
  form.eyebrow.value = siteCache.eyebrow || "";
  form.bio.value = siteCache.bio || "";
  form.linkedinHref.value = siteCache.linkedinHref || "";
  form.footerEmail.value = siteCache.footerEmail || "";

  document.getElementById("existing-headshot-img").src = siteCache.headshot || "";
  document.getElementById("existing-resume-note").textContent = siteCache.resumeHref ? `(current: ${siteCache.resumeHref})` : "";
  document.getElementById("headshot-file-note").textContent = "";
  document.getElementById("resume-file-note").textContent = "";

  document.getElementById("site-modal").hidden = false;
}

async function writeSiteHeadshot(file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `images/headshot.${ext}`;
  await writeBinaryFile(path, file);
  return path;
}

async function writeSiteResume(file) {
  const path = "resume/resume.pdf";
  await writeBinaryFile(path, file);
  return path;
}

async function handleSiteFormSubmit(e) {
  e.preventDefault();
  if (!rootHandle) { setStatus("Connect the project folder first.", true); return; }
  const form = e.target;

  setStatus("Saving…");
  try {
    let headshot = siteCache.headshot || "";
    if (form.headshot.files[0]) headshot = await writeSiteHeadshot(form.headshot.files[0]);

    let resumeHref = siteCache.resumeHref || "";
    if (form.resume.files[0]) resumeHref = await writeSiteResume(form.resume.files[0]);

    siteCache = {
      name: form.name.value.trim(),
      eyebrow: form.eyebrow.value.trim(),
      bio: form.bio.value.trim(),
      headshot,
      resumeHref,
      linkedinHref: form.linkedinHref.value.trim(),
      footerEmail: form.footerEmail.value.trim(),
    };

    await saveSite();
    setStatus("Site info saved.");
    document.getElementById("site-modal").hidden = true;
    renderSiteCard();
  } catch (err) {
    setStatus("Error saving site info: " + err.message, true);
  }
}

/* ---------------- Rendering: Projects list ---------------- */

function renderProjectsList() {
  const container = document.getElementById("projects-admin-list");
  if (!projectsCache.length) {
    container.innerHTML = '<div class="admin-empty">No projects yet — click "+ New Project" to add one.</div>';
    return;
  }
  container.innerHTML = "";
  projectsCache.forEach((p, index) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.draggable = true;
    card.dataset.index = index;
    card.innerHTML = `
      <span class="drag-handle" draggable="false" aria-hidden="true" title="Drag to reorder">&#8942;&#8942;</span>
      <div class="admin-card-thumb">${p.images && p.images[0] ? `<img src="${escapeAttr(imgSrc(p.images[0]))}" alt="" />` : ""}</div>
      <div class="admin-card-body">
        <p class="admin-card-title">${escapeHtml(p.title)}</p>
        <p class="admin-card-meta">${escapeHtml(p.id)} · ${(p.images || []).length} photo(s)${p.stl && p.showModel !== false ? " · 3D model" : ""}</p>
      </div>
      <div class="admin-card-actions">
        <button type="button" class="btn btn-outline btn-sm" data-edit>Edit</button>
        <button type="button" class="btn btn-outline btn-sm" data-delete>Delete</button>
      </div>
    `;
    card.querySelector("[data-edit]").addEventListener("click", () => openProjectForm(p));
    card.querySelector("[data-delete]").addEventListener("click", () => deleteProject(p));
    container.appendChild(card);
  });
  attachDragReorder(
    container,
    ".admin-card",
    () => projectsCache,
    (reordered) => { projectsCache = reordered; },
    async () => { await saveProjects(); setStatus("Project order saved."); }
  );
}

async function deleteProject(p) {
  if (!confirm(`Remove "${p.title}" from the site? (Its image/model files stay on disk — only the listing is removed.)`)) return;
  projectsCache = projectsCache.filter((x) => x.id !== p.id);
  await saveProjects();
  setStatus("Project removed.");
  renderProjectsList();
}

/* ---------------- Project form ---------------- */

function openProjectForm(existing) {
  const form = document.getElementById("project-form");
  form.reset();
  form.dataset.editingId = existing ? existing.id : "";
  form.dataset.existingStl = existing ? existing.stl || "" : "";

  document.getElementById("project-modal-title").textContent = existing ? `Edit: ${existing.title}` : "New Project";
  form.title.value = existing ? existing.title : "";
  form.id.value = existing ? existing.id : "";
  form.id.disabled = !!existing;
  form.tags.value = existing ? (existing.tags || []).join(", ") : "";
  form.description.value = existing ? existing.description : "";

  const existingGroup = document.getElementById("existing-images-group");
  const existingList = document.getElementById("existing-images");
  existingList.innerHTML = "";
  if (existing && existing.images && existing.images.length) {
    existingGroup.hidden = false;
    existing.images.forEach((img) => {
      const path = imgSrc(img);
      const caption = imgCaption(img);
      const wrap = document.createElement("div");
      wrap.className = "existing-image";
      wrap.draggable = true;
      wrap.dataset.path = path;
      wrap.innerHTML = `
        <span class="drag-handle" draggable="false" aria-hidden="true" title="Drag to reorder">&#8942;&#8942;</span>
        <img src="${escapeAttr(path)}" alt="" />
        <input type="text" class="existing-image-caption" placeholder="Caption (optional)" value="${escapeAttr(caption)}" />
        <button type="button">Remove</button>
      `;
      wrap.querySelector("button").addEventListener("click", () => {
        wrap.classList.toggle("marked-remove");
        wrap.querySelector("button").textContent = wrap.classList.contains("marked-remove") ? "Undo" : "Remove";
      });
      existingList.appendChild(wrap);
    });
  } else {
    existingGroup.hidden = true;
  }
  attachDragReorder(existingList, ".existing-image", null, null, null);

  document.getElementById("existing-stl-note").textContent = existing && existing.stl ? `(current: ${existing.stl})` : "";
  document.getElementById("new-images-list").innerHTML = "";
  document.getElementById("stl-file-note").textContent = "";

  const showModel = existing
    ? (existing.showModel !== undefined ? !!existing.showModel : !!existing.stl)
    : false;
  document.getElementById("show-model-checkbox").checked = showModel;
  document.getElementById("model-fields").hidden = !showModel;

  document.getElementById("project-modal").hidden = false;
}

async function handleProjectFormSubmit(e) {
  e.preventDefault();
  if (!rootHandle) { setStatus("Connect the project folder first.", true); return; }
  const form = e.target;
  const editingId = form.dataset.editingId || null;
  const title = form.title.value.trim();
  if (!title) { setStatus("Title is required.", true); return; }
  const id = form.id.value.trim() || slugify(title);
  const tags = form.tags.value.split(",").map((s) => s.trim()).filter(Boolean);
  const description = form.description.value.trim();

  if (!editingId && projectsCache.some((p) => p.id === id)) {
    setStatus(`A project with id "${id}" already exists — choose a different id.`, true);
    return;
  }

  setStatus("Saving…");
  try {
    const keptImages = Array.from(form.querySelectorAll(".existing-image:not(.marked-remove)")).map((el) => ({
      src: el.dataset.path,
      caption: el.querySelector(".existing-image-caption").value.trim(),
    }));
    const removedImages = Array.from(form.querySelectorAll(".existing-image.marked-remove")).map((el) => el.dataset.path);
    for (const p of removedImages) await removeFileIfExists(p);

    const newFiles = Array.from(form.images.files || []);
    const newCaptions = Array.from(document.querySelectorAll("#new-images-list .new-image-caption")).map((i) => i.value.trim());
    const newImagePaths = newFiles.length ? await writeProjectImages(id, newFiles) : [];
    const newImages = newImagePaths.map((src, i) => ({ src, caption: newCaptions[i] || "" }));
    const images = [...keptImages, ...newImages];

    let stlPath = form.dataset.existingStl || "";
    if (form.stl.files[0]) stlPath = await writeProjectModel("stl", id, form.stl.files[0]);

    const showModel = form.showModel.checked;
    const projectObj = { id, title, tags, description, images, showModel, stl: stlPath };

    if (editingId) {
      const idx = projectsCache.findIndex((p) => p.id === editingId);
      if (idx >= 0) projectsCache[idx] = projectObj;
      else projectsCache.push(projectObj);
    } else {
      projectsCache.push(projectObj);
    }

    await saveProjects();
    setStatus("Project saved.");
    document.getElementById("project-modal").hidden = true;
    renderProjectsList();
  } catch (err) {
    setStatus("Error saving project: " + err.message, true);
  }
}

function wireImagesFilePreview() {
  const form = document.getElementById("project-form");
  const container = document.getElementById("new-images-list");
  form.images.addEventListener("change", () => {
    const files = Array.from(form.images.files || []);
    container.innerHTML = "";
    files.forEach((file) => {
      const row = document.createElement("div");
      row.className = "new-image-row";
      row.innerHTML = `
        <span class="new-image-name">${escapeHtml(file.name)}</span>
        <input type="text" class="new-image-caption" placeholder="Caption (optional)" />
      `;
      container.appendChild(row);
    });
  });
}

function wireFileNotePreview(formId, fieldName, noteId, multiple) {
  const form = document.getElementById(formId);
  form[fieldName].addEventListener("change", () => {
    const files = Array.from(form[fieldName].files || []);
    const note = document.getElementById(noteId);
    if (!files.length) { note.textContent = ""; return; }
    note.textContent = multiple
      ? `${files.length} file(s) selected: ${files.map((f) => f.name).join(", ")}`
      : `Selected: ${files[0].name}`;
  });
}

/* ---------------- Bold / italic formatting ---------------- */

function wrapFieldSelection(field, marker) {
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? field.value.length;
  const selected = start === end ? "text" : field.value.slice(start, end);
  field.value = field.value.slice(0, start) + marker + selected + marker + field.value.slice(end);
  field.focus();
  field.setSelectionRange(start + marker.length, start + marker.length + selected.length);
}

/* ---------------- Rendering: Experience list ---------------- */

function renderExperienceList() {
  const container = document.getElementById("experience-admin-list");
  if (!experienceCache.length) {
    container.innerHTML = '<div class="admin-empty">No entries yet — click "+ New Entry" to add one.</div>';
    return;
  }
  container.innerHTML = "";
  experienceCache.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.draggable = true;
    card.dataset.index = index;
    card.innerHTML = `
      <span class="drag-handle" draggable="false" aria-hidden="true" title="Drag to reorder">&#8942;&#8942;</span>
      <div class="admin-card-body">
        <p class="admin-card-title">${escapeHtml(item.role)}</p>
        <p class="admin-card-meta">${escapeHtml(item.org)} · ${escapeHtml(item.dates)}</p>
      </div>
      <div class="admin-card-actions">
        <button type="button" class="btn btn-outline btn-sm" data-edit>Edit</button>
        <button type="button" class="btn btn-outline btn-sm" data-delete>Delete</button>
      </div>
    `;
    card.querySelector("[data-edit]").addEventListener("click", () => {
      const liveIndex = experienceCache.indexOf(item);
      openExperienceForm(item, liveIndex);
    });
    card.querySelector("[data-delete]").addEventListener("click", () => {
      const liveIndex = experienceCache.indexOf(item);
      deleteExperience(liveIndex);
    });
    container.appendChild(card);
  });
  attachDragReorder(
    container,
    ".admin-card",
    () => experienceCache,
    (reordered) => { experienceCache = reordered; },
    async () => { await saveExperience(); setStatus("Entry order saved."); }
  );
}

async function deleteExperience(index) {
  if (!confirm("Remove this entry?")) return;
  experienceCache.splice(index, 1);
  await saveExperience();
  setStatus("Entry removed.");
  renderExperienceList();
}

/* ---------------- Experience form ---------------- */

function openExperienceForm(existing, index) {
  const form = document.getElementById("experience-form");
  form.reset();
  form.dataset.editingIndex = existing ? String(index) : "";

  document.getElementById("experience-modal-title").textContent = existing ? "Edit Entry" : "New Entry";
  form.role.value = existing ? existing.role : "";
  form.org.value = existing ? existing.org : "";
  form.dates.value = existing ? existing.dates : "";

  const bulletsList = document.getElementById("bullets-list");
  bulletsList.innerHTML = "";
  const bullets = existing && existing.bullets && existing.bullets.length ? existing.bullets : [""];
  bullets.forEach((b) => addBulletRow(b));

  document.getElementById("experience-modal").hidden = false;
}

function addBulletRow(value) {
  const bulletsList = document.getElementById("bullets-list");
  const row = document.createElement("div");
  row.className = "bullet-row";
  row.innerHTML = `
    <button type="button" class="format-btn" data-wrap="**" title="Bold"><strong>B</strong></button>
    <button type="button" class="format-btn" data-wrap="*" title="Italic"><em>i</em></button>
    <input type="text" value="${escapeAttr(value)}" placeholder="Describe the impact — quantify where you can" />
    <button type="button" class="bullet-remove-btn" aria-label="Remove bullet">&times;</button>
  `;
  row.querySelector(".bullet-remove-btn").addEventListener("click", () => row.remove());
  bulletsList.appendChild(row);
}

async function handleExperienceFormSubmit(e) {
  e.preventDefault();
  if (!rootHandle) { setStatus("Connect the project folder first.", true); return; }
  const form = e.target;
  const role = form.role.value.trim();
  const org = form.org.value.trim();
  const dates = form.dates.value.trim();
  if (!role || !org || !dates) { setStatus("Role, organization, and dates are required.", true); return; }

  const bullets = Array.from(document.querySelectorAll("#bullets-list input"))
    .map((i) => i.value.trim())
    .filter(Boolean);

  const entry = { role, org, dates, bullets };
  const editingIndex = form.dataset.editingIndex;

  setStatus("Saving…");
  try {
    if (editingIndex !== "") {
      experienceCache[parseInt(editingIndex, 10)] = entry;
    } else {
      experienceCache.unshift(entry);
    }
    await saveExperience();
    setStatus("Entry saved.");
    document.getElementById("experience-modal").hidden = true;
    renderExperienceList();
  } catch (err) {
    setStatus("Error saving entry: " + err.message, true);
  }
}

/* ---------------- Drag-to-reorder ---------------- */

// getList/setList/onReordered are optional — omit them (pass null) for a
// purely visual, DOM-order reorder where the caller reads final order later
// (e.g. the per-project existing-images list, read at form submit time).
function attachDragReorder(container, selector, getList, setList, onReordered) {
  if (container.dataset.dragReorderAttached) return;
  container.dataset.dragReorderAttached = "1";

  let dragEl = null;

  container.addEventListener("dragstart", (e) => {
    const card = e.target.closest(selector);
    if (!card) return;
    dragEl = card;
    requestAnimationFrame(() => card.classList.add("dragging"));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", card.dataset.index || "");
  });

  container.addEventListener("dragover", (e) => {
    if (!dragEl) return;
    e.preventDefault();
    const afterEl = getDragAfterElement(container, selector, e.clientY);
    if (afterEl == null) container.appendChild(dragEl);
    else container.insertBefore(dragEl, afterEl);
  });

  container.addEventListener("dragend", async () => {
    if (!dragEl) return;
    dragEl.classList.remove("dragging");
    dragEl = null;
    if (!getList) return;
    const list = getList();
    const newOrder = Array.from(container.querySelectorAll(selector)).map(
      (c) => list[parseInt(c.dataset.index, 10)]
    );
    setList(newOrder);
    try {
      await onReordered();
    } catch (err) {
      setStatus("Error saving new order: " + err.message, true);
    }
  });
}

function getDragAfterElement(container, selector, y) {
  const els = Array.from(container.querySelectorAll(`${selector}:not(.dragging)`));
  return els.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

/* ---------------- Utilities ---------------- */

function escapeHtml(str) {
  if (str == null) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

// Project images may be a plain path string (old data), or an
// { src, caption } object (new data) — these normalize either shape.
function imgSrc(img) {
  return typeof img === "string" ? img : (img && img.src) || "";
}

function imgCaption(img) {
  return typeof img === "string" ? "" : (img && img.caption) || "";
}
