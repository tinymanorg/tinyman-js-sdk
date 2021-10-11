"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebStorage = {
    local: {
        setItem(itemName, itemValue) {
            if (localStorage) {
                localStorage.setItem(itemName, JSON.stringify(itemValue));
            }
        },
        getItem(itemName) {
            const storedValue = localStorage?.getItem(itemName);
            return storedValue ? JSON.parse(storedValue) : null;
        },
        removeItem(itemName) {
            if (localStorage) {
                localStorage.removeItem(itemName);
            }
        }
    },
    getFromWebStorage(itemName) {
        return WebStorage.local.getItem(itemName);
    },
    removeFromWebStorage(itemName) {
        WebStorage.local.removeItem(itemName);
    },
    STORED_KEYS: {
        TINYMAN_CACHED_ASSETS: "TINYMAN_CACHED_ASSETS"
    }
};
exports.default = WebStorage;
