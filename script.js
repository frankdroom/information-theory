const N = 34;
const TAPS = [33, 14, 13, 0];

// ─── STATE ───────────────────────────────────────────────────────────────────
let fileBytes = null;
let resultBytes = null;
let resultFileName = '';
let mode = 'enc';

// ─── MODE ─────────────────────────────────────────────────────────────────────
function setMode(m) {
  mode = m;
  document.getElementById('modEnc').classList.toggle('active', m === 'enc');
  document.getElementById('modDec').classList.toggle('active', m === 'dec');
  document.getElementById('encTitle').textContent =
    m === 'enc' ? '⬡ Зашифрованный файл (биты)' : '⬡ Расшифрованный файл (биты)';
}

// ─── REGISTER INPUT ───────────────────────────────────────────────────────────
const regInput   = document.getElementById('regInput');
const regCount   = document.getElementById('regCount');
const regVisual  = document.getElementById('regVisual');

regInput.addEventListener('input', () => {
  // Strip non-binary chars
  const clean = regInput.value.replace(/[^01]/g, '').slice(0, N);
  regInput.value = clean;
  updateRegVisual(clean);
  tryEnableRun();
});

function updateRegVisual(bits) {
  regCount.textContent = `${bits.length} / ${N}`;
  regCount.className = 'reg-count ' + (bits.length === N ? 'ok' : (bits.length > 0 ? '' : ''));
  if (bits.length === N) regCount.className = 'reg-count ok';

  regVisual.innerHTML = '';
  for (let i = 0; i < N; i++) {
    const pos = N - i;   
    const isTap = TAPS.includes(N - 1 - i); 
    const val = bits[i];
    const cell = document.createElement('div');
    cell.className = 'bit-cell ' + (val === '1' ? 'one' : val === '0' ? 'zero' : '');
    if (isTap) cell.classList.add('tap');
    cell.textContent = val || '·';
    cell.title = `Бит ${pos}${isTap ? ' (отвод)' : ''}`;
    regVisual.appendChild(cell);
  }
}

// ─── FILE INPUT ───────────────────────────────────────────────────────────────
const dropzone  = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileInfo  = document.getElementById('fileInfo');

fileInput.addEventListener('change', e => loadFile(e.target.files[0]));
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('drag');
  if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
});

function loadFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    fileBytes = new Uint8Array(ev.target.result);
    resultFileName = file.name;
    fileInfo.style.display = 'block';
    fileInfo.textContent = `✔ ${file.name}  (${fileBytes.length} байт)`;
    tryEnableRun();
  };
  reader.readAsArrayBuffer(file);
}

// ─── ENABLE RUN ───────────────────────────────────────────────────────────────
function tryEnableRun() {
  const bits = regInput.value;
  const ready = bits.length === N && bits.length > 0 && bits.split('').some(b => b === '1')
                && fileBytes !== null;
  document.getElementById('btnRun').disabled = !ready;
}

// ─── LFSR ─────────────────────────────────────────────────────────────────────

function generateKeystream(initBits, length) {
  const reg = new Uint8Array(N);
  for (let i = 0; i < N; i++) reg[i] = parseInt(initBits[i]);

  const stream = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    stream[i] = reg[0]; 
    let fb = 0;
    for (const t of TAPS) fb ^= reg[t];
    for (let j = 0; j < N - 1; j++) reg[j] = reg[j + 1];
    reg[N - 1] = fb;     
  }
  return stream;
}

