/**
 * 特性效果管理器
 * 負責特性效果的 CRUD 和計算
 */

const TraitsManager = {
    /**
     * 從建築列表中提取所有特性名稱
     * @param {Array} buildings - 建築陣列
     * @returns {Array} 特性名稱陣列（不重複）
     */
    extractTraitsFromBuildings(buildings) {
        const traits = new Set();
        buildings.forEach(building => {
            if (building.trait && building.trait.trim()) {
                traits.add(building.trait.trim());
            }
        });
        return Array.from(traits).sort();
    },

    /**
     * 計算特性總加成
     * @param {Array} selectedBuildings - 已選擇的建築陣列
     * @param {Object} traitEffects - 特性效果對照表
     * @returns {Object} 特性總加成 { agriculture, mining, military, commerce }
     */
    calculateTraitBonus(selectedBuildings, traitEffects) {
        const bonus = {
            agriculture: 0,
            mining: 0,
            military: 0,
            commerce: 0
        };

        selectedBuildings.forEach(building => {
            if (building.trait && traitEffects[building.trait]) {
                const effect = traitEffects[building.trait];
                bonus.agriculture += effect.agriculture || 0;
                bonus.mining += effect.mining || 0;
                bonus.military += effect.military || 0;
                bonus.commerce += effect.commerce || 0;
            }
        });

        return bonus;
    },

    /**
     * 取得建築的特性效果描述
     * @param {Object} building - 建築
     * @param {Object} traitEffects - 特性效果對照表
     * @returns {string} 效果描述
     */
    getTraitDescription(building, traitEffects) {
        if (!building.trait) return '';

        const effect = traitEffects[building.trait];
        if (!effect) return `${building.trait} (未設定效果)`;

        const parts = [];
        if (effect.agriculture) parts.push(`農+${effect.agriculture}`);
        if (effect.mining) parts.push(`礦+${effect.mining}`);
        if (effect.military) parts.push(`軍+${effect.military}`);
        if (effect.commerce) parts.push(`商+${effect.commerce}`);

        if (parts.length === 0) return `${building.trait} (無效果)`;
        return `${building.trait}: ${parts.join(' ')}`;
    },

    /**
     * 驗證特性效果資料格式
     * @param {Object} effect - 特性效果
     * @returns {boolean} 是否有效
     */
    validateEffect(effect) {
        if (typeof effect !== 'object') return false;

        const fields = ['agriculture', 'mining', 'military', 'commerce'];
        for (const field of fields) {
            if (effect[field] !== undefined && typeof effect[field] !== 'number') {
                return false;
            }
        }

        return true;
    },

    /**
     * 將特性效果轉換為顯示格式
     * @param {Object} effect - 特性效果
     * @returns {string} 顯示文字
     */
    formatEffect(effect) {
        const parts = [];
        if (effect.agriculture) parts.push(`農業 +${effect.agriculture}`);
        if (effect.mining) parts.push(`礦業 +${effect.mining}`);
        if (effect.military) parts.push(`軍事 +${effect.military}`);
        if (effect.commerce) parts.push(`商業 +${effect.commerce}`);

        return parts.length > 0 ? parts.join(', ') : '無效果';
    },

    /**
     * 匯出特性資料為 JSON 字串
     * @param {Object} traits - 特性資料
     * @returns {string} JSON 字串
     */
    exportToJSON(traits) {
        return JSON.stringify(traits, null, 2);
    },

    /**
     * 從 JSON 字串匯入特性資料
     * @param {string} jsonStr - JSON 字串
     * @returns {Object|null} 特性資料或 null（解析失敗）
     */
    importFromJSON(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            if (typeof data !== 'object' || Array.isArray(data)) {
                return null;
            }

            // 驗證每個特性
            for (const [name, effect] of Object.entries(data)) {
                if (!this.validateEffect(effect)) {
                    console.warn(`特性 "${name}" 格式無效，已跳過`);
                    delete data[name];
                }
            }

            return data;
        } catch (e) {
            console.error('JSON 解析失敗:', e);
            return null;
        }
    }
};

// 匯出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TraitsManager;
}
