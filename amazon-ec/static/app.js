document.addEventListener("DOMContentLoaded", () => {
    fetchProducts();
    showLoginStatus();
});

// 第21回追加：ログイン状態の確認表示
function showLoginStatus() {
    const status = document.getElementById("login-status");
    if (!status) return;
    fetch("/api/me")
        .then(response => response.ok ? response.json() : null)
        .then(user => {
            status.textContent = user
                ? `${user.username} さんがログイン中です`
                : "現在ログインしていません";
            // 第22回追加：管理者にだけ「商品管理」リンクを表示する（実際の権限確認はGo側で行う）
            if (user && user.is_admin) {
                const nav = document.querySelector(".nav-links");
                if (nav && !nav.querySelector(".nav-admin")) {
                    const link = document.createElement("a");
                    link.href = "admin.html";
                    link.className = "nav-link nav-admin";
                    link.textContent = "⚙️ 商品管理";
                    nav.appendChild(link);
                }
            }
        })
        .catch(() => {
            status.textContent = "";
        });
}

function fetchProducts() {
    fetch("/api/products")
        .then(response => response.json())
        .then(products => {
            const listDiv = document.getElementById("product-list");
            listDiv.innerHTML = "";
            if (products.length === 0) {
                listDiv.innerHTML = "<p>商品がありません。</p>";
                return;
            }
            products.forEach(product => {
                const card = document.createElement("div");
                card.className = product.image ? "product-card has-image" : "product-card";
                const imageHtml = product.image
                    ? `<a href="detail.html?id=${product.id}"><img class="product-img" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy"></a>`
                    : "";
                card.innerHTML = `
                    ${imageHtml}
                    <div class="product-title">
                        <a href="detail.html?id=${product.id}">${escapeHtml(product.name)}</a>
                    </div>
                    <div class="price">¥${product.price.toLocaleString()}</div>
                    <div class="order-form">
                        <label for="qty-${product.id}">数量:</label>
                        <input type="number" id="qty-${product.id}" value="1" min="1">
                        <button onclick="orderProduct(${product.id})">注文する</button>
                    </div>
                `;
                listDiv.appendChild(card);
            });
        })
        .catch(error => {
            console.error("Error fetching products:", error);
            document.getElementById("product-list").innerText = "商品の取得に失敗しました。";
        });
}

function orderProduct(productId) {
    const qtyInput = document.getElementById(`qty-${productId}`);
    const quantity = parseInt(qtyInput.value, 10);
    if (isNaN(quantity) || quantity <= 0) {
        alert("正当な数量を入力してください。");
        return;
    }
    const payload = {
        product_id: productId,
        quantity: quantity
    };
    fetch("/api/orders", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("注文処理に失敗しました。");
        }
        return response.json();
    })
    .then(data => {
        if (!Number.isSafeInteger(data.id) || data.id <= 0) throw new Error("注文IDを取得できませんでした。");
        window.location.href = `payment.html?orders=${data.id}`;
    })
    .catch(error => {
        console.error("Error creating order:", error);
        alert("注文に失敗しました。");
    });
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}