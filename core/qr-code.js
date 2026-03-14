// core/qr-code.js — Minimal self-contained QR Code generator (Version 1-13, EC level M)
// Returns an SVG string. No external dependencies.

// ── GF(256) arithmetic for Reed-Solomon ──
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
{ let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x = (x << 1) ^ (x >= 128 ? 0x11d : 0); } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; }
const gfMul = (a, b) => a && b ? EXP[LOG[a] + LOG[b]] : 0;

function rsGenPoly(n) {
    let g = [1];
    for (let i = 0; i < n; i++) {
        const ng = new Array(g.length + 1).fill(0);
        for (let j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= gfMul(g[j], EXP[i]); }
        g = ng;
    }
    return g;
}

function rsEncode(data, nsym) {
    const gen = rsGenPoly(nsym);
    const buf = new Uint8Array(data.length + nsym);
    buf.set(data);
    for (let i = 0; i < data.length; i++) {
        const c = buf[i];
        if (c) for (let j = 0; j < gen.length; j++) buf[i + j] ^= gfMul(gen[j], c);
    }
    return buf.slice(data.length);
}

// ── QR version parameters (EC level M only, versions 1-13) ──
// [totalCodewords, ecPerBlock, numBlocks]
const VER_PARAMS = [
    null,
    [26, 10, 1],    // V1:  16 data cw, 10 ec
    [44, 16, 1],    // V2:  28 data cw, 16 ec
    [70, 26, 1],    // V3:  44 data cw, 26 ec
    [100, 18, 2],   // V4:  64 data cw, 36 ec
    [134, 24, 2],   // V5:  86 data cw, 48 ec
    [172, 16, 4],   // V6: 108 data cw, 64 ec
    [196, 18, 4],   // V7: 124 data cw, 72 ec
    [242, 22, 4],   // V8: 152 data cw, 88 ec (2 groups: 2x36 + 2x37... simplified)
    [292, 22, 5],   // V9
    [346, 26, 5],   // V10
    [404, 30, 5],   // V11
    [466, 22, 8],   // V12
    [532, 22, 9],   // V13
];

// Alignment pattern center positions per version
const ALIGN_POS = [
    null, [], [6,18], [6,22], [6,26], [6,30], [6,34],
    [6,22,38], [6,24,42], [6,26,46], [6,28,50], [6,30,54], [6,32,58], [6,34,62],
];

function getSize(ver) { return 17 + ver * 4; }

function bestVersion(dataBytes) {
    for (let v = 1; v <= 13; v++) {
        const [total, ecPer, blocks] = VER_PARAMS[v];
        const dataCW = total - ecPer * blocks;
        // Byte mode header: 4 bits mode + 8 or 16 bits length
        const headerBits = 4 + (v <= 9 ? 8 : 16);
        const capacity = dataCW - Math.ceil(headerBits / 8) - 1;
        if (dataBytes <= capacity) return v;
    }
    return 13; // max we support
}

// ── Encode data as byte-mode codewords ──
function encodeData(text, version) {
    const bytes = new TextEncoder().encode(text);
    const [total, ecPer, blocks] = VER_PARAMS[version];
    const dataCW = total - ecPer * blocks;

    const bits = [];
    const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };

    // Mode: byte (0100)
    push(4, 4);
    // Character count
    push(bytes.length, version <= 9 ? 8 : 16);
    // Data
    for (const b of bytes) push(b, 8);
    // Terminator (up to 4 zeros)
    const maxBits = dataCW * 8;
    for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
    // Pad to byte boundary
    while (bits.length % 8 !== 0) bits.push(0);
    // Pad codewords
    const pads = [0xEC, 0x11];
    let pi = 0;
    while (bits.length < maxBits) { push(pads[pi], 8); pi ^= 1; }

    // Convert to codewords
    const cw = new Uint8Array(dataCW);
    for (let i = 0; i < dataCW; i++) {
        let v = 0;
        for (let b = 0; b < 8; b++) v = (v << 1) | (bits[i * 8 + b] || 0);
        cw[i] = v;
    }
    return cw;
}

// ── Build error correction and interleave ──
function buildCodewords(dataCW, version) {
    const [total, ecPer, numBlocks] = VER_PARAMS[version];
    const dataN = total - ecPer * numBlocks;
    const shortBlock = Math.floor(dataN / numBlocks);
    const longBlocks = dataN % numBlocks;

    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    for (let i = 0; i < numBlocks; i++) {
        const bLen = shortBlock + (i >= numBlocks - longBlocks ? 1 : 0);
        const block = dataCW.slice(offset, offset + bLen);
        offset += bLen;
        dataBlocks.push(block);
        ecBlocks.push(rsEncode(block, ecPer));
    }

    // Interleave data
    const result = [];
    const maxDataLen = shortBlock + (longBlocks > 0 ? 1 : 0);
    for (let i = 0; i < maxDataLen; i++)
        for (const b of dataBlocks) if (i < b.length) result.push(b[i]);
    // Interleave EC
    for (let i = 0; i < ecPer; i++)
        for (const b of ecBlocks) result.push(b[i]);

    return new Uint8Array(result);
}

