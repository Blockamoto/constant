const form = document.querySelector("#loginForm");
const input = document.querySelector("#password");
const message = document.querySelector("#message");
const button = form.querySelector("button");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  button.disabled = true;
  button.textContent = "Checking…";

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: input.value })
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      message.textContent = body.error || "Access denied.";
      input.select();
      return;
    }

    location.assign("/");
  } catch {
    message.textContent = "Constant could not reach its server.";
  } finally {
    button.disabled = false;
    button.textContent = "Enter Constant";
  }
});
