// 第22回追加：管理者の商品管理画面（登録・変更・非表示・在庫・画像アップロード）
// 注意：ここで画面を出し分けても安全にはならない。管理者かどうかはGo側のAPIが必ず確認する。

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

let editingId = null;        // 編集中の商品ID（nullなら新規登録）
let currentFilename = "";    // 編集中の商品に今ついている画像ファイル名
let removeImage = false;     // 「画像を外す」が押されたか
let previewUrl = null;

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
    $("product-form").addEventListener("submit", submitForm);
    $("cancel-btn").addEventListener("click", resetForm);
    $("image").addEventListener("change", onImageSelected);
    $("remove-image").addEventListener("click", () => {
        removeImage = true;
        $("image").value = "";
        showPreview("");
    });
    loadProducts();
});

function showMessage(text, isError) {
    const box = $("message");
    box.textContent = text;
    box.classList.toggle("error", !!isError);
}

// 管理APIを呼ぶ共通処理
async function api(url, options) {
    const response = await fetch(url, options);
    if (response.status === 401) {
        window.location.href = "login.html";
        throw new Error("ログインが必要です");
    }
    if (response.status === 403) {
        $("admin-area").hidden = true;
        showMessage("この画面は管理者だけが使えます。", true);
        throw new Error("管理者権限がありません");
    }
    if (!response.ok) {
        throw new Error((await response.text()).trim() || "処理に失敗しました");
    }
    return response.json();
}

async function loadProducts() {
    const tbody = $("admin-products");
    try {
        const products = await api("/api/admin/products");
        tbody.textContent = "";
        if (!products.length) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 7;
            td.textContent = "商品がありません。上のフォームから登録してください。";
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }
        products.forEach(p => tbody.appendChild(buildRow(p)));
    } catch (error) {
        console.error(error);
        if ($("admin-area").hidden) return;
        tbody.innerHTML = "";
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 7;
        td.textContent = "商品一覧を取得できませんでした。";
        tr.appendChild(td);
        tbody.appendChild(tr);
    }
}

function cell(text, className) {
    const td = document.createElement("td");
    td.textContent = text;
    if (className) td.className = className;
    return td;
}

function actionButton(label, className, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn-sm " + className;
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
}

function buildRow(p) {
    const tr = document.createElement("tr");
    if (!p.is_active) tr.className = "row-hidden";

    const imgTd = document.createElement("td");
    imgTd.className = "thumb-cell";
    if (p.image) {
        const img = document.createElement("img");
        img.className = "thumb";
        img.src = p.image;
        img.alt = p.name;
        imgTd.appendChild(img);
    } else {
        const none = document.createElement("span");
        none.className = "thumb thumb-none";
        none.textContent = "🛍️";
        imgTd.appendChild(none);
    }
    tr.appendChild(imgTd);

    tr.appendChild(cell(String(p.id), "num"));
    tr.appendChild(cell(p.name, "name-cell"));
    tr.appendChild(cell("¥" + p.price.toLocaleString(), "num"));
    tr.appendChild(cell(p.stock.toLocaleString(), "num"));

    const statusTd = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge " + (p.is_active ? "badge-on" : "badge-off");
    badge.textContent = p.is_active ? "公開中" : "非表示";
    statusTd.appendChild(badge);
    tr.appendChild(statusTd);

    const opTd = document.createElement("td");
    opTd.className = "ops";
    opTd.appendChild(actionButton("編集", "btn-ghost", () => startEdit(p)));
    if (p.is_active) {
        opTd.appendChild(actionButton("非表示", "btn-danger", () => hideProduct(p)));
    }
    tr.appendChild(opTd);
    return tr;
}

// ---------- 画像プレビュー ----------
function showPreview(src) {
    const box = $("image-preview");
    box.textContent = "";
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    if (src) {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "プレビュー";
        box.appendChild(img);
    } else {
        box.textContent = "画像なし";
    }
    $("remove-image").hidden = !src;
}

function onImageSelected() {
    const file = $("image").files[0];
    if (!file) { showPreview(currentFilename && !removeImage ? "/uploads/" + currentFilename : ""); return; }
    if (!IMAGE_TYPES.includes(file.type)) {
        showMessage("JPEG・PNG・WebPの画像を選んでください。", true);
        $("image").value = "";
        return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
        showMessage("画像は5MB以下にしてください。", true);
        $("image").value = "";
        return;
    }
    showMessage("", false);
    removeImage = false;
    previewUrl = URL.createObjectURL(file);
    const box = $("image-preview");
    box.textContent = "";
    const img = document.createElement("img");
    img.src = previewUrl;
    img.alt = "プレビュー";
    box.appendChild(img);
    $("remove-image").hidden = false;
}

// ---------- 登録・変更 ----------
function startEdit(p) {
    editingId = p.id;
    currentFilename = p.image_filename || "";
    removeImage = false;
    $("name").value = p.name;
    $("price").value = p.price;
    $("stock").value = p.stock;
    $("image").value = "";
    showPreview(p.image || "");
    $("form-title").textContent = `商品を変更（ID: ${p.id}）`;
    $("submit-btn").textContent = "変更を保存する";
    $("cancel-btn").hidden = false;
    showMessage("", false);
    $("product-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
    editingId = null;
    currentFilename = "";
    removeImage = false;
    $("product-form").reset();
    $("stock").value = 0;
    showPreview("");
    $("form-title").textContent = "新しい商品を登録";
    $("submit-btn").textContent = "登録する";
    $("cancel-btn").hidden = true;
}

async function uploadSelectedImage() {
    const file = $("image").files[0];
    if (!file) return null;
    const data = new FormData();
    data.append("image", file);
    const result = await api("/api/admin/upload", { method: "POST", body: data });
    return result.filename;
}

async function submitForm(event) {
    event.preventDefault();
    const submitBtn = $("submit-btn");
    submitBtn.disabled = true;
    try {
        const payload = {
            name: $("name").value.trim(),
            price: parseInt($("price").value, 10),
            stock: parseInt($("stock").value, 10),
        };
        if (!payload.name || !Number.isInteger(payload.price) || !Number.isInteger(payload.stock)) {
            throw new Error("商品名・価格・在庫数量を正しく入力してください。");
        }
        const uploaded = await uploadSelectedImage();
        if (uploaded) {
            payload.image_filename = uploaded;
        } else if (editingId !== null && removeImage) {
            payload.image_filename = "";
        }

        if (editingId === null) {
            await api("/api/admin/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            showMessage("商品を登録しました。", false);
        } else {
            await api(`/api/admin/product?id=${editingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            showMessage("商品を変更しました。", false);
        }
        resetForm();
        await loadProducts();
    } catch (error) {
        console.error(error);
        showMessage(error.message, true);
    } finally {
        submitBtn.disabled = false;
    }
}

// ---------- 非表示（削除扱い） ----------
async function hideProduct(p) {
    if (!confirm(`「${p.name}」を非表示にしますか？\n（注文履歴は残ります）`)) return;
    try {
        await api(`/api/admin/product?id=${p.id}`, { method: "DELETE" });
        showMessage(`「${p.name}」を非表示にしました。`, false);
        if (editingId === p.id) resetForm();
        await loadProducts();
    } catch (error) {
        showMessage(error.message, true);
    }
}
