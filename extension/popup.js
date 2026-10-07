const DEFAULTS = {
  mdPath: "",
  imageDir: "",
  bridgeUrl: "http://127.0.0.1:28765",
  profiles: [],
  activeProfileId: ""
};

const form = document.querySelector("#settings-form");
const profileSelect = document.querySelector("#profile-select");
const saveProfileButton = document.querySelector("#save-profile");
const deleteProfileButton = document.querySelector("#delete-profile");
const profileDialog = document.querySelector("#profile-dialog");
const profileDialogForm = document.querySelector("#profile-dialog-form");
const profileDialogName = document.querySelector("#profile-dialog-name");
const profileDialogCancel = document.querySelector("#profile-dialog-cancel");
const mdPathInput = document.querySelector("#md-path");
const imageDirInput = document.querySelector("#image-dir");
const bridgeUrlInput = document.querySelector("#bridge-url");
const captureButton = document.querySelector("#capture");
const saveSettingsButton = document.querySelector("#save-settings");
const checkServiceButton = document.querySelector("#check-service");
const statusElement = document.querySelector("#status");

let profiles = [];
let activeProfileId = "";

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("error", isError);
}

function createProfileId() {
  return "profile-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function normalizeProfiles(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((profile) => {
    return profile &&
      typeof profile.id === "string" &&
      typeof profile.name === "string" &&
      typeof profile.mdPath === "string" &&
      typeof profile.imageDir === "string" &&
      typeof profile.bridgeUrl === "string";
  });
}

function renderProfiles() {
  profileSelect.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "选择已有标签…";
  profileSelect.appendChild(placeholder);

  for (const profile of profiles) {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name;
    profileSelect.appendChild(option);
  }

  profileSelect.value = activeProfileId || "";
}

async function loadSettings() {
  const settings = await chrome.storage.local.get(DEFAULTS);
  profiles = normalizeProfiles(settings.profiles);
  activeProfileId = settings.activeProfileId || "";

  mdPathInput.value = settings.mdPath || "";
  imageDirInput.value = settings.imageDir || "";
  bridgeUrlInput.value = settings.bridgeUrl || DEFAULTS.bridgeUrl;

  if (!profiles.some((profile) => profile.id === activeProfileId)) {
    activeProfileId = "";
  }

  renderProfiles();
}

async function readSettings() {
  const settings = {
    mdPath: mdPathInput.value.trim(),
    imageDir: imageDirInput.value.trim(),
    bridgeUrl: bridgeUrlInput.value.trim().replace(/\/+$/, "")
  };

  if (!settings.mdPath || !settings.bridgeUrl) {
    throw new Error("请先填写 Markdown 路径和桥接服务地址。");
  }

  if (!/\.md$/i.test(settings.mdPath)) {
    throw new Error("Markdown 路径要填写具体的 .md 文件，例如 E:\\Notes\\Inbox.md。");
  }

  if (!settings.imageDir) {
    const separatorIndex = Math.max(
      settings.mdPath.lastIndexOf("\\"),
      settings.mdPath.lastIndexOf("/")
    );
    const markdownDirectory = separatorIndex >= 0
      ? settings.mdPath.slice(0, separatorIndex + 1)
      : "";
    settings.imageDir = markdownDirectory + "assets";
    imageDirInput.value = settings.imageDir;
  }

  await chrome.storage.local.set(settings);
  return settings;
}

async function selectProfile(profileId) {
  activeProfileId = profileId;
  const profile = profiles.find((item) => item.id === profileId);

  if (!profile) {
    await chrome.storage.local.set({ activeProfileId: "" });
    setStatus("已切换到未保存的路径。");
    return;
  }

  mdPathInput.value = profile.mdPath;
  imageDirInput.value = profile.imageDir;
  bridgeUrlInput.value = profile.bridgeUrl;
  await chrome.storage.local.set({
    activeProfileId: profile.id,
    mdPath: profile.mdPath,
    imageDir: profile.imageDir,
    bridgeUrl: profile.bridgeUrl
  });
  setStatus("已载入标签：" + profile.name);
}

function openProfileDialog() {
  if (typeof profileDialog.showModal !== "function") {
    const fallbackName = window.prompt("请输入这个路径配置的标签名称：", "");
    if (fallbackName !== null) {
      saveProfileWithName(fallbackName).catch((error) => setStatus(error.message, true));
    }
    return;
  }

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  profileDialogName.value = activeProfile ? activeProfile.name : "";
  profileDialog.showModal();
  window.setTimeout(() => profileDialogName.focus(), 0);
}

