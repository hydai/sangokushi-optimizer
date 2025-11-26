/**
 * 儲存管理器
 * 負責 localStorage 的讀寫操作
 */

const Storage = {
    KEYS: {
        CONFIGS: 'sangokushi_configs',
        CURRENT_CONFIG: 'sangokushi_current',
        USER_BUILDINGS: 'sangokushi_user_buildings'
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
        localStorage.removeItem(this.KEYS.USER_BUILDINGS);
    },

    // ========================================
    // 使用者建築管理
    // ========================================

    /**
     * 取得使用者擁有的建築
     * @returns {Array} 使用者建築陣列
     */
    getUserBuildings() {
        try {
            const data = localStorage.getItem(this.KEYS.USER_BUILDINGS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('讀取使用者建築失敗:', e);
            return [];
        }
    },

    /**
     * 儲存使用者建築
     * @param {Array} buildings - 建築陣列
     * @returns {boolean} 是否成功
     */
    saveUserBuildings(buildings) {
        try {
            localStorage.setItem(this.KEYS.USER_BUILDINGS, JSON.stringify(buildings));
            return true;
        } catch (e) {
            console.error('儲存使用者建築失敗:', e);
            return false;
        }
    },

    /**
     * 新增使用者建築
     * @param {Object} building - 建築物件
     * @returns {Object|null} 新增的建築（含 ID），失敗則回傳 null
     */
    addUserBuilding(building) {
        try {
            const buildings = this.getUserBuildings();
            const newBuilding = {
                ...building,
                id: `user-building-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                addedAt: new Date().toISOString()
            };
            buildings.push(newBuilding);
            this.saveUserBuildings(buildings);
            return newBuilding;
        } catch (e) {
            console.error('新增建築失敗:', e);
            return null;
        }
    },

    /**
     * 刪除使用者建築
     * @param {string} id - 建築 ID
     * @returns {boolean} 是否成功
     */
    removeUserBuilding(id) {
        try {
            const buildings = this.getUserBuildings();
            const filtered = buildings.filter(b => b.id !== id);
            return this.saveUserBuildings(filtered);
        } catch (e) {
            console.error('刪除建築失敗:', e);
            return false;
        }
    },

    /**
     * 重置為預設建築（從 CSV 載入的所有建築）
     * @param {Array} defaultBuildings - 預設建築陣列
     * @returns {boolean} 是否成功
     */
    resetToDefaults(defaultBuildings) {
        const buildingsWithIds = defaultBuildings.map((b, index) => ({
            ...b,
            id: `default-building-${index}-${Date.now()}`,
            addedAt: new Date().toISOString()
        }));
        return this.saveUserBuildings(buildingsWithIds);
    },

    // ========================================
    // 匯出/匯入功能
    // ========================================

    /**
     * 匯出所有資料
     * @returns {Object} 完整的匯出資料
     */
    exportAllData() {
        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            userBuildings: this.getUserBuildings(),
            searchConfigs: this.getConfigs(),
            currentConfig: this.getCurrentConfig()
        };
    },

    /**
     * 匯入資料
     * @param {Object} data - 匯入的資料物件
     * @returns {boolean} 是否成功
     */
    importAllData(data) {
        try {
            if (!data || !data.version) {
                console.error('匯入資料格式錯誤: 缺少版本資訊');
                return false;
            }

            if (data.userBuildings && Array.isArray(data.userBuildings)) {
                this.saveUserBuildings(data.userBuildings);
            }

            if (data.searchConfigs && Array.isArray(data.searchConfigs)) {
                localStorage.setItem(this.KEYS.CONFIGS, JSON.stringify(data.searchConfigs));
            }

            if (data.currentConfig) {
                this.saveCurrentConfig(data.currentConfig);
            }

            return true;
        } catch (e) {
            console.error('匯入資料失敗:', e);
            return false;
        }
    }
};

// 匯出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
