// src/App.jsx
import { useEffect, useState } from 'react';
import {
  getProjects,getTasksForProject,
  createProject,createTask,
  updateTask,deleteTask,
  getBOMForProject,createBOMItem,
  deleteBOMItem,importBOMFromExcel,
  login,logout,getCurrentUser
} from './api';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(null);

  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProjectName, setSelectedProjectName] = useState('');

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState(null);

  const [bomItems, setBomItems] = useState([]);
  const [bomLoading, setBomLoading] = useState(false);
  const [bomError, setBomError] = useState(null);

  // Called when a new BOM item is created
  const handleBOMItemCreated = (item) => {
    setBomItems((prev) => [...prev, item]); // append at bottom
  };

  // 1) Check auth once on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const me = await getCurrentUser();
        if (me && me.is_authenticated) {
          setCurrentUser(me);
        } else {
          setCurrentUser(null);
        }
      } finally {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

  // 2) Load projects on first render (after component mounts)
  useEffect(() => {
    async function load() {
      setProjectsLoading(true);
      setProjectsError(null);
      try {
        const data = await getProjects();
        setProjects(data);
      } catch (err) {
        console.error(err);
        setProjectsError('Failed to load projects');
      } finally {
        setProjectsLoading(false);
      }
    }
    load();
  }, []);

  // 3) Load tasks + BOM whenever selected project changes
  useEffect(() => {
    if (!selectedProjectId) return;

    async function loadTasksAndBOM() {
      // ---- Tasks ----
      setTasksLoading(true);
      setTasksError(null);

      // ---- BOM ----
      setBomLoading(true);
      setBomError(null);

      try {
        const tasksData = await getTasksForProject(selectedProjectId);
        setTasks(tasksData);

        const bomData = await getBOMForProject(selectedProjectId);
        setBomItems(bomData);
      } catch (err) {
        console.error(err);
        setTasksError('Failed to load tasks');
        setBomError('Failed to load BOM');
      } finally {
        setTasksLoading(false);
        setBomLoading(false);
      }
    }

    loadTasksAndBOM();
  }, [selectedProjectId]);

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      setCurrentUser(null);
      setSelectedProjectId(null);
      setSelectedProjectName('');
      setTasks([]);
      setBomItems([]);
    }
  }

  const handleProjectClick = (project) => {
    setSelectedProjectId(project.id);
    setSelectedProjectName(project.name);
  };

  const handleProjectCreated = (project) => {
    setProjects((prev) =>
      [...prev, project].sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const handleTaskCreated = (task) => {
    setTasks((prev) => [task, ...prev]); // newest at top
  };

  async function handleDeleteTask(taskId) {
    const confirmed = window.confirm('Delete this task?');
    if (!confirmed) return;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await deleteTask(taskId);
    } catch (err) {
      console.error('Failed to delete task:', err);
      alert('Failed to delete task on server. Reloading tasks.');
      if (selectedProjectId) {
        try {
          const fresh = await getTasksForProject(selectedProjectId);
          setTasks(fresh);
        } catch (e) {
          console.error('Failed to reload tasks:', e);
        }
      }
    }
  }

  async function handleTaskFieldUpdate(taskId, patchData) {
    // optimistic
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...patchData } : t))
    );

    try {
      const updated = await updateTask(taskId, patchData);
      if (updated && typeof updated.id !== 'undefined') {
        setTasks((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      alert('Failed to update task on server. Please check login and try again.');
    }
  }

  async function handleDeleteBOMItem(itemId) {
    const confirmed = window.confirm('Delete this BOM item?');
    if (!confirmed) return;

    setBomItems((prev) => prev.filter((item) => item.id !== itemId));

    try {
      await deleteBOMItem(itemId);
    } catch (err) {
      console.error('Failed to delete BOM item:', err);
      alert('Failed to delete BOM item. Reloading BOM list.');
      if (selectedProjectId) {
        try {
          const fresh = await getBOMForProject(selectedProjectId);
          setBomItems(fresh);
        } catch (reloadErr) {
          console.error('Failed to reload BOM:', reloadErr);
        }
      }
    }
  }

  function handleExportBOM() {
    if (!selectedProjectId) return;
    window.location.href = `/api/ver2/projects/${selectedProjectId}/bom/export/`;
  }

  // 4) Auth-gate RENDERING (only here, after all hooks)
  if (checkingAuth) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>AskFlow – Projects & Tasks</h1>
        </header>
        <div className="app-body">
          <div className="info" style={{ margin: '24px auto' }}>
            Checking session...
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoggedIn={setCurrentUser} />;
  }

  // 5) Main UI
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>AskFlow – Projects & Tasks</h1>
        {/* If you want a logout button: */}
        {/* <button onClick={handleLogout}>Logout</button> */}
      </header>

      <div className="app-body">
        {/* Left sidebar: Projects */}
        <aside className="sidebar">
          <h2>Projects</h2>

          {projectsLoading && <div className="info">Loading projects...</div>}
          {projectsError && <div className="error">{projectsError}</div>}

          {!projectsLoading && !projectsError && projects.length === 0 && (
            <div className="info">No projects found.</div>
          )}

          <ul className="project-list">
            {projects.map((p) => (
              <li
                key={p.id}
                className={
                  'project-item' + (p.id === selectedProjectId ? ' active' : '')
                }
                onClick={() => handleProjectClick(p)}
              >
                {p.name}
              </li>
            ))}
          </ul>

          <div style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '1rem' }}>Create New Project</h3>
            <ProjectForm onCreated={handleProjectCreated} />
          </div>
        </aside>

        {/* Right side: Tasks */}
        <main className="main-content">
          <h2>
            {selectedProjectId
              ? `Tasks for: ${selectedProjectName}`
              : 'Select a project to view tasks'}
          </h2>

          {selectedProjectId && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem' }}>Create New Task</h3>
              <TaskForm projectId={selectedProjectId} onCreated={handleTaskCreated} />
            </div>
          )}

          {tasksLoading && selectedProjectId && (
            <div className="info">Loading tasks...</div>
          )}
          {tasksError && <div className="error">{tasksError}</div>}

          {!tasksLoading &&
            !tasksError &&
            selectedProjectId &&
            tasks.length > 0 && (
              <TaskTable
                tasks={tasks}
                onUpdateTaskField={handleTaskFieldUpdate}
                onDeleteTask={handleDeleteTask}
              />
            )}

          {!tasksLoading &&
            !tasksError &&
            selectedProjectId &&
            tasks.length === 0 && (
              <div className="info">No tasks for this project.</div>
            )}

          {selectedProjectId && (
            <section style={{ marginTop: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <h3 style={{ marginBottom: 0 }}>BOM</h3>
                <button
                  type="button"
                  onClick={handleExportBOM}
                  style={{ fontSize: '0.85rem', padding: '4px 8px' }}
                >
                  Export BOM (Excel)
                </button>
              </div>

              {bomLoading && <div className="info">Loading BOM...</div>}
              {bomError && <div className="error">{bomError}</div>}

              {!bomLoading && !bomError && (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <BOMForm
                      projectId={selectedProjectId}
                      onCreated={handleBOMItemCreated}
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <BOMImportForm
                      projectId={selectedProjectId}
                      onImported={async () => {
                        const fresh = await getBOMForProject(selectedProjectId);
                        setBomItems(fresh);
                      }}
                    />
                  </div>

                  <BOMTable items={bomItems} onDeleteItem={handleDeleteBOMItem} />
                </>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}


/* ---------- Project creation form ---------- */

function ProjectForm({ onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setSubmitting(true);
      const project = await createProject(name.trim(), description.trim());
      setName('');
      setDescription('');
      if (onCreated) {
        onCreated(project);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to create project (are you logged in?)');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-vertical">
      <div className="form-group">
        <label>Project Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="form-group">
        <label>Description (optional)</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
        />
      </div>
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Project'}
      </button>
    </form>
  );
}

/* ---------- Task creation form ---------- */

function TaskForm({ projectId, onCreated }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('MED'); // MEDIUM
  const [status, setStatus] = useState('TODO');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      setSubmitting(true);
      const task = await createTask({
        project: projectId,
        title: title.trim(),
        status,
        priority,
        due_date: dueDate || '',
      });
      setTitle('');
      setPriority('MED');
      setStatus('TODO');
      setDueDate('');
      if (onCreated) {
        onCreated(task);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to create task (check status/priority & login)');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-horizontal">
      <div className="form-row">
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={submitting}
          >
            <option value="TODO">To Do</option>
            <option value="INPR">In Progress</option>
            <option value="DONE">Done</option>
            <option value="BLKD">Blocked</option>
          </select>
        </div>

        <div className="form-group">
          <label>Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={submitting}
          >
            <option value="LOW">Low</option>
            <option value="MED">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        <div className="form-group">
          <label>Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Task'}
      </button>
    </form>
  );
}

/* ---------- BOM creation form ---------- */

function BOMForm({ projectId, onCreated }) {
  const [category, setCategory] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [qty, setQty] = useState(1);
  const [param1, setParam1] = useState('');
  const [param2, setParam2] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!category.trim()) {
      setError('Category is required');
      return;
    }
    if (!model.trim()) {
      setError('Model is required');
      return;
    }

    // Make sure qty is a positive integer
    const qtyNumber = parseInt(qty, 10);
    if (isNaN(qtyNumber) || qtyNumber <= 0) {
      setError('Qty must be a positive number');
      return;
    }

    try {
      setSubmitting(true);

      const bomData = {
        category: category.trim(),
        model: model.trim(),
        description: description.trim(),
        qty: qtyNumber,
        param1: param1.trim(),
        param2: param2.trim(),
        price: price ? price.trim() : null, // backend expects string or null
      };

      const created = await createBOMItem(projectId, bomData);

      // Reset form
      setCategory('');
      setModel('');
      setDescription('');
      setQty(1);
      setParam1('');
      setParam2('');
      setPrice('');

      // Notify parent (App) so it can update bomItems state
      if (onCreated) {
        onCreated(created);
      }
    } catch (err) {
      console.error('Failed to create BOM item:', err);
      setError('Failed to create BOM item (check login & input values).');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-horizontal">
      <div className="form-row">
        <div className="form-group">
          <label>Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label>Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label>Qty</label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label>Price</label>
          <input
            type="text"
            placeholder="e.g. 450.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label>Param1</label>
          <input
            type="text"
            value={param1}
            onChange={(e) => setParam1(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label>Param2</label>
          <input
            type="text"
            value={param2}
            onChange={(e) => setParam2(e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Adding BOM item...' : 'Add BOM Item'}
      </button>
    </form>
  );
}
/* ---------- BOM import form (Excel → BOM) ---------- */

function BOMImportForm({ projectId, onImported }) {
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!file) {
      setError("Please choose an Excel (.xlsx) file");
      return;
    }

    try {
      setSubmitting(true);
      const result = await importBOMFromExcel(projectId, file);

      const importedCount = result?.imported ?? 0;
      setMessage(`Imported ${importedCount} BOM rows.`);

      // Let parent reload BOM from server if it wants
      if (onImported) {
        onImported(importedCount);
      }

      // Clear file input
      setFile(null);
      // little trick to clear <input type="file"> visually:
      e.target.reset?.();
    } catch (err) {
      console.error("Failed to import BOM:", err);
      setError("Failed to import BOM. Check file format and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileChange(e) {
    const selected = e.target.files && e.target.files[0];
    setFile(selected || null);
    setError(null);
    setMessage(null);
  }

  return (
    <form onSubmit={handleSubmit} className="form-horizontal">
      <div className="form-row" style={{ alignItems: "center" }}>
        <div className="form-group">
          <label>Import BOM (Excel)</label>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <button type="submit" disabled={submitting || !file}>
            {submitting ? "Importing..." : "Upload & Import"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="info">{message}</div>}
    </form>
  );
}



/* ---------- Task table ---------- */

function TaskTable({ tasks, onUpdateTaskField, onDeleteTask }) {
  const handleStatusChange = (task, newStatus) => {
    if (newStatus === task.status) return;
    onUpdateTaskField(task.id, { status: newStatus });
  };

  const handlePriorityChange = (task, newPriority) => {
    if (newPriority === task.priority) return;
    onUpdateTaskField(task.id, { priority: newPriority });
  };

  return (
    <table className="task-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Due Date</th>
          <th>Created</th>
          <th>Actions</th> {/* 👈 new column */}
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => (
          <tr key={t.id}>
            <td>{t.title}</td>

            <td>
              <select
                value={t.status}
                onChange={(e) => handleStatusChange(t, e.target.value)}
              >
                <option value="TODO">To Do</option>
                <option value="INPR">In Progress</option>
                <option value="DONE">Done</option>
                <option value="BLKD">Blocked</option>
              </select>
            </td>

            <td>
              <select
                value={t.priority}
                onChange={(e) => handlePriorityChange(t, e.target.value)}
              >
                <option value="LOW">Low</option>
                <option value="MED">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </td>

            <td>{t.due_date || "-"}</td>
            <td>{t.created_at ? t.created_at.split("T")[0] : "-"}</td>

            <td>
              <button
                onClick={() => onDeleteTask(t.id)}
                style={{ padding: "4px 8px", fontSize: "0.8rem" }}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
/* ---------- BOM table ---------- */

/* ---------- BOM table ---------- */

function BOMTable({ items, onDeleteItem }) {
  const hasItems = items && items.length > 0;

  return (
    <table className="task-table">
      <thead>
        <tr>
          <th>Category</th>
          <th>Model</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Param1</th>
          <th>Param2</th>
          <th>Price</th>
          <th>Actions</th> {/* 👈 new column */}
        </tr>
      </thead>
      <tbody>
        {hasItems ? (
          items.map((row) => (
            <tr key={row.id}>
              <td>{row.category}</td>
              <td>{row.model}</td>
              <td>{row.description}</td>
              <td>{row.qty}</td>
              <td>{row.param1}</td>
              <td>{row.param2}</td>
              <td>{row.price}</td>
              <td>
                <button
                  type="button"
                  onClick={() => onDeleteItem && onDeleteItem(row.id)}
                  style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={8} style={{ textAlign: 'center', fontSize: '0.85rem' }}>
              No BOM items yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// Login Screen
function LoginScreen({ onLoggedIn}){
  const[username, setUsername] = useState("");
  const[password, setPassword] = useState("");
  const[submitting, setSubmitting] = useState(false);
  const[error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (! username.trim() || !password){
      setError("username and password are required.");
      return;
    }
    try{
      setSubmitting(true);
      const user = await login(username.trim(), password);
      if (user && user.is_authenticated){
        onLoggedIn(user); // this sets current user in App

      }else{
        setError("Login failed. check credentials");
      }
    } catch(err){
      console.error("Login error ",err);
      setError(err.message || "Login failed. ");

    }finally{
      setSubmitting(false);
    }

  }
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>AskFlow – Projects & Tasks</h1>
      </header>
      <div
        className="app-body"
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <form
          onSubmit={handleSubmit}
          className="form-vertical"
          style={{
            maxWidth: "320px",
            margin: "0 auto",
            padding: "24px",
            backgroundColor: "#222",
            borderRadius: "8px",
            boxShadow: "0 0 12px rgba(0,0,0,0.5)",
          }}
        >
          <h2 style={{ marginBottom: "16px" }}>Login</h2>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={submitting}>
            {submitting ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );

}

export default App;
