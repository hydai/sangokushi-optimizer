/**
 * 特性效果管理器
 * 負責從 CSV 載入特性效果並計算加成
 */

const TraitsManager = {
    // 特性效果資料（從 CSV 載入）
    traits: {},

    /**
     * 從 URL 載入特性效果 CSV
     * @param {string} url - CSV 檔案 URL
     * @returns {Promise<Object>} 特性效果對照表
     */
    async loadFromURL(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            this.traits = this.parseCSV(csvText);
            console.log(`載入 ${Object.keys(this.traits).length} 個特性效果`);
            return this.traits;
        } catch (error) {
            console.error('載入特性 CSV 失敗:', error);
            return {};
        }
    },

    /**
     * 解析特性效果 CSV
     * @param {string} csvText - CSV 文字內容
     * @returns {Object} 特性效果對照表
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return {};

        const traits = {};

        // 跳過標題行，處理每一行
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = this.parseLine(line);
            if (values.length >= 5) {
                const name = values[0].trim();
                if (name) {
                    traits[name] = {
                        agriculture: parseInt(values[1], 10) || 0,
                        mining: parseInt(values[2], 10) || 0,
                        military: parseInt(values[3], 10) || 0,
                        commerce: parseInt(values[4], 10) || 0,
                        extraEffect: values[5] ? values[5].trim() : ''
                    };
                }
            }
        }

        return traits;
    },

    /**
     * 解析 CSV 單行（處理逗號和引號）
     * @param {string} line - CSV 行
     * @returns {Array} 欄位值陣列
     */
    parseLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);

        return result;
    },

    /**
     * 取得特性效果
     * @returns {Object} 特性效果對照表
     */
    getTraits() {
        return this.traits;
    },

    /**
     * 計算特性總加成
     * @param {Array} selectedBuildings - 已選擇的建築陣列
     * @param {Object} traitEffects - 特性效果對照表（可選，預設使用載入的資料）
     * @returns {Object} 特性總加成 { agriculture, mining, military, commerce }
     */
    calculateTraitBonus(selectedBuildings, traitEffects = null) {
        const effects = traitEffects || this.traits;
        const bonus = {
            agriculture: 0,
            mining: 0,
            military: 0,
            commerce: 0
        };

        selectedBuildings.forEach(building => {
            if (building.trait && effects[building.trait]) {
                const effect = effects[building.trait];
                bonus.agriculture += effect.agriculture || 0;
                bonus.mining += effect.mining || 0;
                bonus.military += effect.military || 0;
                bonus.commerce += effect.commerce || 0;
            }
        });

        return bonus;
    },

    /**
     * 取得建築組合的額外效果列表
     * @param {Array} selectedBuildings - 已選擇的建築陣列
     * @returns {Array} 額外效果列表 [{ trait: '特性名', effect: '效果描述' }, ...]
     */
    getExtraEffects(selectedBuildings) {
        const extraEffects = [];

        selectedBuildings.forEach(building => {
            if (building.trait && this.traits[building.trait]) {
                const traitData = this.traits[building.trait];
                if (traitData.extraEffect) {
                    extraEffects.push({
                        trait: building.trait,
                        effect: traitData.extraEffect
                    });
                }
            }
        });

        return extraEffects;
    },

    /**
     * 取得建築的特性效果描述
     * @param {Object} building - 建築
     * @returns {string} 效果描述
     */
    getTraitDescription(building) {
        if (!building.trait) return '';

        const effect = this.traits[building.trait];
        if (!effect) return `${building.trait} (未知特性)`;

        const parts = [];
        if (effect.agriculture) parts.push(`農+${effect.agriculture}`);
        if (effect.mining) parts.push(`礦+${effect.mining}`);
        if (effect.military) parts.push(`軍+${effect.military}`);
        if (effect.commerce) parts.push(`商+${effect.commerce}`);

        if (parts.length === 0 && effect.extraEffect) {
            return `${building.trait}: ${effect.extraEffect}`;
        }

        if (parts.length === 0) return `${building.trait}`;
        return `${building.trait}: ${parts.join(' ')}`;
    },

    /**
     * 將特性效果轉換為顯示格式
     * @param {string} traitName - 特性名稱
     * @returns {string} 顯示文字
     */
    formatEffect(traitName) {
        const effect = this.traits[traitName];
        if (!effect) return '未知特性';

        const parts = [];
        if (effect.agriculture) parts.push(`農業 +${effect.agriculture}`);
        if (effect.mining) parts.push(`礦業 +${effect.mining}`);
        if (effect.military) parts.push(`軍事 +${effect.military}`);
        if (effect.commerce) parts.push(`商業 +${effect.commerce}`);
        if (effect.extraEffect) parts.push(effect.extraEffect);

        return parts.length > 0 ? parts.join(', ') : '無效果';
    }
};

// 匯出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TraitsManager;
}
