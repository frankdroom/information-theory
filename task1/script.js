// Алфавиты
const RUS_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";

// ========== Красивая визуализация Rail Fence ==========
function buildPrettyFence(message, rails) {
    if (message.length === 0 || rails < 2) return "";

    const railForIndex = [];
    let rail = 0;
    let direction = 1;
    for (let i = 0; i < message.length; i++) {
        railForIndex[i] = rail;
        rail += direction;
        if (rail === 0 || rail === rails - 1) {
            direction *= -1;
        }
    }

    const rows = Array.from({ length: rails }, () => Array(message.length).fill(" "));
    for (let i = 0; i < message.length; i++) {
        rows[railForIndex[i]][i] = message[i];
    }

    const lines = rows.map((row) => {
        const rowStr = row.join(" ");
        return `│ ${rowStr} │`;
    });

    const topBorder = "┌" + "─".repeat(message.length * 2 + 1) + "┐";
    const bottomBorder = "└" + "─".repeat(message.length * 2 + 1) + "┘";
    
    return [topBorder, ...lines, bottomBorder].join("\n");
}

// ========== Rail Fence ==========
function railEncrypt(text, rails) {
    if (rails < 2) {
        return { cipherText: text, fenceString: "" };
    }

    const letters = [];
    for (let ch of text) {
        if (/[A-Za-z]/.test(ch)) {
            letters.push(ch);
        }
    }

    const plainLetters = letters.join("");
    const fencePretty = buildPrettyFence(plainLetters, rails);

    const fence = Array.from({length: rails}, () => []);
    let rail = 0;
    let direction = 1;
    for (let i = 0; i < plainLetters.length; i++) {
        fence[rail].push(plainLetters[i]);
        rail += direction;
        if (rail === 0 || rail === rails - 1) {
            direction *= -1;
        }
    }
    const cipher = fence.flat().join("");

    let result = "";
    let idx = 0;
    for (let ch of text) {
        if (/[A-Za-z]/.test(ch)) {
            result += cipher[idx++] || "";
        } else {
            result += ch;
        }
    }

    return { cipherText: result, fenceString: fencePretty };
}

function railDecrypt(text, rails) {
    if (rails < 2) return text;

    const letters = [];
    for (let ch of text) {
        if (/[A-Za-z]/.test(ch)) {
            letters.push(ch);
        }
    }
    
    const cipherLetters = letters.join("");
    const pattern = [];
    let rail = 0;
    let direction = 1;
    for (let i = 0; i < cipherLetters.length; i++) {
        pattern.push(rail);
        rail += direction;
        if (rail === 0 || rail === rails - 1) {
            direction *= -1;
        }
    }

    const railCounts = Array(rails).fill(0);
    for (let r of pattern) railCounts[r]++;

    const railsArr = [];
    let idx = 0;
    for (let r = 0; r < rails; r++) {
        railsArr[r] = cipherLetters.slice(idx, idx + railCounts[r]).split("");
        idx += railCounts[r];
    }

    const resultLetters = [];
    const railPositions = Array(rails).fill(0);
    for (let r of pattern) {
        resultLetters.push(railsArr[r][railPositions[r]++]);
    }

    let result = "";
    let letterIdx = 0;
    for (let ch of text) {
        if (/[A-Za-z]/.test(ch)) {
            result += resultLetters[letterIdx++] || "";
        } else {
            result += ch;
        }
    }
    return result;
}

