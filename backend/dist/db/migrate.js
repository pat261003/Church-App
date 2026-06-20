"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const index_1 = __importDefault(require("./index"));
async function migrate() {
    const sql = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../../../database/migration.sql'), 'utf8');
    try {
        await index_1.default.query(sql);
        console.log('Migration completed successfully');
        process.exit(0);
    }
    catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}
migrate();
