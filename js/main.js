document.addEventListener("DOMContentLoaded", () => {
  renderSiteInfo();
  renderExperience();
  renderProjects();
  setupLightbox();
  setupScrollReveal();
  document.getElementById("year").textContent = new Date().getFullYear();
});

function renderSiteInfo() {
  if (typeof SITE === "undefined") return;

  document.getElementById("hero-eyebrow").textContent = SITE.eyebrow;
  document.getElementById("hero-name").textContent = SITE.name;
  document.getElementById("hero-bio").innerHTML = formatText(SITE.bio);

  const resumeLink = document.getElementById("hero-resume-link");
  resumeLink.href = SITE.resumeHref;

  const linkedinLink = document.getElementById("hero-linkedin-link");
  linkedinLink.href = SITE.linkedinHref;

  const photo = document.getElementById("hero-photo-img");
  photo.src = SITE.headshot;
  photo.alt = `Photo of ${SITE.name}`;

  const footerEmailLink = document.getElementById("footer-email-link");
  footerEmailLink.href = `mailto:${SITE.footerEmail}`;
  footerEmailLink.textContent = SITE.footerEmail;

  document.getElementById("footer-name").textContent = SITE.name;

  document.title = `${SITE.name} — Mechanical Engineering Portfolio`;
}

function renderExperience() {
  const list = document.getElementById("experience-list");
  if (!list || typeof EXPERIENCE === "undefined") return;

  list.innerHTML = EXPERIENCE.map((item) => `
    <article class="experience-item">
      <div class="experience-heading">
        <h3>${escapeHtml(item.role)}</h3>
        <span class="experience-dates">${escapeHtml(item.dates)}</span>
      </div>
      <p class="experience-org">${escapeHtml(item.org)}</p>
      <ul class="experience-bullets">
        ${item.bullets.map((b) => `<li>${formatText(b)}</li>`).join("")}
      </ul>
    </article>
  `).join("");
}

function renderProjects() {
  const list = document.getElementById("projects-list");
  if (!list || typeof PROJECTS === "undefined") return;

  list.innerHTML = PROJECTS.map((p) => projectCardHtml(p)).join("");

  // Now that markup exists, wire up each card's gallery + 3D viewer.
  PROJECTS.forEach((p) => {
    const card = list.querySelector(`[data-project-id="${cssEscape(p.id)}"]`);
    if (!card) return;
    setupGallery(card, p.images || [], p.title);

    const viewerEl = card.querySelector(".stl-viewer");
    if (viewerEl && p.stl && typeof initSTLViewer === "function") {
      initSTLViewer(viewerEl, p.stl);
    }
  });
}

