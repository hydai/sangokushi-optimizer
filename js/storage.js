/**
 * 儲存管理器
 * 負責 localStorage 的讀寫操作
 */

const Storage = {
    KEYS: {
        CONFIGS: 'sangokushi_configs',
        CURRENT_CONFIG: 'sangokushi_current'
    },

    /**
     * 取得所有已儲存的配置
     * @returns {Array} 配置陣列
     */
    getConfigs() {
        try {
            const data = localStorage.getItem(this.KEYS.CONFIGS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('讀取配置失敗:', e);
            return [];
        }
    },

    /**
     * 儲存配置
     * @param {string} name - 配置名稱
     * @param {Object} config - 配置內容
     * @returns {boolean} 是否成功
     */
    saveConfig(name, config) {
        try {
            const configs = this.getConfigs();
            const existingIndex = configs.findIndex(c => c.name === name);

            const configData = {
                name,
                slots: config.slots,
                targets: config.targets,
                updatedAt: new Date().toISOString()
            };

            if (existingIndex >= 0) {
                configs[existingIndex] = configData;
            } else {
                configs.push(configData);
            }

            localStorage.setItem(this.KEYS.CONFIGS, JSON.stringify(configs));
            return true;
        } catch (e) {
            console.error('儲存配置失敗:', e);
            return false;
        }
    },

    /**
     * 刪除配置
     * @param {string} name - 配置名稱
     * @returns {boolean} 是否成功
     */
    deleteConfig(name) {
        try {
            const configs = this.getConfigs();
            const filtered = configs.filter(c => c.name !== name);
            localStorage.setItem(this.KEYS.CONFIGS, JSON.stringify(filtered));
            return true;
        } catch (e) {
            console.error('刪除配置失敗:', e);
            return false;
        }
    },

    /**
     * 取得目前的配置狀態
     * @returns {Object} 目前配置
     */
    getCurrentConfig() {
        try {
            const data = localStorage.getItem(this.KEYS.CURRENT_CONFIG);
            return data ? JSON.parse(data) : this.getDefaultConfig();
        } catch (e) {
            console.error('讀取目前配置失敗:', e);
            return this.getDefaultConfig();
        }
    },

    /**
     * 儲存目前的配置狀態
     * @param {Object} config - 配置內容
     */
    saveCurrentConfig(config) {
        try {
            localStorage.setItem(this.KEYS.CURRENT_CONFIG, JSON.stringify(config));
        } catch (e) {
            console.error('儲存目前配置失敗:', e);
        }
    },

    /**
     * 取得預設配置
     * @returns {Object} 預設配置
     */
    getDefaultConfig() {
        return {
            slots: {
                mainHall: true,
                cityWall: true,
                plaza: true,
                westMarket1: true,
                westMarket2: true,
                eastMarket1: false,
                eastMarket2: false
            },
            targets: {
                agriculture: 0,
                mining: 0,
                military: 0,
                commerce: 0
            }
        };
    },

    /**
     * 清除所有資料
     */
    clearAll() {
        localStorage.removeItem(this.KEYS.CONFIGS);
        localStorage.removeItem(this.KEYS.CURRENT_CONFIG);
    }
};

// 匯出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