// ─── MAIN CIPHER ─────────────────────────────────────────────────────────────
async function runCipher() {
  if (mode === "dec") {
  const text = new TextDecoder().decode(fileBytes);
  fileBytes = hexToBytes(text);
}
  const initBits = regInput.value;
  if (initBits.length !== N) { showStatus('error', 'Введите ровно 34 бита'); return; }
  if (!fileBytes)             { showStatus('error', 'Файл не выбран'); return; }
  if (!initBits.includes('1'))  { showStatus('error', 'Регистр не может быть нулевым'); return; }

  document.getElementById('btnRun').disabled = true;
  showStatus('info', '⚙ Генерация ключевой последовательности…');

  await tick();
  showProgress(true);
  setProgress(10, 'Генерация ключа…');

  const totalBits = fileBytes.length * 8;
  const keyBits   = generateKeystream(initBits, totalBits);

  setProgress(50, 'XOR шифрование…');
  await tick();

  // XOR byte by byte
  const result = new Uint8Array(fileBytes.length);
  for (let i = 0; i < fileBytes.length; i++) {
    let keyByte = 0;
    for (let b = 0; b < 8; b++) keyByte = (keyByte << 1) | keyBits[i * 8 + b];
    result[i] = fileBytes[i] ^ keyByte;
  }
  resultBytes = result;

  if (mode === "enc") {
  const hexText = bytesToHex(result);
  resultBytes = new TextEncoder().encode(hexText);
  resultFileName = "encrypted.txt";
}

  setProgress(80, 'Подготовка отображения…');
  await tick();

  const DISP_BITS = Math.min(512, totalBits);
  const DISP_BYTES = Math.min(64, fileBytes.length);

  document.getElementById('dispKey').textContent =
    Array.from(keyBits.slice(0, DISP_BITS)).join('') +
    (totalBits > DISP_BITS ? `\n… (ещё ${totalBits - DISP_BITS} бит)` : '');

  document.getElementById('dispOrig').textContent =
    bytesToBinStr(fileBytes.slice(0, DISP_BYTES)) +
    (fileBytes.length > DISP_BYTES ? `\n… (ещё ${fileBytes.length - DISP_BYTES} байт)` : '');

  document.getElementById('dispEnc').textContent =
    bytesToBinStr(result.slice(0, DISP_BYTES)) +
    (result.length > DISP_BYTES ? `\n… (ещё ${result.length - DISP_BYTES} байт)` : '');

  setProgress(100, 'Готово!');
  await tick();
  showProgress(false);

  const label = mode === 'enc' ? 'зашифрован' : 'расшифрован';
  showStatus('success', `✔ Файл ${label}! ${fileBytes.length} байт обработано. Ключ: ${totalBits} бит.`);
  document.getElementById('btnSave').disabled = false;
  document.getElementById('btnRun').disabled  = false;

  if(fileInput.files[0].name.split('.').pop() === "mp4" )
  {
    resultFileName = 
     fileInput.files[0].name.split('.').slice(0, -1).join('.') + ".enc";
  }
  else
  {
resultFileName = 
     fileInput.files[0].name.split('.').slice(0, -1).join('.');
  }
  


    
}

function bytesToBinStr(bytes) {
  return Array.from(bytes).map(b => b.toString(2).padStart(8, '0')).join(' ');
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────
function saveResult() {
  if (!resultBytes) return;
  const blob = new Blob([resultBytes], { type: 'application/octet-stream' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = resultFileName;
  a.click();
  URL.revokeObjectURL(url);
  showStatus('success', `✔ Файл сохранён: ${resultFileName}`);
}

// ─── RESET ────────────────────────────────────────────────────────────────────
function resetAll() {
  regInput.value = '';
  updateRegVisual('');
  fileBytes = resultBytes = null;
  fileInfo.style.display = 'none';
  fileInput.value = '';
  document.getElementById('dispKey').textContent  = '—';
  document.getElementById('dispOrig').textContent = '—';
  document.getElementById('dispEnc').textContent  = '—';
  document.getElementById('btnRun').disabled  = true;
  document.getElementById('btnSave').disabled = true;
  showStatus('', '');
  showProgress(false);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function showStatus(type, msg) {
  const el = document.getElementById('statusBar');
  if (!type) { el.style.display = 'none'; return; }
  el.className = 'status-bar ' + type;
  el.textContent = msg;
  el.style.display = 'block';
}

function showProgress(on) {
  document.getElementById('progWrap').style.display = on ? 'block' : 'none';
}

function setProgress(pct, label) {
  document.getElementById('progFill').style.width  = pct + '%';
  document.getElementById('progLabel').textContent = label || pct + '%';
}

function tick() { return new Promise(r => setTimeout(r, 0)); }

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
}

function hexToBytes(hex) {
  const clean = hex.replace(/\s+/g, '');
  const arr = new Uint8Array(clean.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return arr;
}