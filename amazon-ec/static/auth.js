// 第21回追加：ログインしていないときはログイン画面へ移動する（商品一覧・カート・注文履歴・詳細・支払い画面で使用）
(function () {
    // 確認が終わるまでページを隠す（一瞬だけ表示されるのを防ぐ）
    document.documentElement.style.visibility = "hidden";

    function showUserInHeader(user) {
        const box = document.querySelector(".auth-buttons");
        if (!box) return;
        box.innerHTML = "";
        const badge = document.createElement("span");
        badge.className = "user-badge";
        badge.textContent = `👤 ${user.username} さん`;
        const logoutBtn = document.createElement("button");
        logoutBtn.id = "nav-logout";
        logoutBtn.type = "button";
        logoutBtn.textContent = "ログアウト";
        logoutBtn.addEventListener("click", async () => {
            await fetch("/api/logout", { method: "POST" });
            window.location.href = "login.html";
        });
        box.appendChild(badge);
        box.appendChild(logoutBtn);
    }

    fetch("/api/me")
        .then(response => {
            if (!response.ok) {
                window.location.replace("login.html");
                return null;
            }
            return response.json();
        })
        .then(user => {
            if (!user) return;
            document.documentElement.style.visibility = "visible";
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", () => showUserInHeader(user));
            } else {
                showUserInHeader(user);
            }
        })
        .catch(() => {
            // サーバーに接続できない場合はページをそのまま表示する
            document.documentElement.style.visibility = "visible";
        });
})();
