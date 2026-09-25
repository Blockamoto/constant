const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => [...document.querySelectorAll(selector)];

const title = qs("#viewTitle");

qsa(".nav").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    qsa(".nav").forEach((item) => item.classList.toggle("active", item === button));
    qsa(".view").forEach((section) => section.classList.toggle("active", section.id === view));
    title.textContent = button.textContent.trim();
    history.replaceState(null, "", `#${view}`);
  });
});

qs("#logoutButton")?.addEventListener("click", async () => {
  qs("#logoutButton").disabled = true;
  try {
    await fetch("/api/logout", { method: "POST" });
  } finally {
    location.assign("/login");
  }
});

function statusLabel(value) {
  return value.replaceAll("_", " ");
}

function milestoneCard(item, index) {
  return `
    <article class="milestone">
      <span class="index">0${index + 1}</span>
      <strong>${item.label}</strong>
      <p>${item.note || ""}</p>
      <span class="tag ${item.status}">${statusLabel(item.status)}</span>
    </article>
  `;
}

function obligationCard(item) {
  return `
    <article class="obligation">
      <span class="category">${item.category}</span>
      <div>
        <strong>${item.label}</strong>
        <p>${item.note || ""}</p>
      </div>
      <span class="tag ${item.status}">${statusLabel(item.status)}</span>
    </article>
  `;
}

async function checkedFetch(path) {
  const response = await fetch(path);
  if (response.status === 401) {
    location.assign("/login");
    throw new Error("Session expired");
  }
  return response;
}

async function load() {
  const [statusRes, companyRes, obligationsRes] = await Promise.all([
    checkedFetch("/api/status"),
    checkedFetch("/api/company"),
    checkedFetch("/api/obligations")
  ]);

  if (!statusRes.ok || !companyRes.ok || !obligationsRes.ok) {
    throw new Error("Constant API is incomplete");
  }

  const status = await statusRes.json();
  const company = await companyRes.json();
  const obligations = await obligationsRes.json();

  qs("#serviceState").textContent = `Engine online · ${status.version}`;
  qs(".live-dot").classList.add("online");
  qs("#phase").textContent = company.phase;
  qs("#principle").textContent = company.principle;
  qs("#updated").textContent = `State updated ${company.updated}`;

  qs("#milestones").innerHTML = company.milestones.map(milestoneCard).join("");
  qs("#obligationList").innerHTML = obligations.items.map(obligationCard).join("");

  qs("#companyDetails").innerHTML = [
    ["Entity", company.name],
    ["Jurisdiction", company.jurisdiction],
    ["Operating phase", company.phase],
    ["State updated", company.updated]
  ].map(([label, value]) => `
    <div class="detail">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}

const initial = location.hash.slice(1);
if (initial && qs(`#${initial}`) && qs(`.nav[data-view="${initial}"]`)) {
  qs(`.nav[data-view="${initial}"]`).click();
}

load().catch((error) => {
  console.error(error);
  qs("#serviceState").textContent = "Engine unavailable";
});