// ── Matrix construction ──
function createMatrix(version) {
    const size = getSize(version);
    // 0 = white, 1 = black, -1 = not yet placed
    const mod = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
    const reserved = Array.from({ length: size }, () => new Uint8Array(size));

    function setMod(r, c, val) {
        if (r >= 0 && r < size && c >= 0 && c < size) { mod[r][c] = val ? 1 : 0; reserved[r][c] = 1; }
    }

    // Finder patterns (top-left, top-right, bottom-left)
    function finderPattern(row, col) {
        for (let dr = -1; dr <= 7; dr++)
            for (let dc = -1; dc <= 7; dc++) {
                const r = row + dr, c = col + dc;
                if (r < 0 || r >= size || c < 0 || c >= size) continue;
                const inOuter = dr === -1 || dr === 7 || dc === -1 || dc === 7;
                const inRing = dr === 0 || dr === 6 || dc === 0 || dc === 6;
                const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
                setMod(r, c, !inOuter && (inRing || inCore) ? 1 : 0);
            }
    }
    finderPattern(0, 0);
    finderPattern(0, size - 7);
    finderPattern(size - 7, 0);

    // Alignment patterns
    const positions = ALIGN_POS[version];
    for (const r of positions) {
        for (const c of positions) {
            // Skip if overlapping with finder
            if (reserved[r]?.[c]) continue;
            for (let dr = -2; dr <= 2; dr++)
                for (let dc = -2; dc <= 2; dc++)
                    setMod(r + dr, c + dc,
                        Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0) ? 1 : 0);
        }
    }

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
        setMod(6, i, i % 2 === 0 ? 1 : 0);
        setMod(i, 6, i % 2 === 0 ? 1 : 0);
    }

    // Dark module
    setMod(size - 8, 8, 1);

    // Reserve format info areas (will be written later)
    for (let i = 0; i < 8; i++) {
        if (!reserved[8][i]) { reserved[8][i] = 1; mod[8][i] = 0; }
        if (!reserved[8][size - 1 - i]) { reserved[8][size - 1 - i] = 1; mod[8][size - 1 - i] = 0; }
        if (!reserved[i][8]) { reserved[i][8] = 1; mod[i][8] = 0; }
        if (!reserved[size - 1 - i][8]) { reserved[size - 1 - i][8] = 1; mod[size - 1 - i][8] = 0; }
    }
    if (!reserved[8][8]) { reserved[8][8] = 1; mod[8][8] = 0; }

    // Reserve version info for version >= 7
    if (version >= 7) {
        for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
            reserved[i][size - 11 + j] = 1; mod[i][size - 11 + j] = 0;
            reserved[size - 11 + j][i] = 1; mod[size - 11 + j][i] = 0;
        }
    }

    return { mod, reserved, size };
}

// ── Place data bits ──
function placeData(matrix, codewords) {
    const { mod, reserved, size } = matrix;
    let bitIdx = 0;
    const totalBits = codewords.length * 8;
    // Columns right-to-left, in pairs
    let col = size - 1;
    while (col >= 0) {
        if (col === 6) col--; // skip timing column
        for (let row = 0; row < size; row++) {
            for (let c = 0; c < 2; c++) {
                const cc = col - c;
                const isUpward = ((Math.floor((size - 1 - col) / 2)) % 2 === 0);
                const rr = isUpward ? size - 1 - row : row;
                if (cc < 0 || cc >= size || rr < 0 || rr >= size) continue;
                if (reserved[rr][cc]) continue;
                if (bitIdx < totalBits) {
                    const byteIdx = bitIdx >> 3;
                    const bitPos = 7 - (bitIdx & 7);
                    mod[rr][cc] = (codewords[byteIdx] >> bitPos) & 1;
                } else {
                    mod[rr][cc] = 0;
                }
                bitIdx++;
            }
        }
        col -= 2;
    }
}

