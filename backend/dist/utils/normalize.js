"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeName = normalizeName;
exports.normalizeTitle = normalizeTitle;
function normalizeName(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}
function normalizeTitle(title) {
    return title
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}
