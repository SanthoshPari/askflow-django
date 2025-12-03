// src/api.js

// Generic helper to call JSON APIs with strong logging
// src/api.js

// Generic helper to call JSON APIs with strong logging
async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",           // send Django session cookie
    ...options,                       // method, body, etc.
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  // Read raw text first for easier debugging
  const text = await response.text();

  if (!response.ok) {
    console.error("API error:", response.status, text);
    throw new Error(`HTTP ${response.status}`);
  }

  if (!text) {
    // No body
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON parse error for URL:", url);
    console.error("Raw response text:", text);
    throw e;
  }
}

// ---------- PROJECTS ----------

// ---------- PROJECTS ----------

export async function getProjects(page = 1, pageSize = 100) {
  const data = await fetchJSON(
    `/api/ver2/projects/?page=${page}&page_size=${pageSize}`
  );

  // Handle different possible shapes safely
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;   // DRF default
  if (Array.isArray(data.result)) return data.result;     // fallback

  console.warn("Unexpected projects payload:", data);
  return [];
}


export async function createProject(name, description = "") {
  const body = { name, description };

  const data = await fetchJSON("/api/ver2/projects/", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return data; // new project object
}

// ---------- TASKS ----------

export async function getTasksForProject(projectId, page = 1, pageSize = 50) {
  const data = await fetchJSON(
    `/api/ver2/tasks/?project=${encodeURIComponent(
      projectId
    )}&page=${page}&page_size=${pageSize}`
  );
  return Array.isArray(data?.results) ? data.results : [];
}

export async function createTask({
  project,
  title,
  status = "TODO",
  priority = "MED",
  due_date = "",
}) {
  const body = {
    project,
    title,
    status,
    priority,
  };

  if (due_date) {
    body.due_date = due_date; // 'YYYY-MM-DD'
  }

  const data = await fetchJSON("/api/ver2/tasks/", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return data; // new task object
}

// ---------- UPDATE TASK (PATCH) ----------

export async function updateTask(taskId, patchData) {
  // VERY IMPORTANT: backticks ``, not quotes
  const url = `/api/ver2/tasks/${taskId}/`;

  console.log("PATCH", url, "payload:", patchData);

  const data = await fetchJSON(url, {
    method: "PATCH",
    body: JSON.stringify(patchData),
  });

  console.log("PATCH response data:", data);
  return data; // updated task object
}
// ---------- DELETE TASK (DELETE) ----------

export async function deleteTask(taskId) {
  const response = await fetch(`/api/ver2/tasks/${taskId}/`, {
    method: "DELETE",
    credentials: "include",
  });

  // Backend returns 204 No Content on success
  if (response.status === 204) {
    return;
  }

  // Any other status is an error
  const text = await response.text().catch(() => "");
  console.error("Delete task failed:", response.status, text);
  throw new Error(`HTTP ${response.status}`);
}
// ---------- BOM (Bill of Materials) ----------

// GET /api/ver2/projects/<project_id>/bom/
export async function getBOMForProject(projectId) {
  const url = `/api/ver2/projects/${projectId}/bom/`;
  const data = await fetchJSON(url);
  return Array.isArray(data) ? data : [];
}

// POST /api/ver2/projects/<project_id>/bom/
export async function createBOMItem(projectId, bomData) {
  const url = `/api/ver2/projects/${projectId}/bom/`;

  const body = {
    category: bomData.category,
    model: bomData.model,
    description: bomData.description || "",
    qty: bomData.qty ?? 1,
    param1: bomData.param1 || "",
    param2: bomData.param2 || "",
    price: bomData.price ?? null,
  };

  const data = await fetchJSON(url, {
    method: "POST",
    body: JSON.stringify(body),
  });

  return data; // created BOM row
}

export async function deleteBOMItem(itemId) {
    const response = await fetch(`/api/ver2/bom/${itemId}/`, {
    method: "DELETE",
    credentials: "include",});
    if (response.status == 204){
        // succcess , no body
        return;

    }
    // If not 204, treat as error
    const text = await response.text().catch(() => "");
    console.error("Delete BOM item failed : ", response.status, text);
    throw new Error(`HTTP ${response.status}`);
    
    
}
// POST /api/ver2/projects/<project_id>/bom/import/
// Body: multipart/form-data with a "file"
export async function importBOMFromExcel(projectId, file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `/api/ver2/projects/${projectId}/bom/import/`,
    {
      method: "POST",
      body: formData,
      credentials: "include",
    }
  );

  const text = await response.text();

  if (!response.ok) {
    console.error("BOM import failed:", response.status, text);
    throw new Error(`HTTP ${response.status}`);
  }

  return text ? JSON.parse(text) : null;
}
// --- ---------------- AUTH ------------------
// POST /api/auth/login/
export async function login(username,password) {
    const body ={username, password};
    const data = await fetchJSON("api/auth/login/",{
        method: "POST",
        body: JSON.stringify(body)
    });
    return data; // { id, username, is_authenticated: true }
}
// POST /api/auth/logout
export async function logout() {
    const res = await fetchJSON("/api/auth/logout/",
        {
            method:"POST",
            credentials:"include",
            headers: {
                Accept: "application/json"
            },});
    if (!res.ok){
        const text = await res.text().catch(() => "");
        console.error("Logout failed ", res.status, text)
        throw new error(`HTTP ${res.status}`);
    }        
}
// GET /api/auth/me
export async function getCurrentUser() {
    try{
        const data = await fetchJSON("/api/auth/me/",{
            method: "GET",
        });
        return data;
    }
    catch(err){
        console.error("getCurrentUse failed ",  err);
        return{is_authenticated: false};
    }
}