// ── Masking ──
const MASK_FNS = [
    (r, c) => (r + c) % 2 === 0,
    (r, c) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2 + (r * c) % 3) === 0,
    (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,
    (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0,
];

function applyMask(matrix, maskIdx) {
    const { mod, reserved, size } = matrix;
    const fn = MASK_FNS[maskIdx];
    for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
            if (!reserved[r][c]) mod[r][c] ^= fn(r, c) ? 1 : 0;
}

function penalty(mod, size) {
    let score = 0;
    // Rule 1: runs of same color
    for (let r = 0; r < size; r++) {
        let run = 1;
        for (let c = 1; c < size; c++) {
            if (mod[r][c] === mod[r][c - 1]) { run++; } else { if (run >= 5) score += run - 2; run = 1; }
        }
        if (run >= 5) score += run - 2;
    }
    for (let c = 0; c < size; c++) {
        let run = 1;
        for (let r = 1; r < size; r++) {
            if (mod[r][c] === mod[r - 1][c]) { run++; } else { if (run >= 5) score += run - 2; run = 1; }
        }
        if (run >= 5) score += run - 2;
    }
    // Rule 2: 2x2 blocks
    for (let r = 0; r < size - 1; r++)
        for (let c = 0; c < size - 1; c++) {
            const v = mod[r][c];
            if (v === mod[r][c + 1] && v === mod[r + 1][c] && v === mod[r + 1][c + 1]) score += 3;
        }
    return score;
}

// ── Format info ──
// Pre-computed format info bits for EC level M (01) with mask 0-7
// format = (ecLevel << 3) | mask, then BCH(15,5) encoding, then XOR with 0x5412
function calcFormatBits(mask) {
    let data = (0b01 << 3) | mask; // EC level M = 01
    let bits = data << 10;
    // BCH division by generator 0x537
    let gen = 0x537;
    for (let i = 14; i >= 10; i--) {
        if (bits & (1 << i)) bits ^= gen << (i - 10);
    }
    bits = (data << 10) | bits;
    bits ^= 0x5412;
    return bits;
}

function writeFormatInfo(matrix, mask) {
    const { mod, size } = matrix;
    const bits = calcFormatBits(mask);

    // Around top-left finder
    const positions1 = [
        [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[7,8],[8,8],
        [8,7],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0]
    ];
    // Split across other two finders
    const positions2 = [
        [8, size-1],[8, size-2],[8, size-3],[8, size-4],[8, size-5],[8, size-6],[8, size-7],
        [size-7, 8],[size-6, 8],[size-5, 8],[size-4, 8],[size-3, 8],[size-2, 8],[size-1, 8]
    ];

    // Note: format bits are 15 bits, positions1 has 15 entries, positions2 has 14+1
    for (let i = 0; i < 15; i++) {
        const bit = (bits >> i) & 1;
        const [r1, c1] = positions1[i];
        mod[r1][c1] = bit;
        if (i < positions2.length) {
            const [r2, c2] = positions2[i];
            mod[r2][c2] = bit;
        }
    }
}

// ── Version info for version >= 7 ──
function writeVersionInfo(matrix, version) {
    if (version < 7) return;
    const { mod, size } = matrix;
    // BCH(18,6)
    let data = version;
    let bits = data << 12;
    let gen = 0x1F25;
    for (let i = 17; i >= 12; i--) {
        if (bits & (1 << i)) bits ^= gen << (i - 12);
    }
    bits = (data << 12) | bits;

    for (let i = 0; i < 18; i++) {
        const bit = (bits >> i) & 1;
        const r = Math.floor(i / 3), c = size - 11 + (i % 3);
        mod[r][c] = bit;
        mod[c][r] = bit; // transpose for bottom-left
    }
}

// ── Main: generate QR code SVG ──
export function generateQR(text, pixelSize = 200) {
    const version = bestVersion(new TextEncoder().encode(text).length);
    const size = getSize(version);

    // Encode data
    const dataCW = encodeData(text, version);
    const allCW = buildCodewords(dataCW, version);

    // Find best mask
    let bestMask = 0, bestPenalty = Infinity;
    for (let m = 0; m < 8; m++) {
        const matrix = createMatrix(version);
        placeData(matrix, allCW);
        applyMask(matrix, m);
        writeFormatInfo(matrix, m);
        writeVersionInfo(matrix, version);
        const p = penalty(matrix.mod, size);
        if (p < bestPenalty) { bestPenalty = p; bestMask = m; }
    }

    // Build final matrix
    const matrix = createMatrix(version);
    placeData(matrix, allCW);
    applyMask(matrix, bestMask);
    writeFormatInfo(matrix, bestMask);
    writeVersionInfo(matrix, version);

    // Render SVG
    const quiet = 4; // quiet zone modules
    const totalMod = size + quiet * 2;
    const scale = pixelSize / totalMod;
    let paths = "";
    for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
            if (matrix.mod[r][c] === 1)
                paths += `M${c + quiet},${r + quiet}h1v1h-1z`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalMod} ${totalMod}" width="${pixelSize}" height="${pixelSize}" shape-rendering="crispEdges">
<rect width="100%" height="100%" fill="#fff"/>
<path d="${paths}" fill="#2d3748"/>
</svg>`;
}
