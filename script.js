const baseUrl = "http://localhost:3000";
let ownerId = "";
let ownerToken = "";
let appId = "";
let childToken = "";
let childId = "";
let collectionId = "";

function log(msg) {
  document.getElementById("log").textContent += msg + "\n";
}

document.getElementById('appSelect').addEventListener('change', async function () {
  await loadCollection(ownerId);
});

document.getElementById('collectionSelect').addEventListener('change', async function () {
  const selectCollection = this.value;
  document.getElementById('colRemove').value = selectCollection.split("_")[1];
});

// 0. Owner register
async function registerOwner() {
  const email = document.getElementById("regOwnerEmail").value;
  const password = document.getElementById("regOwnerPass").value;

  const res = await fetch(baseUrl + "/auth/register/owner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role: "owner" })
  });
  const data = await res.json();
  log(res.ok ? "Owner registered: " + JSON.stringify(data)
    : "Owner register FAIL: " + JSON.stringify(data));
}

// 1. Owner login
async function ownerLogin() {
  const email = document.getElementById("ownerEmail").value;
  const password = document.getElementById("ownerPass").value;
  const res = await fetch(baseUrl + "/auth/login/owner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role: "owner" })
  });
  const data = await res.json();
  if (res.ok) {
    ownerToken = data.accessToken;
    ownerId = data.userId;
    log("Owner login OK. ownerId=" + ownerId);
    await loadApps(ownerId);
  } else {
    log("Owner login FAIL: " + JSON.stringify(data));
  }
}

// 2. Owner create app
async function createApp() {
  if (!ownerToken) return log("Login owner first!");
  const name = document.getElementById("appName").value;
  const res = await fetch(baseUrl + "/apps/createNewOwnerApp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + ownerToken,
      "x-owner-id": ownerId,
    },
    body: JSON.stringify({ name })
  });
  const data = await res.json();
  if (res.ok) {
    appId = data.appId || data.app;
    log("App created OK. appId=" + appId);
    await loadApps(ownerId);
  } else {
    log("Create app FAIL: " + JSON.stringify(data));
  }
}

// 3. Owner tạo user con
async function createSubUser() {
  if (!ownerId) return log("Login owner first!");
  const appSelect = document.getElementById("appSelect");
  const selectedAppId = appSelect.value;
  if (!selectedAppId) return log("Select an app first!");

  const email = document.getElementById("subEmail").value;
  const password = document.getElementById("subPass").value;
  const role = document.getElementById("subRole").value;
  const res = await fetch(baseUrl + "/auth/register/user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-id": ownerId,
      "x-app-id": selectedAppId,
      "Authorization": "Bearer " + ownerToken,
    },
    body: JSON.stringify({ email, password, role })
  });

  const data = await res.json();
  log(res.ok ? "Sub user created: " + JSON.stringify(data)
    : "Create sub user FAIL: " + JSON.stringify(data));
}

// GET owner apps
async function loadApps(ownerId) {
  try {
    const res = await fetch(baseUrl + `/apps/fetchOwnerApps`, {
      headers: { "Authorization": "Bearer " + ownerToken }
    });
    const apps = await res.json();
    const select = document.getElementById('appSelect');
    select.innerHTML = "";
    apps.forEach(app => {
      const opt = document.createElement('option');
      opt.value = app.appId || app._id;
      opt.textContent = app.name;
      select.appendChild(opt);
    });
    if (apps.length > 0) appId = apps[0].appId || apps[0]._id;
    log("Loaded " + apps.length + " apps.");
    await loadCollection(ownerId);
  } catch (err) {
    log("Load apps error: " + err.message);
  }
}

// 4. Sub user login
async function childLogin() {
  const email = document.getElementById("childEmail").value;
  const password = document.getElementById("childPass").value;
  const selectedAppId = document.getElementById("appSelect").value;
  if (!selectedAppId) return log("Select an app first!");
  const res = await fetch(baseUrl + "/auth/login/user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-id": ownerId,
      "x-app-id": selectedAppId,
      "Authorization": "Bearer " + ownerToken,
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (res.ok) {
    childToken = data.accessToken;
  } else {
    log("Sub user login FAIL: " + JSON.stringify(data));
  }
}

// 5. Sub user create collection
async function createCollection() {
  const selectAppId = document.getElementById("appSelect").value;
  if (!ownerId) { return log("Please Login Owner") };
  if (!selectAppId) { return log("please create new app") };
  const name = document.getElementById("colName").value;
  const res = await fetch(baseUrl + "/manager/create-collection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + ownerToken,
      "x-app-id": selectAppId,
      "x-owner-id": ownerId,
    },
    body: JSON.stringify({ name })
  });
  const data = await res.json().catch(() => null);
  loadCollection(ownerId);
  log("Create collection status=" + res.status + " body=" + JSON.stringify(data));
}

// 6. Sub user remove collection
async function removeCollection() {
  const selectAppId = document.getElementById("appSelect").value;
  const name = document.getElementById("colRemove").value;

  const res = await fetch(baseUrl + "/manager/remove-collection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + ownerToken,
      "x-app-id": selectAppId,
      "x-owner-id": ownerId,
    },
    body: JSON.stringify({ name })
  });
  const data = await res.json().catch(() => null);
  log("Remove collection status=" + res.status + " body=" + JSON.stringify(data));
}

async function loadCollection(ownerId) {
  try {
    const selectAppId = document.getElementById("appSelect").value;
    const res = await fetch(baseUrl + "/manager/fetch-collection", {
      headers: {
        "Authorization": "Bearer " + ownerToken,
        "x-app-id": selectAppId,
        "x-owner-id": ownerId,
      }
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server returned ${res.status}: ${errorText}`);
    }
    const collections = await res.json();
    const select = document.getElementById('collectionSelect');
    select.innerHTML = "";
    collections.forEach(col => {
      const opt = document.createElement('option');
      opt.value = col.collectionId + "_" + col.name.split("_")[1] || col._id + "_" + col.name.split("_")[1];
      opt.textContent = col.name.split("_")[1];
      select.appendChild(opt);
    });
    if (collections.length > 0) {
      collectionId = collections[0]._id || collections[0].name;
    }
    log(`Loaded ${collections.length} collections.`);
  } catch (err) {
    log("Load collections error: " + err.message);
    console.error(err);
  }
}
