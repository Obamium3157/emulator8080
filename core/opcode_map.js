const opcodeMap = {};
const reverseOpcodeMap = {};

const commands8BitTail = [];
const commands16BitTail = [];

(async function initOpcodeMaps() {
    try {
        const response = await fetch('./backend/commands.txt');
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const text = await response.text();

        const lines = text.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//')) continue;

            const spaceIndex = trimmed.indexOf(" ");
            if (spaceIndex === -1) continue;

            const hex = trimmed.slice(0, spaceIndex).toUpperCase();
            const mnemonic = trimmed.slice(spaceIndex + 1).trim();

            opcodeMap[mnemonic] = hex;
            reverseOpcodeMap[hex] = mnemonic;
        }

        for (cmd in opcodeMap) {
            parts = cmd.split(' ');
            if (cmd.includes('d8')) {
                commands8BitTail.push(parts[0]);
            }
            if (cmd.includes('a16') || cmd.includes('d16')) {
                commands16BitTail.push(parts[0]);
            }
        }

        // console.log(commands8BitTail);
        // console.log(commands16BitTail);
    } catch (error) {
        console.error("Ошибка при загрузке opcodeMap:", error);
    }
})();