// ========== Виженер ==========
function buildVigenereTable(text, key, mode) {
    key = key.toUpperCase().replace(/[^А-ЯЁ]/g, "");
    if (!key.length) return "";

    // Извлекаем только русские буквы из текста
    const russianLetters = [];
    for (let ch of text) {
        const upper = ch.toUpperCase();
        if (RUS_ALPHABET.includes(upper)) {
            russianLetters.push(ch);
        }
    }

    if (russianLetters.length === 0) return "";

    // Повторяем ключ точно под каждую букву
    let extendedKey = "";
    for (let i = 0; i < russianLetters.length; i++) {
        extendedKey += key[i % key.length];
    }

    let table = "";
    
    // Таблица: исходный текст + ключ + результат
    table += `Исходный текст: ${russianLetters.map(c => c.padEnd(2)).join(" ")}\n`;
    table += `Ключ:           ${extendedKey.split("").map(c => c.padEnd(2)).join(" ")}\n`;
    
    // Вычисляем результат
    let cipherLetters = [];
    for (let i = 0; i < russianLetters.length; i++) {
        const plainChar = russianLetters[i];
        const keyChar = extendedKey[i];
        const upperPlain = plainChar.toUpperCase();
        const upperKey = keyChar;
        
        const pIndex = RUS_ALPHABET.indexOf(upperPlain);
        const kIndex = RUS_ALPHABET.indexOf(upperKey);
        
        let resultIndex;
        if (mode === "encrypt") {
            resultIndex = (pIndex + kIndex) % RUS_ALPHABET.length;
        } else {
            resultIndex = (pIndex - kIndex + RUS_ALPHABET.length) % RUS_ALPHABET.length;
        }
        
        const resultChar = RUS_ALPHABET[resultIndex];
        const finalChar = plainChar === plainChar.toLowerCase() ? resultChar.toLowerCase() : resultChar;
        cipherLetters.push(finalChar);
    }
    
    table += `Результат:      ${cipherLetters.map(c => c.padEnd(2)).join(" ")}\n`;
    table += `═`.repeat(extendedKey.length * 2 + 20) + "\n";
    
    // КЛАССИЧЕСКАЯ таблица Виженера: строки=алфавит слева, столбцы=алфавит сверху
    const colsPerRow = 12;
    table += `\nТаблица Виженера:`;
    
    // Заголовок столбцов (первые colsPerRow букв)
    let header = "  ";
    for (let i = 0; i < RUS_ALPHABET.length; i++) {
        header += " " + RUS_ALPHABET[i];
    }
    table += `\n${header}`;
    
    // Основные строки таблицы
    for (let row = 0; row < RUS_ALPHABET.length; row++) {
        let rowLine = RUS_ALPHABET[row] + " ";
        for (let col = 0; col < RUS_ALPHABET.length; col++) {
            const letterIndex = (row + col) % RUS_ALPHABET.length;
            rowLine += " " + RUS_ALPHABET[letterIndex];
        }
        table += `\n${rowLine}`;
    }
    
    // Пояснение
    table += `\n\nКак пользоваться:`;
    table += `\n• Шифрование: строка=${mode === "encrypt" ? "открытый текст" : "шифртекст"}, столбец=ключ → пересечение=результат`;

    return table;
}

function vigenereEncryptRU(text, key) {
    key = key.toUpperCase().replace(/[^А-ЯЁ]/g, "");
    if (!key.length) return text;

    let result = "";
    let keyIndex = 0;

    for (let ch of text) {
        const upper = ch.toUpperCase();
        const isLetter = RUS_ALPHABET.includes(upper);
        if (!isLetter) {
            result += ch;
            continue;
        }

        const isLower = ch === ch.toLowerCase();
        const pIndex = RUS_ALPHABET.indexOf(upper);
        const kChar = key[keyIndex % key.length];
        const kIndex = RUS_ALPHABET.indexOf(kChar);
        const cIndex = (pIndex + kIndex) % RUS_ALPHABET.length;
        let c = RUS_ALPHABET[cIndex];
        if (isLower) c = c.toLowerCase();

        result += c;
        keyIndex++;
    }
    return result;
}

function vigenereDecryptRU(text, key) {
    key = key.toUpperCase().replace(/[^А-ЯЁ]/g, "");
    if (!key.length) return text;

    let result = "";
    let keyIndex = 0;

    for (let ch of text) {
        const upper = ch.toUpperCase();
        const isLetter = RUS_ALPHABET.includes(upper);
        if (!isLetter) {
            result += ch;
            continue;
        }

        const isLower = ch === ch.toLowerCase();
        const cIndex = RUS_ALPHABET.indexOf(upper);
        const kChar = key[keyIndex % key.length];
        const kIndex = RUS_ALPHABET.indexOf(kChar);
        let pIndex = (cIndex - kIndex + RUS_ALPHABET.length) % RUS_ALPHABET.length;

        let p = RUS_ALPHABET[pIndex];
        if (isLower) p = p.toLowerCase();

        result += p;
        keyIndex++;
    }
    return result;
}

