const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const editorBar = document.querySelector(".editor-bar");
const editorStatus = document.querySelector(".editor-status");
const titleInput = document.querySelector("[data-page-title]");
const emailInput = document.querySelector("[data-contact-email]");
const emailLink = document.querySelector("#email-link");
const emailHint = document.querySelector(".email-hint code");
const storageKey = "varshini-portfolio-content-v2";

const editableSelector = [
  ".wordmark-mark",
  ".wordmark > span:not(.wordmark-mark)",
  ".site-nav > a",
  ".nav-resume",
  ".eyebrow",
  "#hero-title",
  ".hero-description",
  ".hero-actions > a",
  ".hero-meta > span:not(.meta-divider)",
  ".art-note",
  ".scroll-cue",
  ".section-heading h2",
  ".about-lead",
  ".about-copy > p:not(.about-lead)",
  ".aside-topline > span",
  ".facts-list dt",
  ".facts-list dd",
  ".principles > div > span:not(.principle-number):not([aria-hidden='true'])",
  ".section-caption",
  ".filter-button",
  ".window-dots > span",
  ".editorial-content > span",
  ".editorial-content > strong",
  ".editorial-content > small",
  ".project-index",
  ".project-details h3",
  ".project-details p",
  ".project-tags > span",
  ".dash-label",
  ".dashboard-main > strong",
  ".dash-stats small",
  ".dash-stats b",
  ".community-kicker",
  ".community-card strong",
  ".community-caption",
  ".timeline-date",
  ".timeline-content h3",
  ".timeline-role",
  ".timeline-content > p:last-of-type",
  ".toolbox-heading > span:first-child",
  ".toolbox > p",
  ".tool-tags > span",
  ".toolbox-footer > span:first-child",
  ".contact h2",
  ".contact-copy",
  ".contact-bottom > span",
  ".site-footer > a"
].join(", ");

const editableElements = [...document.querySelectorAll(editableSelector)];
editableElements.forEach((element, index) => {
  element.dataset.editable = String(index);
});

const originalContent = editableElements.map((element) => element.innerHTML);
const originalTitle = document.title;
const originalEmail = emailLink.href.startsWith("mailto:")
  ? decodeURIComponent(emailLink.href.slice("mailto:".length))
  : "";
const allowedTags = new Set(["br", "b", "em", "i", "strong", "span", "code", "div"]);
let isEditing = false;

function setEditorStatus(message, isError = false) {
  editorStatus.textContent = message;
  editorStatus.dataset.error = String(isError);
}

function sanitizeMarkup(markup) {
  const template = document.createElement("template");
  template.innerHTML = markup;

  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const tagName = node.tagName.toLowerCase();
    if (!allowedTags.has(tagName)) {
      return document.createTextNode(node.textContent || "");
    }

    const cleanElement = document.createElement(tagName);
    for (const attribute of node.attributes) {
      if (attribute.name === "class" && /^[a-zA-Z0-9 _-]{0,200}$/.test(attribute.value)) {
        cleanElement.className = attribute.value;
      } else if (attribute.name === "aria-hidden" && /^(true|false)$/.test(attribute.value)) {
        cleanElement.setAttribute("aria-hidden", attribute.value);
      }
    }
    node.childNodes.forEach((child) => {
      const cleanChild = cleanNode(child);
      if (cleanChild) cleanElement.append(cleanChild);
    });
    return cleanElement;
  }

  const container = document.createElement("div");
  template.content.childNodes.forEach((node) => {
    const cleanChild = cleanNode(node);
    if (cleanChild) container.append(cleanChild);
  });
  return container.innerHTML;
}

function validateState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== 1) {
    return "This backup isn’t a supported portfolio content file.";
  }
  if (
    typeof value.pageTitle !== "string" ||
    value.pageTitle.trim().length === 0 ||
    value.pageTitle.length > 180
  ) {
    return "The page title in this backup is missing or too long.";
  }
  if (
    typeof value.email !== "string" ||
    value.email.length > 254 ||
    (value.email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))
  ) {
    return "The contact email in this backup is not valid.";
  }
  if (!Array.isArray(value.content) || value.content.length !== editableElements.length) {
    return "This backup doesn’t match the content fields on this page.";
  }

  const keys = new Set();
  for (const item of value.content) {
    if (
      !item ||
      typeof item !== "object" ||
      !Number.isInteger(item.key) ||
      item.key < 0 ||
      item.key >= editableElements.length ||
      keys.has(item.key) ||
      typeof item.html !== "string" ||
      item.html.length > 20000
    ) {
      return "A content field in this backup is invalid.";
    }
    keys.add(item.key);
  }
  return null;
}

function createState() {
  return {
    version: 1,
    pageTitle: titleInput.value.trim(),
    email: emailInput.value.trim(),
    content: editableElements.map((element) => ({
      key: Number(element.dataset.editable),
      html: sanitizeMarkup(element.innerHTML)
    }))
  };
}

function applyState(state) {
  state.content.forEach((item) => {
    editableElements[item.key].innerHTML = sanitizeMarkup(item.html);
  });
  titleInput.value = state.pageTitle;
  document.title = state.pageTitle;
  emailInput.value = state.email;
  updateEmailPresentation(state.email);
}