function projectCardHtml(p) {
  const tags = (p.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");
  const images = p.images || [];
  const thumbs = images.map((img, i) => `
    <button class="gallery-thumb ${i === 0 ? "is-active" : ""}" type="button" data-src="${escapeAttr(imgSrc(img))}" data-caption="${escapeAttr(imgCaption(img))}" aria-label="View photo ${i + 1}">
      <img src="${escapeAttr(imgSrc(img))}" alt="${escapeAttr(p.title)} — photo ${i + 1}" loading="lazy" />
    </button>
  `).join("");

  // Projects saved before the showModel toggle existed default to showing
  // the viewer if they have an stl file; only an explicit `false` hides it.
  const hasModel = !!p.stl && p.showModel !== false;
  const firstCaption = images[0] ? imgCaption(images[0]) : "";

  return `
    <article class="project-card reveal" data-project-id="${escapeAttr(p.id)}">
      <div class="project-header">
        <h3>${escapeHtml(p.title)}</h3>
        ${tags ? `<div class="tags">${tags}</div>` : ""}
      </div>

      <p class="project-desc">${formatText(p.description)}</p>

      <div class="project-media ${hasModel ? "" : "no-model"}">
        <div class="gallery">
          <button class="gallery-main" type="button" data-lightbox-trigger>
            <img class="gallery-main-img" src="${escapeAttr(images[0] ? imgSrc(images[0]) : "")}" alt="${escapeAttr(p.title)} — main photo" loading="lazy" />
            <span class="gallery-caption" ${firstCaption ? "" : "hidden"}>${escapeHtml(firstCaption)}</span>
          </button>
          ${images.length > 1 ? `<div class="gallery-thumbs">${thumbs}</div>` : ""}
        </div>

        ${hasModel ? `
        <div class="viewer-wrap">
          <p class="viewer-label">Interactive 3D model</p>
          <div class="viewer-frame">
            <div class="stl-viewer" data-stl="${escapeAttr(p.stl)}"></div>
            <p class="viewer-status">Loading model&hellip;</p>
          </div>
        </div>
        ` : ""}
      </div>
    </article>
  `;
}

function setupGallery(card, images, title) {
  const mainImg = card.querySelector(".gallery-main-img");
  const captionEl = card.querySelector(".gallery-caption");
  const thumbs = card.querySelectorAll(".gallery-thumb");
  const mainBtn = card.querySelector(".gallery-main");

  let currentIndex = 0;

  thumbs.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      currentIndex = i;
      mainImg.src = btn.getAttribute("data-src");
      if (captionEl) {
        const caption = btn.getAttribute("data-caption") || "";
        captionEl.textContent = caption;
        captionEl.hidden = !caption;
      }
      thumbs.forEach((t) => t.classList.remove("is-active"));
      btn.classList.add("is-active");
    });
  });

  if (mainBtn) {
    mainBtn.addEventListener("click", () => openLightbox(images, currentIndex, title));
  }
}

let lightboxImages = [];
let lightboxIndex = 0;
let lightboxTitle = "";

function setupLightbox() {
  const lightbox = document.getElementById("lightbox");
  const closeBtn = lightbox.querySelector(".lightbox-close");
  const img = document.getElementById("lightbox-img");

  closeBtn.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  img.addEventListener("click", (e) => {
    e.stopPropagation();
    if (lightboxImages.length > 1) showNextLightboxImage();
  });
  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") showNextLightboxImage();
    if (e.key === "ArrowLeft") showPrevLightboxImage();
  });
}

function openLightbox(images, startIndex, title) {
  lightboxImages = images;
  lightboxIndex = startIndex;
  lightboxTitle = title || "";
  renderLightboxImage();
  document.getElementById("lightbox").hidden = false;
}

function renderLightboxImage() {
  const img = document.getElementById("lightbox-img");
  const captionEl = document.getElementById("lightbox-caption");
  const current = lightboxImages[lightboxIndex];
  img.src = imgSrc(current);
  img.alt = `${lightboxTitle} — photo ${lightboxIndex + 1} of ${lightboxImages.length}`;
  img.style.cursor = lightboxImages.length > 1 ? "pointer" : "zoom-out";
  if (captionEl) {
    const caption = imgCaption(current);
    captionEl.textContent = caption;
    captionEl.hidden = !caption;
  }
}

function showNextLightboxImage() {
  lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
  renderLightboxImage();
}

function showPrevLightboxImage() {
  lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
  renderLightboxImage();
}

function closeLightbox() {
  document.getElementById("lightbox").hidden = true;
}

function setupScrollReveal() {
  const targets = document.querySelectorAll(".reveal, .project-card, .experience-item");
  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  targets.forEach((el) => observer.observe(el));
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatText(str) {
  return escapeHtml(str)
    .replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

function cssEscape(str) {
  return String(str).replace(/["\\]/g, "\\$&");
}

// Project images may be a plain path string (old data), or an
// { src, caption } object (new data) — these normalize either shape.
function imgSrc(img) {
  return typeof img === "string" ? img : (img && img.src) || "";
}

function imgCaption(img) {
  return typeof img === "string" ? "" : (img && img.caption) || "";
}
