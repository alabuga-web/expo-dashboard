const state = {
  servers: new Map(),
  tags: new Map(),
  ws: null,
  reconnectTimer: null,
};

function tagKey(serverId, tagName) {
  return `${serverId}::${tagName}`;
}

function formatTs(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return ts;
  }
}

function formatValue(valueText) {
  if (valueText === "ON") return "✓ ON";
  if (valueText === "OFF") return "○ OFF";
  return valueText;
}

function setConnectionStatus(connected) {
  const el = document.getElementById("connection-status");
  el.textContent = connected ? "Live" : "Disconnected";
  el.className = `badge ${connected ? "online" : "offline"}`;
}

function renderServers() {
  const grid = document.getElementById("servers-grid");
  const select = document.getElementById("filter-server");
  const current = select.value;
  const serverIds = new Set();

  grid.innerHTML = "";
  for (const [id, server] of state.servers) {
    serverIds.add(id);
    const card = document.createElement("div");
    card.className = `server-card ${server.status}`;
    card.innerHTML = `
      <h3>${id}</h3>
      <div class="endpoint">${server.endpoint || "—"}</div>
      <div class="status ${server.status}">${server.status.toUpperCase()}</div>
      ${server.last_error ? `<div class="endpoint">${server.last_error}</div>` : ""}
    `;
    grid.appendChild(card);
  }

  select.innerHTML = '<option value="">Все</option>';
  for (const id of [...serverIds].sort()) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id;
    if (id === current) opt.selected = true;
    select.appendChild(opt);
  }
}

function getFilters() {
  return {
    server: document.getElementById("filter-server").value,
    group: document.getElementById("filter-group").value,
    search: document.getElementById("filter-search").value.toLowerCase(),
  };
}

function renderTags(changedKeys = new Set()) {
  const tbody = document.querySelector("#tags-table tbody");
  const { server, group, search } = getFilters();

  const rows = [...state.tags.values()]
    .filter((t) => !server || t.server_id === server)
    .filter((t) => !group || t.tag_group === group)
    .filter((t) => !search || t.tag_name.toLowerCase().includes(search))
    .sort((a, b) =>
      a.server_id.localeCompare(b.server_id) ||
      (a.tag_group || "").localeCompare(b.tag_group || "") ||
      a.tag_name.localeCompare(b.tag_name)
    );

  tbody.innerHTML = rows
    .map((t) => {
      const key = tagKey(t.server_id, t.tag_name);
      const changed = changedKeys.has(key) ? " changed" : "";
      return `
        <tr data-key="${key}">
          <td>${t.server_id}</td>
          <td>${t.tag_group || "—"}</td>
          <td>${t.tag_name}</td>
          <td class="value${changed}">${formatValue(t.value_text)}</td>
          <td>${t.value_type || "—"}</td>
          <td class="ts">${formatTs(t.ts)}</td>
        </tr>
      `;
    })
    .join("");
}

function upsertServer(server) {
  state.servers.set(server.server_id, {
    server_id: server.server_id,
    endpoint: server.endpoint,
    status: server.status,
    last_error: server.last_error || null,
    updated_at: server.updated_at || server.ts,
  });
}

function upsertTag(tag, serverId, ts) {
  const key = tagKey(serverId, tag.name);
  state.tags.set(key, {
    server_id: serverId,
    tag_name: tag.name,
    tag_address: tag.node_id,
    value_text: typeof tag.value === "boolean" ? (tag.value ? "ON" : "OFF") : String(tag.value),
    value_type: tag.value_type || "",
    tag_group: tag.group || "",
    ts: ts,
  });
  return key;
}

function handleSnapshot(msg) {
  state.servers.clear();
  state.tags.clear();

  for (const s of msg.servers || []) {
    upsertServer({
      server_id: s.server_id,
      endpoint: s.endpoint,
      status: s.status,
      last_error: s.last_error,
      updated_at: s.updated_at,
    });
  }

  for (const t of msg.tags || []) {
    state.tags.set(tagKey(t.server_id, t.tag_name), t);
  }

  renderServers();
  renderTags();
}

function handleUpdate(msg) {
  const changed = new Set();
  for (const tag of msg.tags || []) {
    const key = upsertTag(tag, msg.server_id, msg.ts);
    changed.add(key);
  }
  renderTags(changed);
}

function handleServerStatus(msg) {
  upsertServer(msg);
  renderServers();
}

function connectWebSocket() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${location.host}/ws/state`);
  state.ws = ws;

  ws.onopen = () => {
    setConnectionStatus(true);
    if (state.reconnectTimer) {
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = null;
    }
  };

  ws.onclose = () => {
    setConnectionStatus(false);
    state.reconnectTimer = setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = () => ws.close();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    switch (msg.type) {
      case "snapshot":
        handleSnapshot(msg);
        break;
      case "update":
        handleUpdate(msg);
        break;
      case "server_status":
        handleServerStatus(msg);
        break;
    }
  };
}

["filter-server", "filter-group", "filter-search"].forEach((id) => {
  document.getElementById(id).addEventListener("input", () => renderTags());
  document.getElementById(id).addEventListener("change", () => renderTags());
});

connectWebSocket();
