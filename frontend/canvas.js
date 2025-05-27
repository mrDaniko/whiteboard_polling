// Polling-based Whiteboard client
const FILTERS = ['blur', 'invert', 'edge_detect', 'emboss'];
const ROOM_ID = "room_3351";
const API = "http://127.0.0.1:8000";

const canvas = document.getElementById('board');
canvas.width = 800; // Задаємо розміри
canvas.height = 600;
const ctx = canvas.getContext('2d');
let drawing = false;

const select = document.getElementById("filter-select");
FILTERS.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f;
    opt.textContent = f;
    select.appendChild(opt);
});

document.getElementById("apply-filter").addEventListener("click", applyFilter);
document.getElementById('refresh').onclick = poll;

async function applyFilter() {
    const { width, height } = canvas;
    if (width <= 0 || height <= 0) {
        console.error("Canvas has invalid dimensions:", width, height);
        return;
    }
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    const imgData = ctx.getImageData(0, 0, width, height);

    // Формуємо тривимірний масив [[[R,G,B,A], ...], ...]
    const dataArray = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            row.push([
                imgData.data[idx],     // R
                imgData.data[idx + 1], // G
                imgData.data[idx + 2], // B
                imgData.data[idx + 3]  // A
            ]);
        }
        dataArray.push(row);
    }

    const filterName = select.value;

    const res = await fetch(`http://localhost:8000/filter/${ROOM_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            image_data: dataArray,
            filter_name: filterName,
            width,
            height
        })
    });
    const json = await res.json();

    const newData = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            newData[idx] = json.image_data[y][x][0];     // R
            newData[idx + 1] = json.image_data[y][x][1]; // G
            newData[idx + 2] = json.image_data[y][x][2]; // B
            newData[idx + 3] = json.image_data[y][x][3]; // A
        }
    }
    ctx.putImageData(new ImageData(newData, width, height), 0, 0);
}

canvas.addEventListener('mousedown', () => drawing = true);
canvas.addEventListener('mouseup', () => { drawing = false; ctx.beginPath(); });
canvas.addEventListener('mousemove', e => {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const cmd = { x: e.clientX - rect.left, y: e.clientY - rect.top, type: "line" };
    sendCommand(cmd);
    draw(cmd);
});

function draw(cmd) {
    ctx.lineTo(cmd.x, cmd.y);
    ctx.stroke();
}

async function sendCommand(cmd) {
    await fetch(`${API}/draw/${ROOM_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cmd)
    });
}

async function poll() {
    const res = await fetch(`${API}/draw/${ROOM_ID}`);
    const cmds = await res.json();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    cmds.forEach(draw);
}

// initial data
poll();