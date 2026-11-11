document.getElementById("register-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("message");
    try {
        const response = await fetch("/api/register", {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({username: document.getElementById("username").value, password: document.getElementById("password").value})
        });
        if (!response.ok) throw new Error(await response.text());
        window.location.href = "login.html";
    } catch (error) { message.textContent = error.message; }
});
