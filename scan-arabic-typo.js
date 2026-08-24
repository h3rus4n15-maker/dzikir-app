#!/usr/bin/env node
/**
 * scan-arabic-typo.js
 * Mendeteksi huruf Latin (a-z, A-Z) yang menyelip di dalam field "arabic"
 * pada file HTML/JS yang berisi data dzikir (format: arabic: "...").
 *
 * CARA PAKAI:
 *   node scan-arabic-typo.js index.html
 *
 * Kalau nama file tidak disebutkan, default-nya "index.html" di folder yang sama.
 */

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2] || 'index.html';

if (!fs.existsSync(filePath)) {
    console.error(`❌ File tidak ditemukan: ${filePath}`);
    console.error(`   Pastikan menjalankan script ini dari folder yang sama dengan file HTML,`);
    console.error(`   atau kasih path lengkap: node scan-arabic-typo.js path/ke/index.html`);
    process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');

// Regex untuk menangkap setiap field: arabic: "....." (termasuk yang multi-baris via \n literal)
// Menangani tanda kutip yang di-escape (\") di dalam string.
const arabicFieldRegex = /arabic:\s*"((?:[^"\\]|\\.)*)"/g;

// Regex untuk mencari huruf Latin a-z/A-Z di dalam string tsb
const latinLetterRegex = /[a-zA-Z]/g;

let match;
let totalFound = 0;
let entryIndex = 0;

// Untuk kasih tahu ini entri ke berapa & title-nya, kita juga tangkap field "id" & "title" terdekat sebelumnya
const idTitleRegex = /id:\s*"([^"]*)"[\s\S]*?title:\s*"([^"]*)"/g;

// Kumpulkan semua posisi id+title dulu
const idTitleMap = [];
let m2;
while ((m2 = idTitleRegex.exec(content)) !== null) {
    idTitleMap.push({ index: m2.index, id: m2[1], title: m2[2] });
}

function findNearestIdTitle(position) {
    let result = { id: '(tidak diketahui)', title: '(tidak diketahui)' };
    for (const entry of idTitleMap) {
        if (entry.index <= position) {
            result = entry;
        } else {
            break;
        }
    }
    return result;
}

console.log(`🔍 Memindai file: ${filePath}\n`);

while ((match = arabicFieldRegex.exec(content)) !== null) {
    entryIndex++;
    const arabicText = match[1];
    const matchPosition = match.index;

    const latinMatches = [...arabicText.matchAll(latinLetterRegex)];

    if (latinMatches.length > 0) {
        totalFound++;
        const { id, title } = findNearestIdTitle(matchPosition);

        console.log(`⚠️  DITEMUKAN di entri "${id}" — ${title}`);

        // Tampilkan setiap huruf latin yang ketemu beserta konteks di sekitarnya
        latinMatches.forEach((lm) => {
            const pos = lm.index;
            const start = Math.max(0, pos - 15);
            const end = Math.min(arabicText.length, pos + 15);
            const context = arabicText.substring(start, end);
            console.log(`    Huruf "${lm[0]}" -> ...${context}...`);
        });
        console.log('');
    }
}

console.log('─'.repeat(50));
if (totalFound === 0) {
    console.log(`✅ Aman! Tidak ada huruf Latin yang menyelip dari ${entryIndex} entri yang diperiksa.`);
} else {
    console.log(`❌ Ditemukan ${totalFound} entri bermasalah dari total ${entryIndex} entri yang diperiksa.`);
    console.log(`   Silakan perbaiki manual di editor menggunakan Find & Replace.`);
}
