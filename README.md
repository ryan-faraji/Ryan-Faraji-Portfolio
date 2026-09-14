# Engineering Portfolio

Plain HTML/CSS/JS personal portfolio. No build step, no framework — open `index.html`
in a browser (or serve it locally, see below) and it works.

## Folder structure

```
.
├── index.html              # page structure — you shouldn't need to edit this to add a project
├── admin.html              # local form-based editor (Chrome/Edge) — see below
├── css/
│   ├── style.css
│   └── admin.css
├── js/
│   ├── projects.js         # ← YOUR PROJECT DATA GOES HERE
│   ├── experience.js        # work / club / school history
│   ├── stl-viewer.js        # Three.js STL viewer (rarely needs edits)
│   ├── main.js              # renders everything from the data files above
│   └── admin.js              # logic for admin.html
├── images/
│   └── <project-id>/        # one folder per project for its gallery photos
├── models/
│   └── stl/                 # .stl files, used for the in-browser 3D viewer
└── resume/
    └── resume-placeholder.pdf   # replace with your real resume
```

## Easiest way to add/edit content: admin.html

Open `http://localhost:8000/admin.html` (Chrome or Edge only — see below) for a
form-based editor: add/edit/delete projects and work experience entries,
upload photos and an STL file, and it writes `js/projects.js` and
`js/experience.js` for you — no hand-editing required.

1. Start the local server (see **Running locally** below) if it isn't already running.
2. Open `http://localhost:8000/admin.html`.
3. Click **Connect Project Folder** and select this project's root folder (the
   one containing `index.html`). Your browser will ask you to confirm access —
   this is a browser permission, granted once per browser session; nothing is
   uploaded anywhere, all reads/writes stay on your computer.
4. Use **+ New Project** / **+ New Entry**, or **Edit** on an existing card.
   Saving writes the files and image/model uploads immediately — refresh
   `index.html` to see the change live.

**Browser requirement:** this uses the File System Access API, which only
desktop Chrome and Edge support (not Firefox or Safari). It also needs to be
opened via `http://localhost:8000/admin.html` — opening the file directly
(`file://...`) won't work.

**Deleting** a project/entry in admin.html only removes it from the list — it
does not delete the image/STL files from disk, so you won't lose files by
accident. Renaming a project's ID after creation does not move its existing
files; only do that if you're prepared to move them yourself.

If you're not on Chrome/Edge, or just prefer a text editor, everything below
still works exactly the same by hand.

## Adding a new project by hand

You do **not** need to touch `index.html` or any layout code. Everything in the
Projects section is generated from the `PROJECTS` array in `js/projects.js`.

1. **Make a folder for your images:** `images/<project-id>/`, and drop your
   photos in (JPG or PNG, a few per project is plenty).
2. **Add your CAD file:**
   - STL export → `models/stl/<project-id>.stl` (used for the interactive viewer)
3. **Add an entry to `js/projects.js`:**

   ```js
   {
     id: "cnc-vise-jig",                 // unique, no spaces — used in file paths
     title: "CNC Vise Jig",
     tags: ["Aluminum", "CNC Machining", "GD&T"],
     description: "One or two sentences: what it is, the problem it solved, the result.",
     images: [
       { src: "images/cnc-vise-jig/photo-1.jpg", caption: "Finished jig on the mill table" },
       { src: "images/cnc-vise-jig/photo-2.jpg", caption: "" }
       // A plain string path (no caption) also still works: "images/cnc-vise-jig/photo-3.jpg"
     ],
     showModel: true,
     stl: "models/stl/cnc-vise-jig.stl"
   }
   ```

4. Save, refresh the page. That's it — the card, photo gallery, and 3D viewer
   are all generated automatically. Set `showModel: false` (or omit the `stl`
   field) for projects that shouldn't show a 3D viewer — the photo gallery
   expands to fill the space instead.

New entries can go anywhere in the array; they render in array order (top of
the array = top of the page).

### Notes on the 3D viewer

- It reads STL files directly in the browser using Three.js — no conversion
  needed, just export STL from SolidWorks/Fusion/etc. and drop it in
  `models/stl/`.
- Large STL files (very high triangle count) will load slower. If a model
  feels sluggish, re-export at a coarser tessellation resolution.
- If a model fails to load (bad path, corrupt file), the card shows an error
  message instead — it won't break the rest of the page.
- Every model renders in the same fixed color; plain STL files don't carry
  color/material data, so there's nothing to read from the file itself.

## Updating the "Work & Experience" section

Use admin.html (see above), or edit the `EXPERIENCE` array in
`js/experience.js` by hand — copy an entry, change the fields, save.

## Updating the hero / resume / contact info

- Hero name, bio, and links live directly in `index.html` inside the
  `<section id="top" class="hero">` block.
- The headshot is `images/headshot-placeholder.svg`, referenced by the
  `<img>` inside `<div class="hero-photo">`. Drop your real photo in `images/`
  (e.g. `images/headshot.jpg`) and update that `src` attribute to match — the
  photo is cropped to a circle automatically, so a roughly square, centered
  photo looks best.
- Replace `resume/resume-placeholder.pdf` with your real resume, keeping the
  same filename (or update the `href` in `index.html` if you rename it).
- Update the LinkedIn/GitHub URLs and the email address in the hero and
  footer sections of `index.html`.

## Running locally

Opening `index.html` directly with a double-click works in most browsers, but
some browsers block `fetch()` requests to local files (which the STL loader
uses), so it's more reliable to serve the folder over local HTTP:

```powershell
# Python 3 (if installed)
python -m http.server 8000

# or, if you have Node.js installed
npx serve .
```

Then visit `http://localhost:8000` in your browser.

## Design notes

- Layout/typography is inspired by a clean, single-page personal site: big
  name + short bio up top, a simple work history, then projects as the main
  event, plain footer.
- Sections fade in on scroll (`IntersectionObserver` in `js/main.js`); this is
  automatically disabled for users with "reduce motion" preferences enabled.
- Fully responsive down to small phone widths — the project media grid
  (gallery + 3D viewer) stacks to a single column below 720px.