function updateEmailPresentation(email) {
  emailLink.href = email ? `mailto:${email}` : "#contact";
  emailHint.textContent = email || "Add your email in edit mode.";
}

function saveState() {
  const state = createState();
  const error = validateState(state);
  if (error) {
    setEditorStatus(error, true);
    return false;
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    setEditorStatus("Couldn’t save in this browser. Download a backup to keep your changes.", true);
    return false;
  }
  setEditorStatus("Saved in this browser. Download a backup to keep a copy.");
  return true;
}

function setEditing(enabled) {
  isEditing = enabled;
  document.body.classList.toggle("is-editing", isEditing);
  editorBar.hidden = !isEditing;
  editorBar.setAttribute("aria-hidden", String(!isEditing));
  document.querySelectorAll("[data-edit-toggle]").forEach((button) => {
    button.setAttribute("aria-pressed", String(isEditing));
    if (button.classList.contains("nav-edit")) {
      button.textContent = isEditing ? "Editing" : "Edit content";
    }
  });
  editableElements.forEach((element) => {
    if (isEditing) {
      element.setAttribute("contenteditable", "true");
      element.setAttribute("spellcheck", "true");
    } else {
      element.removeAttribute("contenteditable");
      element.removeAttribute("spellcheck");
    }
  });
  if (isEditing) {
    titleInput.focus();
    setEditorStatus("Click any highlighted text to rewrite it.");
  }
}

function downloadBackup() {
  const state = createState();
  const error = validateState(state);
  if (error) {
    setEditorStatus(error, true);
    return;
  }

  const file = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "portfolio-content-backup.json";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  setEditorStatus("Backup downloaded.");
}

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "Open navigation menu" : "Close navigation menu");
  siteNav.classList.toggle("is-open", !isExpanded);
});

siteNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
    siteNav.classList.remove("is-open");
  });
});

document.addEventListener(
  "click",
  (event) => {
    if (isEditing && event.target instanceof Element && event.target.closest("a")) {
      event.preventDefault();
    }
  },
  true
);

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    if (isEditing) return;
    const filter = button.dataset.filter;
    document.querySelectorAll(".filter-button").forEach((filterButton) => {
      const isActive = filterButton === button;
      filterButton.classList.toggle("is-active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });
    document.querySelectorAll(".project-card").forEach((card) => {
      card.hidden = filter !== "all" && !card.dataset.category.split(" ").includes(filter);
    });
  });
});

document.querySelectorAll("[data-print]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!isEditing) window.print();
  });
});

document.querySelectorAll("[data-edit-toggle]").forEach((button) => {
  button.addEventListener("click", () => setEditing(!isEditing));
});

editableElements.forEach((element) => {
  element.addEventListener("input", saveState);
});

titleInput.value = originalTitle;
emailInput.value = originalEmail;
titleInput.addEventListener("input", () => {
  document.title = titleInput.value;
  saveState();
});
emailInput.addEventListener("input", () => {
  updateEmailPresentation(emailInput.value.trim());
  saveState();
});

document.querySelector("[data-export]").addEventListener("click", downloadBackup);

document.querySelector("[data-reset]").addEventListener("click", () => {
  if (!window.confirm("Reset all edited text and settings to the original sample content?")) {
    return;
  }
  try {
    localStorage.removeItem(storageKey);
  } catch {
    setEditorStatus("Couldn’t clear saved changes in this browser.", true);
    return;
  }
  originalContent.forEach((html, index) => {
    editableElements[index].innerHTML = html;
  });
  titleInput.value = originalTitle;
  document.title = originalTitle;
  emailInput.value = originalEmail;
  updateEmailPresentation(originalEmail);
  setEditorStatus("Original sample content restored.");
});

document.querySelector("[data-import]").addEventListener("change", async (event) => {
  const input = event.currentTarget;
  const file = input.files[0];
  if (!file) return;
  if (file.size > 500000) {
    setEditorStatus("This backup file is too large to import.", true);
    input.value = "";
    return;
  }

  let text;
  try {
    text = await file.text();
  } catch {
    setEditorStatus("Couldn’t read that backup file.", true);
    input.value = "";
    return;
  }

  let imported;
  try {
    imported = JSON.parse(text);
  } catch {
    setEditorStatus("That file isn’t valid JSON. Choose a portfolio backup file.", true);
    input.value = "";
    return;
  }
  const error = validateState(imported);
  if (error) {
    setEditorStatus(error, true);
    input.value = "";
    return;
  }

  applyState(imported);
  saveState();
  input.value = "";
  setEditorStatus("Backup imported.");
});

try {
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    let savedState;
    try {
      savedState = JSON.parse(stored);
    } catch {
      setEditorStatus("Saved content couldn’t be read. Import a backup or reset the sample.", true);
    }
    if (savedState) {
      const error = validateState(savedState);
      if (error) {
        setEditorStatus(error, true);
      } else {
        applyState(savedState);
      }
    }
  }
} catch {
  setEditorStatus("Browser storage is unavailable. Download a backup to keep your changes.", true);
}

document.querySelector("#year").textContent = new Date().getFullYear();
