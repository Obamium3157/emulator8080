const tableBody = document.querySelector("#memoryTable tbody");
const numRows = 256;

function toHex(value, length = 4) {
  return value.toString(16).toUpperCase().padStart(length, "0");
}

for (let i = 0; i < numRows; i++) {
  const row = document.createElement("tr");
  row.dataset.row = i;

  const addrCell = document.createElement("td");
  addrCell.textContent = toHex(i, 4);

  const valCell = document.createElement("td");
  const valInput = document.createElement("input");
  valInput.maxLength = 2;
  valInput.dataset.row = i;
  valInput.dataset.col = "val";

  const cmdCell = document.createElement("td");
  const cmdInput = document.createElement("input");
  cmdInput.dataset.row = i;
  cmdInput.dataset.col = "cmd";

  valInput.addEventListener("input", () => {
    const code = valInput.value.toUpperCase().trim();
    cmdInput.value = reverseOpcodeMap[code] || "";
  });

  cmdInput.addEventListener("input", (e) => {
    const row = parseInt(e.target.dataset.row, 10);
    const inputText = cmdInput.value.replace(/,\s+/g, ",").trim();

    unclaimIfOccupied(row);
    unmarkOwnedRows(row);

    const opcode = opcodeMap[inputText];
    if (opcode) {
      setCellValue(row, "val", opcode);
      return;
    }

    const mviMatch = inputText.match(/^MVI\s+([A-Z]),([0-9A-F]{2})$/i);
    if (mviMatch) {
      const reg = mviMatch[1].toUpperCase();
      const data = mviMatch[2].toUpperCase();
      const fullMnemonic = `MVI ${reg},d8`;
      const code = opcodeMap[fullMnemonic];

      if (code) {
        setCellValue(row, "val", code);
        setCellValue(row + 1, "val", data);
        markRowReadonly(row + 1, row);
        return;
      }
    }


    const parts = inputText.split(" ");
    const command = parts[0].toUpperCase();
    const data = parts[1]?.toUpperCase();

    if (commands8BitTail.includes(command) && data?.length === 2) {
      const fullMnemonic = `${command} d8`;
      const code = opcodeMap[fullMnemonic];
      if (code) {
        setCellValue(row, "val", code);
        setCellValue(row + 1, "val", data);
        markRowReadonly(row + 1, row);
        return;
      }
    }

    const lxiMatch = inputText.match(/^(\w+)\s+([A-Z]{1,2}),([0-9A-F]{4})$/i);
    if (lxiMatch) {
      const base = lxiMatch[1].toUpperCase();
      const reg = lxiMatch[2].toUpperCase();
      const data = lxiMatch[3].toUpperCase();
      const fullMnemonic = `${base} ${reg},d16`;

      const code = opcodeMap[fullMnemonic];
      if (code) {
        setCellValue(row, "val", code);
        setCellValue(row + 1, "val", data.slice(0, 2));
        setCellValue(row + 2, "val", data.slice(2, 4));
        markRowReadonly(row + 1, row);
        markRowReadonly(row + 2, row);
        return;
      }
    }

    if (parts.length === 2 && commands16BitTail.includes(parts[0].toUpperCase())) {
      const code = opcodeMap[`${parts[0].toUpperCase()} a16`];
      const data = parts[1].toUpperCase();
      if (code && data.length === 4) {
        setCellValue(row, "val", code);
        setCellValue(row + 1, "val", data.slice(0, 2));
        setCellValue(row + 2, "val", data.slice(2, 4));
        markRowReadonly(row + 1, row);
        markRowReadonly(row + 2, row);
        return;
      }
    }

    valInput.value = "";
  });

  [valInput, cmdInput].forEach(input => {
    input.addEventListener("keydown", (e) => {
      const currentRow = parseInt(input.dataset.row);
      const col = input.dataset.col;

      let targetRow = currentRow;
      let targetCol = col;

      if (e.key === "Enter" || e.key === "ArrowDown") {
        targetRow = findVisibleRowBelow(currentRow);
      } else if (e.key === "ArrowUp") {
        targetRow = findVisibleRowAbove(currentRow);
      } else if (e.key === "ArrowRight") {
        targetCol = col === "val" ? "cmd" : null;
      } else if (e.key === "ArrowLeft") {
        targetCol = col === "cmd" ? "val" : null;
      } else {
        return;
      }

      e.preventDefault();

      if (targetCol && targetRow !== null) {
        const selector = `input[data-row="${targetRow}"][data-col="${targetCol}"]`;
        const nextInput = document.querySelector(selector);
        if (nextInput) nextInput.focus();
      }
    });
  });

  valCell.appendChild(valInput);
  cmdCell.appendChild(cmdInput);
  row.appendChild(addrCell);
  row.appendChild(valCell);
  row.appendChild(cmdCell);
  tableBody.appendChild(row);
}

function setCellValue(row, col, text) {
  const selector = `input[data-row="${row}"][data-col="${col}"]`;
  const input = document.querySelector(selector);
  if (input) {
    input.value = text;
    input.dispatchEvent(new Event("input"));
  }
}

function markRowReadonly(rowIndex, ownerIndex) {
  const row = tableBody.querySelector(`tr[data-row="${rowIndex}"]`);
  if (!row) return;
  
  const currentOwner = row.dataset.owner;
  if (currentOwner ** parseInt(currentOwner, 10) !== ownerIndex) {
    unmarkOwnedRows(parseInt(currentOwner, 10));
  }

  row.classList.add("readonly-row");
  row.dataset.owner = ownerIndex;

  row.querySelectorAll("input").forEach(input => {
    input.readOnly = true;
    input.tabIndex = -1;
  });
}

function unclaimIfOccupied(row, maxOffset = 2) {
  for (let i = 1; i <= maxOffset; i++) {
    const targetRow = tableBody.querySelector(`tr[data-row="${row + i}"]`);
    if (!targetRow) continue;

    const existingOwner = targetRow.dataset.owner;
    if (existingOwner && parseInt(existingOwner, 10) !== row) {
      unmarkOwnedRows(parseInt(existingOwner, 10));
    }
  }
}

function unmarkOwnedRows(ownerIndex) {
  tableBody.querySelectorAll(`tr[data-owner="${ownerIndex}"]`).forEach(row => {
    row.classList.remove("readonly-row");
    delete row.dataset.owner;
    row.querySelectorAll("input").forEach(input => {
      input.readOnly = false;
      input.tabIndex = 0;
      input.value = "";
    });
  });
}

function findVisibleRowBelow(start) {
  for (let i = start + 1; i < numRows; i++) {
    const row = tableBody.querySelector(`tr[data-row="${i}"]`);
    if (row && !row.classList.contains("readonly-row")) return i;
  }
  return null;
}

function findVisibleRowAbove(start) {
  for (let i = start - 1; i >= 0; i--) {
    const row = tableBody.querySelector(`tr[data-row="${i}"]`);
    if (row && !row.classList.contains("readonly-row")) return i;
  }
  return null;
}