// ========== DOM ==========
const elements = {
    algorithm: document.getElementById("algorithm"),
    railSettings: document.getElementById("rail-settings"),
    vigSettings: document.getElementById("vig-settings"),
    rails: document.getElementById("rails"),
    vigKey: document.getElementById("vigKey"),
    modeRadios: document.getElementsByName("mode"),
    inputText: document.getElementById("inputText"),
    outputText: document.getElementById("outputText"),
    fenceView: document.getElementById("fenceView"),
    fenceLabel: document.getElementById("fenceLabel"),
    vigenereView: document.getElementById("vigenereView"),
    vigenereLabel: document.getElementById("vigenereLabel"),
    processBtn: document.getElementById("processBtn"),
    clearBtn: document.getElementById("clearBtn"),
    fileInput: document.getElementById("fileInput"),
    saveBtn: document.getElementById("saveBtn")
};

elements.algorithm.addEventListener("change", () => {
    const alg = elements.algorithm.value;
    elements.railSettings.style.display = alg === "rail" ? "block" : "none";
    elements.vigSettings.style.display = alg === "vigenere" ? "block" : "none";
});

elements.processBtn.addEventListener("click", () => {
    const alg = elements.algorithm.value;
    const mode = Array.from(elements.modeRadios).find(r => r.checked).value;
    const text = elements.inputText.value;

    if (!text.trim()) {
        alert("Введите текст для обработки.");
        return;
    }

    // очищаем визуализации
    elements.fenceView.style.display = "none";
    elements.fenceLabel.style.display = "none";
    elements.vigenereView.style.display = "none";
    elements.vigenereLabel.style.display = "none";
    elements.fenceView.textContent = "";
    elements.vigenereView.textContent = "";

    let result = "";

    if (alg === "rail") {
        const rails = parseInt(elements.rails.value, 10);
        
        if (isNaN(rails)) {
            alert("Ключ Rail Fence: введите корректное число.");
            return;
        }
        
        // if (rails < 2) {
        //     alert("Число рельсов должно быть ≥ 2.");
        //     return;
        // }

        if (mode === "encrypt") {
            const { cipherText, fenceString } = railEncrypt(text, rails);
            elements.fenceView.textContent = fenceString;
            elements.fenceView.style.display = "block";
            elements.fenceLabel.style.display = "block";
            result = cipherText;
        } else {
            result = railDecrypt(text, rails);
        }
    } else if (alg === "vigenere") {
        const key = elements.vigKey.value.trim();
        if (!key) {
            alert("Введите ключ для Виженера (русские буквы).");
            return;
        }
        
        // Показываем полную таблицу Виженера
        const vigenereTable = buildVigenereTable(text, key, mode);
        elements.vigenereView.textContent = vigenereTable;
        elements.vigenereView.style.display = "block";
        elements.vigenereLabel.style.display = "block";
        
        if (mode === "encrypt") {
            result = vigenereEncryptRU(text, key);
        } else {
            result = vigenereDecryptRU(text, key);
        }
    }

    elements.outputText.value = result;
    elements.saveBtn.disabled = !result.trim();
});

elements.clearBtn.addEventListener("click", () => {
    elements.inputText.value = "";
    elements.outputText.value = "";
    elements.fenceView.textContent = "";
    elements.fenceView.style.display = "none";
    elements.fenceLabel.style.display = "none";
    elements.vigenereView.textContent = "";
    elements.vigenereView.style.display = "none";
    elements.vigenereLabel.style.display = "none";
    elements.saveBtn.disabled = true;
});

elements.fileInput.addEventListener("change", () => {
    const file = elements.fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        elements.inputText.value = e.target.result;
    };
    reader.readAsText(file, "UTF-8");
});

elements.saveBtn.addEventListener("click", () => {
    const text = elements.outputText.value;
    if (!text.trim()) return;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    const alg = elements.algorithm.value;
    const mode = Array.from(elements.modeRadios).find(r => r.checked).value;
    let name = `result_${alg}_${mode}.txt`;

    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
});