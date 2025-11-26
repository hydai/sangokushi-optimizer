/**
 * 組合搜尋演算法
 * 負責找出符合條件的建築組合
 */

const Solver = {
    // 門檻值
    THRESHOLDS: [15, 50, 75, 100],

    /**
     * 計算數值達成的門檻數
     * @param {number} value - 數值
     * @returns {number} 達成的門檻數（0-4）
     */
    countThresholds(value) {
        let count = 0;
        for (const threshold of this.THRESHOLDS) {
            if (value >= threshold) count++;
        }
        return count;
    },

    /**
     * 計算組合的門檻分數
     * @param {Object} totals - 總數值 { agriculture, mining, military, commerce }
     * @returns {number} 總門檻分數（0-16）
     */
    calculateThresholdScore(totals) {
        return this.countThresholds(totals.agriculture) +
               this.countThresholds(totals.mining) +
               this.countThresholds(totals.military) +
               this.countThresholds(totals.commerce);
    },

    /**
     * 計算建築組合的總數值
     * @param {Array} buildings - 建築陣列
     * @param {Object} traitEffects - 特性效果對照表
     * @returns {Object} 總數值
     */
    calculateTotals(buildings, traitEffects) {
        const totals = {
            agriculture: 0,
            mining: 0,
            military: 0,
            commerce: 0
        };

        // 加總建築基礎數值
        buildings.forEach(building => {
            totals.agriculture += building.agriculture || 0;
            totals.mining += building.mining || 0;
            totals.military += building.military || 0;
            totals.commerce += building.commerce || 0;
        });

        // 加總特性效果
        const traitBonus = TraitsManager.calculateTraitBonus(buildings, traitEffects);
        totals.agriculture += traitBonus.agriculture;
        totals.mining += traitBonus.mining;
        totals.military += traitBonus.military;
        totals.commerce += traitBonus.commerce;

        return totals;
    },

    /**
     * 檢查組合是否滿足目標需求
     * @param {Object} totals - 總數值
     * @param {Object} targets - 目標需求
     * @returns {boolean} 是否滿足
     */
    meetTargets(totals, targets) {
        return totals.agriculture >= (targets.agriculture || 0) &&
               totals.mining >= (targets.mining || 0) &&
               totals.military >= (targets.military || 0) &&
               totals.commerce >= (targets.commerce || 0);
    },

    /**
     * 搜尋所有可能的組合
     * @param {Object} buildingsBySlot - 按槽位分組的建築
     * @param {Object} enabledSlots - 已啟用的槽位
     * @param {Object} targets - 目標需求
     * @param {Object} traitEffects - 特性效果對照表
     * @param {number} maxResults - 最大結果數
     * @returns {Array} 符合條件的組合（按門檻分數排序）
     */
    search(buildingsBySlot, enabledSlots, targets, traitEffects, maxResults = 5) {
        // 取得啟用的槽位及其對應建築
        const slots = [];
        const slotNames = [];

        // 定義槽位對應
        const slotMapping = {
            mainHall: { key: '主殿', buildings: buildingsBySlot['主殿'] || [] },
            cityWall: { key: '城牆', buildings: buildingsBySlot['城牆'] || [] },
            plaza: { key: '廣場', buildings: buildingsBySlot['廣場'] || [] },
            westMarket1: { key: '西坊', buildings: buildingsBySlot['西坊'] || [] },
            westMarket2: { key: '西市', buildings: buildingsBySlot['西市'] || [] },
            eastMarket1: { key: '東坊', buildings: buildingsBySlot['東坊'] || [] },
            eastMarket2: { key: '東市', buildings: buildingsBySlot['東市'] || [] }
        };

        // 過濾啟用的槽位
        Object.entries(enabledSlots).forEach(([slot, enabled]) => {
            if (enabled && slotMapping[slot]) {
                const { key, buildings } = slotMapping[slot];
                if (buildings.length > 0) {
                    slots.push(buildings);
                    slotNames.push(key);
                }
            }
        });

        if (slots.length === 0) {
            return [];
        }

        // 計算所有組合
        const results = [];
        this.generateCombinations(slots, 0, [], (combination) => {
            const totals = this.calculateTotals(combination, traitEffects);

            if (this.meetTargets(totals, targets)) {
                const score = this.calculateThresholdScore(totals);
                results.push({
                    buildings: combination.map((b, i) => ({
                        slot: slotNames[i],
                        building: b
                    })),
                    totals,
                    thresholdScore: score,
                    thresholdDetails: {
                        agriculture: this.countThresholds(totals.agriculture),
                        mining: this.countThresholds(totals.mining),
                        military: this.countThresholds(totals.military),
                        commerce: this.countThresholds(totals.commerce)
                    }
                });
            }
        });

        // 按門檻分數降序排列
        results.sort((a, b) => b.thresholdScore - a.thresholdScore);

        // 返回 Top N
        return results.slice(0, maxResults);
    },

    /**
     * 遞迴生成所有組合
     * @param {Array} slots - 各槽位的建築陣列
     * @param {number} index - 目前處理的槽位索引
     * @param {Array} current - 目前的選擇
     * @param {Function} callback - 完成一個組合時的回呼
     */
    generateCombinations(slots, index, current, callback) {
        if (index === slots.length) {
            callback([...current]);
            return;
        }

        for (const building of slots[index]) {
            current.push(building);
            this.generateCombinations(slots, index + 1, current, callback);
            current.pop();
        }
    },

    /**
     * 格式化門檻顯示
     * @param {number} value - 數值
     * @returns {string} 門檻指示器 (●●○○)
     */
    formatThresholdIndicator(value) {
        const reached = this.countThresholds(value);
        return '●'.repeat(reached) + '○'.repeat(4 - reached);
    },

    /**
     * 取得門檻顏色等級
     * @param {number} thresholdCount - 達成的門檻數
     * @returns {string} CSS 類名
     */
    getThresholdClass(thresholdCount) {
        if (thresholdCount >= 4) return 'threshold-max';
        if (thresholdCount >= 3) return 'threshold-high';
        if (thresholdCount >= 2) return 'threshold-mid';
        if (thresholdCount >= 1) return 'threshold-low';
        return 'threshold-none';
    },

    /**
     * 估算組合數量
     * @param {Object} buildingsBySlot - 按槽位分組的建築
     * @param {Object} enabledSlots - 已啟用的槽位
     * @returns {number} 預估的組合數量
     */
    estimateCombinations(buildingsBySlot, enabledSlots) {
        let total = 1;

        const slotMapping = {
            mainHall: '主殿',
            cityWall: '城牆',
            plaza: '廣場',
            westMarket1: '西坊',
            westMarket2: '西市',
            eastMarket1: '東坊',
            eastMarket2: '東市'
        };

        Object.entries(enabledSlots).forEach(([slot, enabled]) => {
            if (enabled && slotMapping[slot]) {
                const buildings = buildingsBySlot[slotMapping[slot]] || [];
                if (buildings.length > 0) {
                    total *= buildings.length;
                }
            }
        });

        return total;
    }
};

// 匯出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Solver;
}