async function saveProfileWithName(name) {
  const settings = await readSettings();
  const cleanName = String(name || "").trim();

  if (!cleanName) {
    throw new Error("标签名称不能为空。");
  }

  const existingIndex = profiles.findIndex((profile) => {
    return profile.id === activeProfileId && profile.name === cleanName;
  });

  const profile = {
    id: existingIndex >= 0 ? profiles[existingIndex].id : createProfileId(),
    name: cleanName,
    mdPath: settings.mdPath,
    imageDir: settings.imageDir,
    bridgeUrl: settings.bridgeUrl
  };

  if (existingIndex >= 0) {
    profiles[existingIndex] = profile;
  } else {
    profiles.push(profile);
  }

  activeProfileId = profile.id;
  await chrome.storage.local.set({
    profiles: profiles,
    activeProfileId: activeProfileId
  });
  renderProfiles();
  profileSelect.value = activeProfileId;
  setStatus("标签已保存：" + profile.name);
}

async function deleteProfile() {
  if (!activeProfileId) {
    throw new Error("请先从下拉框选择要删除的标签。");
  }

  const profile = profiles.find((item) => item.id === activeProfileId);
  if (!profile) {
    throw new Error("找不到当前标签。");
  }

  if (!window.confirm("确定删除标签“" + profile.name + "”吗？")) {
    return;
  }

  profiles = profiles.filter((item) => item.id !== activeProfileId);
  activeProfileId = "";
  await chrome.storage.local.set({
    profiles: profiles,
    activeProfileId: ""
  });
  renderProfiles();
  setStatus("标签已删除：" + profile.name);
}

async function checkBridge() {
  const bridgeUrl = bridgeUrlInput.value.trim().replace(/\/+$/, "");
  if (!bridgeUrl) {
    throw new Error("请先填写本地桥接服务地址。");
  }

  const response = await fetch(bridgeUrl + "/health", {
    method: "GET",
    cache: "no-store"
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.ok) {
    throw new Error("桥接服务没有正常响应。");
  }

  setStatus("桥接服务运行正常，可以保存当前页面。");
}

profileSelect.addEventListener("change", async () => {
  try {
    await selectProfile(profileSelect.value);
  } catch (error) {
    setStatus(error.message, true);
  }
});

saveProfileButton.addEventListener("click", async () => {
  try {
    await readSettings();
    openProfileDialog();
  } catch (error) {
    setStatus(error.message, true);
  }
});

profileDialogCancel.addEventListener("click", () => {
  profileDialog.close();
});

profileDialogForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const confirmButton = document.querySelector("#profile-dialog-confirm");
  confirmButton.disabled = true;

  try {
    await saveProfileWithName(profileDialogName.value);
    profileDialog.close();
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    confirmButton.disabled = false;
  }
});

deleteProfileButton.addEventListener("click", async () => {
  deleteProfileButton.disabled = true;
  try {
    await deleteProfile();
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    deleteProfileButton.disabled = false;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await readSettings();
    setStatus("当前路径设置已保存。");
  } catch (error) {
    setStatus(error.message, true);
  }
});

checkServiceButton.addEventListener("click", async () => {
  checkServiceButton.disabled = true;
  try {
    await checkBridge();
  } catch (error) {
    if (String(error.message).includes("Failed to fetch")) {
      setStatus("桥接服务未启动，请双击项目目录里的 start-quicKeep.cmd。", true);
    } else {
      setStatus(error.message, true);
    }
  } finally {
    checkServiceButton.disabled = false;
  }
});

captureButton.addEventListener("click", async () => {
  captureButton.disabled = true;
  saveSettingsButton.disabled = true;
  checkServiceButton.disabled = true;
  saveProfileButton.disabled = true;
  deleteProfileButton.disabled = true;
  setStatus("正在截图并写入 Markdown…");

  try {
    const settings = await readSettings();
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    const tab = tabs[0];

    if (!tab || !tab.windowId) {
      throw new Error("没有找到当前标签页。");
    }

    if (!tab.url || /^(edge|chrome|about|devtools):/i.test(tab.url)) {
      throw new Error("浏览器内部页面不能被截图，请切换到普通网页。");
    }

    const imageData = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png"
    });

    const response = await fetch(settings.bridgeUrl + "/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        imageData: imageData,
        url: tab.url,
        title: tab.title || "QuicKeep capture",
        mdPath: settings.mdPath,
        imageDir: settings.imageDir
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || ("桥接服务返回 HTTP " + response.status + "。"));
    }

    setStatus("已保存：" + result.imagePath);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    if (message.includes("Failed to fetch")) {
      setStatus("桥接服务未启动，请双击项目目录里的 start-quicKeep.cmd。", true);
    } else {
      setStatus(message, true);
    }
  } finally {
    captureButton.disabled = false;
    saveSettingsButton.disabled = false;
    checkServiceButton.disabled = false;
    saveProfileButton.disabled = false;
    deleteProfileButton.disabled = false;
  }
});

loadSettings()
  .then(() => checkBridge())
  .catch((error) => {
    if (String(error.message).includes("Failed to fetch")) {
      setStatus("桥接服务未启动，请双击项目目录里的 start-quicKeep.cmd。", true);
    } else if (error.message) {
      setStatus(error.message, true);
    }
  });