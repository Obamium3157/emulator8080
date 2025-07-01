const tableBody = document.querySelector("#memoryTable tbody");
const numRows = 256;

function toHex(value, length = 4) {
  return value.toString(16).toUpperCase().padStart(length, "0");
}

function createInput(row, col, maxLength = 16) {
  const input = document.createElement("input");
  input.dataset.row = row;
  input.dataset.col = col;
  input.maxLength = maxLength;

  return input;
}

function setCellValue(row, col, text) {
  const selector = `input[data-row="${row}"][data-col="${col}"]`;
  const input = document.querySelector(selector);
  if (input && input.value !== text) {
    input.value = text;
    input.dispatchEvent(new Event("input"));
  }
}

function validateArg(arg) {
  return arg && arg.length === 2;
}



function markRowReadonly(rowIndex, ownerIndex) {
  const row = tableBody.querySelector(`tr[data-row="${rowIndex}"]`);
  if (!row) return;

  const currentOwner = row.dataset.owner;
  if (currentOwner && parseInt(currentOwner, 10) !== ownerIndex) {
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



for (let i = 0; i < numRows; i++) {
  const row = document.createElement("tr");
  row.dataset.row = i;

  const addrCell = document.createElement("td");
  addrCell.textContent = toHex(i, 4);

  const valInput = createInput(i, "val", 8);
  const cmdInput = createInput(i, "cmd");

  valInput.addEventListener("input", () => {
    const row = parseInt(valInput.dataset.row, 10);
    const [code, arg0, arg1] = valInput.value.toUpperCase().split(" ");
    if (code.length !== 2) return;

    const mnemonic = reverseOpcodeMap[code];
    if (!mnemonic) return;

    const [command, args] = mnemonic.split(" ");
    
    valInput.value = valInput.value.toUpperCase();
    cmdInput.value = mnemonic;

    if (commands8BitTail.includes(command)) {
      const data = validateArg(arg0)
        ? arg0
        : document.querySelector(`input[data-row="${row + 1}"][data-col="val"]`)?.value.toUpperCase();

      if (validateArg(data)) {
        const formattedCmd = mnemonic.replace("d8", data);
        cmdInput.value = formattedCmd;

        valInput.value = code;
        setCellValue(row + 1, "val", data);
        // setCellValue(row + 1, "cmd", formattedCmd);

        markRowReadonly(row + 1, row);
      }
    }
    else if (commands16BitTail.includes(command)) {
      const lo = validateArg(arg0)
        ? arg0
        : document.querySelector(`input[data-row="${row + 1}"][data-col="val"]`)?.value.toUpperCase();
      const hi = validateArg(arg1)
        ? arg1
        : document.querySelector(`input[data-row="${row + 2}"][data-col="val"]`)?.value.toUpperCase();

      if (validateArg(lo) && validateArg(hi)) {
        const formattedCmd = `${command} ${args.replace(/d16|a16/, hi + lo)}`;
        cmdInput.value = formattedCmd;

        valInput.value = code;
        setCellValue(row + 1, "val", lo);
        setCellValue(row + 2, "val", hi);
        // setCellValue(row + 1, "cmd", formattedCmd);
        // setCellValue(row + 2, "cmd", formattedCmd);

        markRowReadonly(row + 1, row);
        markRowReadonly(row + 2, row);
      }
    }
  });



  cmdInput.addEventListener("input", (e) => {
    const row = parseInt(e.target.dataset.row, 10);
    const inputText = cmdInput.value.replace(/,\s+/g, ",").trim();

    unclaimIfOccupied(row);
    unmarkOwnedRows(row);

    const opcode = opcodeMap[inputText];
    if (opcode) return setCellValue(row, "val", opcode);

    const parts = inputText.split(" ");
    const command = parts[0]?.toUpperCase();
    const data = parts[1]?.toUpperCase();

    const mviMatch = inputText.match(/^MVI\s+([A-Z]),([0-9A-F]{2})$/i);
    if (mviMatch) {
      const fullMnemonic = `MVI ${mviMatch[1].toUpperCase()},d8`;
      const code = opcodeMap[fullMnemonic];
      if (code) {
        setCellValue(row, "val", code);
        setCellValue(row + 1, "val", mviMatch[2]);

        markRowReadonly(row + 1, row);

        cmdInput.value = `MVI ${mviMatch[1].toUpperCase()},${mviMatch[2]}`;

        return;
      }
    }

    if (commands8BitTail.includes(command) && data?.length === 2) {
      const code = opcodeMap[`${command} d8`];
      if (code) {
        setCellValue(row, "val", code);
        setCellValue(row + 1, "val", data);

        markRowReadonly(row + 1, row);

        cmdInput.value = `${command} ${data}`;

        return;
      }
    }

    const lxiMatch = inputText.match(/^(\w+)\s+([A-Z]{1,2}),(\w{4})$/i);
    if (lxiMatch) {
      const fullMnemonic = `${lxiMatch[1].toUpperCase()} ${lxiMatch[2].toUpperCase()},d16`;
      const code = opcodeMap[fullMnemonic];
      const data = lxiMatch[3].toUpperCase();
      if (code && data.length === 4) {
        setCellValue(row, "val", code);
        setCellValue(row + 1, "val", data.slice(2, 4));
        setCellValue(row + 2, "val", data.slice(0, 2));

        markRowReadonly(row + 1, row);
        markRowReadonly(row + 2, row);

        cmdInput.value = `${lxiMatch[1]} ${lxiMatch[2]},${data}`;

        return;
      }
    }

    if (commands16BitTail.includes(command) && data?.length === 4) {
      const code = opcodeMap[`${command} a16`];
      if (code) {
        setCellValue(row, "val", code);
        setCellValue(row + 1, "val", data.slice(2, 4));
        setCellValue(row + 2, "val", data.slice(0, 2));

        markRowReadonly(row + 1, row);
        markRowReadonly(row + 2, row);

        cmdInput.value = `${command} ${data}`;
      }
    }

    valInput.value = "";
  });


  [valInput, cmdInput].forEach(input => {
    input.addEventListener("keydown", (e) => {
      const row = parseInt(input.dataset.row);
      const col = input.dataset.col;
      let nextRow = row;
      let nextCol = col;

      if (e.key === "Enter" || (e.key === "ArrowDown" && e.ctrlKey)) {
        nextRow = findVisibleRowBelow(row);
      } else if (e.key === "ArrowUp" && e.ctrlKey) {
        nextRow = findVisibleRowAbove(row);
      } else if (e.key === "ArrowRight" && e.ctrlKey) {
        nextCol = col === "val" ? "cmd" : null;
      } else if (e.key === "ArrowLeft" && e.ctrlKey) {
        nextCol = col === "cmd" ? "val" : null;
      } else return;

      e.preventDefault();

      if (nextCol && nextRow !== null) {
        const nextInput = document.querySelector(`input[data-row="${nextRow}"][data-col="${nextCol}"]`);
        if (nextInput) nextInput.focus();
      }
    });
  });


  const valCell = document.createElement("td");
  const cmdCell = document.createElement("td");
  valCell.appendChild(valInput);
  cmdCell.appendChild(cmdInput);

  row.appendChild(addrCell);
  row.appendChild(valCell);
  row.appendChild(cmdCell);
  tableBody.appendChild(row);
}
