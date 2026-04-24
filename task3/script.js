let encryptedBytes = null;
let encFileBytes = null;
let decFileBytes = null;

function isPrime(n) {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

function gcd(a, b) {
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function extGcd(a, b) {
  if (a === 0n) return [b, 0n, 1n];
  const [g, x, y] = extGcd(b % a, a);
  return [g, y - (b / a) * x, x];
}

function modInverse(e, phi) {
  const [g, x] = extGcd(BigInt(e), BigInt(phi));
  if (g !== 1n) return null;
  return ((x % BigInt(phi)) + BigInt(phi)) % BigInt(phi);
}

function fastPow(base, exp, mod) {
  let result = 1n;
  base = BigInt(base) % BigInt(mod);
  exp = BigInt(exp);
  mod = BigInt(mod);
  while (exp > 0n) {
    if (exp % 2n === 1n) result = result * base % mod;
    exp = exp >> 1n;
    base = base * base % mod;
  }
  return result;
}

function getParams() {
  return {
    p: parseInt(document.getElementById('enc_p').value) || 0,
    q: parseInt(document.getElementById('enc_q').value) || 0,
    kc: parseInt(document.getElementById('enc_kc').value) || 0,
  };
}

function validateParams() {
  const { p, q, kc } = getParams();
  const el = document.getElementById('param_checks');
  const kel = document.getElementById('computed_keys');

  const pPrime = isPrime(p);
  const qPrime = isPrime(q);
  const pNeqQ = p !== q;
  const r = p * q;
  const phi = (p - 1) * (q - 1);
  const rGt255 = r > 255;
  const kcInRange = kc > 1 && kc < phi;
  const kcCoprime = phi > 0 && gcd(kc, phi) === 1;

  const checks = [
    ['p = ' + p + ' простое?', pPrime],
    ['q = ' + q + ' простое?', qPrime],
    ['p ≠ q?', pNeqQ],
    ['r = p×q = ' + r + ' > 255?', rGt255],
    ['1 < Kc = ' + kc + ' < φ(r) = ' + phi + '?', kcInRange],
    ['gcd(Kc, φ(r)) = gcd(' + kc + ', ' + phi + ') = 1?', kcCoprime],
  ];

  const allOk = pPrime && qPrime && pNeqQ && rGt255 && kcInRange && kcCoprime;

  el.innerHTML = checks.map(function (c) {
    return '<div class="result-row"><span class="result-label">' + c[0] + '</span>' +
      '<span class="badge ' + (c[1] ? 'badge-ok' : 'badge-err') + '">' + (c[1] ? '✓ OK' : '✗ ошибка') + '</span></div>';
  }).join('');

  if (allOk) {
    const ko = modInverse(kc, phi);
    kel.innerHTML =
      '<div class="result-row"><span class="result-label">r (модуль)</span><span class="result-val">' + r + '</span></div>' +
      '<div class="result-row"><span class="result-label">φ(r)</span><span class="result-val">' + phi + '</span></div>' +
      '<div class="result-row"><span class="result-label">Ko (открытый ключ)</span><span class="result-val ok">' + ko + '</span></div>';
  } else {
    kel.innerHTML = '';
  }

  return { ok: allOk, p: p, q: q, kc: kc, r: r, phi: phi };
}

function validateDec() {
  const r = parseInt(document.getElementById('dec_r').value) || 0;
  const kc = parseInt(document.getElementById('dec_kc').value) || 0;
  const el = document.getElementById('dec_checks');

  const checks = [
    ['r = ' + r + ' > 255?', r > 255],
    ['Kc = ' + kc + ' > 1?', kc > 1],
  ];

  el.innerHTML = checks.map(function (c) {
    return '<div class="result-row"><span class="result-label">' + c[0] + '</span>' +
      '<span class="badge ' + (c[1] ? 'badge-ok' : 'badge-err') + '">' + (c[1] ? '✓ OK' : '✗') + '</span></div>';
  }).join('');
}

function fileSelected(input) {
  if (!input.files[0]) return;
  var f = input.files[0];
  document.getElementById('file_info').textContent = f.name + ' (' + f.size + ' байт)';
  var reader = new FileReader();
  reader.onload = function (e) { encFileBytes = new Uint8Array(e.target.result); };
  reader.readAsArrayBuffer(f);
}

function decFileSelected(input) {
  if (!input.files[0]) return;
  var f = input.files[0];
  var isTxt = f.name.toLowerCase().endsWith('.txt');
  document.getElementById('dec_file_info').textContent =
    f.name + ' (' + f.size + ' байт)' + (isTxt ? ' — txt-режим' : ' — rsa-режим');
  decFileBytes = null;
  window._decFileWords = null;
  var reader = new FileReader();
  if (isTxt) {
    reader.onload = function (e) {
      var text = e.target.result.trim();
      window._decFileWords = text.split(/\s+/).map(Number).filter(function (n) { return !isNaN(n); });
    };
    reader.readAsText(f);
  } else {
    reader.onload = function (e) { decFileBytes = new Uint8Array(e.target.result); };
    reader.readAsArrayBuffer(f);
  }
}

function doEncrypt() {
  var res = validateParams();
  if (!res.ok) { showMsg('enc_result', 'Исправьте параметры перед шифрованием', 'err'); return; }
  if (!encFileBytes) { showMsg('enc_result', 'Выберите файл', 'err'); return; }

  var kc = res.kc, r = res.r, phi = res.phi;
  var ko = modInverse(kc, phi);
  var encrypted = [];

  for (var i = 0; i < encFileBytes.length; i++) {
    encrypted.push(Number(fastPow(encFileBytes[i], ko, r)));
  }

  var binBuf = new Uint8Array(encrypted.length * 2);
  for (var i = 0; i < encrypted.length; i++) {
    binBuf[i * 2] = encrypted[i] & 0xFF;
    binBuf[i * 2 + 1] = (encrypted[i] >> 8) & 0xFF;
  }
  encryptedBytes = binBuf;

  window._encText = encrypted.join(' ');

  var maxShow = Math.min(encrypted.length, 80);
  var nums = encrypted.slice(0, maxShow).map(function (n) { return '<span class="num">' + n + '</span>'; }).join(' ');
  var more = encrypted.length > maxShow
    ? '<span style="color:var(--color-text-secondary)"> ... (+' + (encrypted.length - maxShow) + ')</span>'
    : '';

  document.getElementById('enc_result').innerHTML =
    '<div class="card">' +
    '<div class="result-row"><span class="result-label">Зашифровано байт</span><span class="result-val ok">' + encFileBytes.length + '</span></div>' +
    '<div class="result-row"><span class="result-label">Блоков в файле</span><span class="result-val">' + encrypted.length + '</span></div>' +
    '<div class="result-row"><span class="result-label">Использованный ключ Kc</span><span class="result-val">' + ko + '</span></div>' +
    '<hr>' +
    '<div class="section-title">Зашифрованные значения (дес.)</div>' +
    '<div class="output-box">' + nums + more + '</div>' +
    '<div class="actions">' +
    '<button class="btn btn-primary" onclick="downloadEncText()">Скачать .txt (десятичные числа)</button>' +
    '<button class="btn" onclick="downloadEncBin()">Скачать .rsa (бинарный)</button>' +
    '</div>' +
    '</div>';
}

function doDecrypt() {
  var r = parseInt(document.getElementById('dec_r').value) || 0;
  var kc = parseInt(document.getElementById('dec_kc').value) || 0;

  if (r <= 255 || kc <= 1) {
    showMsg('dec_result', 'Проверьте параметры r и Kc', 'err');
    return;
  }

  var words = [];

  if (window._decFileWords) {
    words = window._decFileWords;
  } else if (decFileBytes) {
    if (decFileBytes.length % 2 !== 0) {
      showMsg('dec_result', 'Размер .rsa файла должен быть чётным (16-бит блоки)', 'err');
      return;
    }
    for (var i = 0; i < decFileBytes.length; i += 2) {
      words.push(decFileBytes[i] | (decFileBytes[i + 1] << 8));
    }
  } else {
    var manual = document.getElementById('dec_manual').value.trim();
    if (!manual) { showMsg('dec_result', 'Выберите файл или введите числа вручную', 'err'); return; }
    words = manual.split(/\s+/).map(Number).filter(function (n) { return !isNaN(n); });
  }

  var decrypted = [];
  for (var i = 0; i < words.length; i++) {
    decrypted.push(Number(fastPow(words[i], kc, r)));
  }

  window._decBin = new Uint8Array(decrypted);
  window._decText = decrypted.join(' ');

  var textPreview = '';
  try {
    textPreview = new TextDecoder('utf-8', { fatal: false }).decode(window._decBin).slice(0, 200);
  } catch (e) { }

  var maxShow = Math.min(decrypted.length, 60);
  var nums = decrypted.slice(0, maxShow).map(function (n) { return '<span class="num">' + n + '</span>'; }).join(' ');
  var more = decrypted.length > maxShow
    ? '<span style="color:var(--color-text-secondary)"> ... (+' + (decrypted.length - maxShow) + ')</span>'
    : '';

  document.getElementById('dec_result').innerHTML =
    '<div class="card">' +
    '<div class="result-row"><span class="result-label">Дешифровано блоков</span><span class="result-val ok">' + words.length + '</span></div>' +
    '<div class="result-row"><span class="result-label">Размер исходного файла</span><span class="result-val">' + decrypted.length + ' байт</span></div>' +
    '<hr>' +
    '<div class="section-title">Байты (дес.)</div>' +
    '<div class="output-box">' + nums + more + '</div>' +
    (textPreview
      ? '<div class="section-title" style="margin-top:12px;">Текстовый просмотр</div><div class="output-box" style="font-family:var(--font-sans);white-space:pre-wrap;">' + escHtml(textPreview) + '</div>'
      : '') +
    '<div class="actions">' +
    '<button class="btn btn-primary" onclick="downloadDecText()">Скачать .txt (десятичные байты)</button>' +
    '<button class="btn" onclick="downloadDecBin()">Скачать бинарный файл</button>' +
    '</div>' +
    '</div>';
}

function downloadEncText() {
  if (!window._encText) return;
  triggerDownload(new TextEncoder().encode(window._encText), 'encrypted_decimal.txt', 'text/plain');
}

function downloadEncBin() {
  if (!encryptedBytes) return;
  triggerDownload(encryptedBytes, 'encrypted.rsa', 'application/octet-stream');
}

function downloadDecText() {
  if (!window._decText) return;
  triggerDownload(new TextEncoder().encode(window._decText), 'decrypted_decimal.txt', 'text/plain');
}

function downloadDecBin() {
  if (!window._decBin) return;
  triggerDownload(window._decBin, 'decrypted.bin', 'application/octet-stream');
}

function triggerDownload(data, filename, type) {
  var blob = new Blob([data], { type: type });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function showMsg(elId, text, type) {
  document.getElementById(elId).innerHTML = '<div class="msg ' + type + '">' + text + '</div>';
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function clearEnc() {
  encFileBytes = null;
  encryptedBytes = null;
  window._encText = null;
  document.getElementById('enc_file').value = '';
  document.getElementById('file_info').textContent = 'файл не выбран';
  document.getElementById('enc_result').innerHTML = '';
}

function clearDec() {
  decFileBytes = null;
  window._decBin = null;
  window._decText = null;
  window._decFileWords = null;
  document.getElementById('dec_file').value = '';
  document.getElementById('dec_file_info').textContent = 'файл не выбран';
  document.getElementById('dec_manual').value = '';
  document.getElementById('dec_result').innerHTML = '';
}

function loadExample() {
  document.getElementById('enc_p').value = 61;
  document.getElementById('enc_q').value = 53;
  document.getElementById('enc_kc').value = 17;
  document.getElementById('dec_r').value = 3233;
  document.getElementById('dec_kc').value = 2753;
  validateParams();
  validateDec();
  switchTab('enc');
}

function switchTab(t) {
  var ids = ['enc', 'dec', 'ref'];
  document.querySelectorAll('.tab').forEach(function (el, i) {
    el.classList.toggle('active', ids[i] === t);
  });
  document.querySelectorAll('.panel').forEach(function (el) { el.classList.remove('active'); });
  document.getElementById(t).classList.add('active');
}

document.addEventListener('DOMContentLoaded', function () {
  validateParams();
  validateDec();
});