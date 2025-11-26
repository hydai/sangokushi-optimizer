/**
 * CSV 解析器
 * 負責解析建築資料 CSV 檔案
 */

const CSVParser = {
    /**
     * 解析 CSV 文字內容
     * @param {string} csvText - CSV 原始文字
     * @returns {Array} 解析後的建築資料陣列
     */
    parse(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim());
        const buildings = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = this.parseLine(line);
            if (values.length < headers.length) continue;

            const building = this.createBuilding(headers, values, i);
            if (building) {
                buildings.push(building);
            }
        }

        return buildings;
    },

    /**
     * 解析單行 CSV（處理可能的引號）
     * @param {string} line - CSV 行
     * @returns {Array} 欄位值陣列
     */
    parseLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        return values;
    },

    /**
     * 建立建築物件
     * @param {Array} headers - 標題陣列
     * @param {Array} values - 值陣列
     * @param {number} rowIndex - 行索引（作為唯一 ID）
     * @returns {Object|null} 建築物件
     */
    createBuilding(headers, values, rowIndex) {
        const building = {
            id: rowIndex,
            name: '',
            type: '',
            position: '',
            agriculture: 0,
            mining: 0,
            military: 0,
            commerce: 0,
            trait: ''
        };

        // 欄位對應
        const fieldMap = {
            '品質': 'name',
            '類型': 'type',
            '位置': 'position',
            '農業': 'agriculture',
            '礦業': 'mining',
            '軍事': 'military',
            '商業': 'commerce',
            '特性': 'trait'
        };

        headers.forEach((header, index) => {
            const field = fieldMap[header];
            if (field && values[index]) {
                const value = values[index];
                if (['agriculture', 'mining', 'military', 'commerce'].includes(field)) {
                    // 解析數值（移除 + 符號）
                    building[field] = parseInt(value.replace('+', ''), 10) || 0;
                } else {
                    building[field] = value;
                }
            }
        });

        // 過濾掉沒有名稱的資料
        if (!building.name) return null;

        return building;
    },

    /**
     * 從 URL 載入 CSV
     * @param {string} url - CSV 檔案 URL
     * @returns {Promise<Array>} 解析後的建築資料
     */
    async loadFromURL(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            return this.parse(text);
        } catch (error) {
            console.error('載入 CSV 失敗:', error);
            return [];
        }
    },

    /**
     * 根據類型分組建築
     * @param {Array} buildings - 建築陣列
     * @returns {Object} 按類型分組的建築
     */
    groupByType(buildings) {
        const groups = {
            '主殿': [],
            '城牆': [],
            '廣場': [],
            '坊市': []
        };

        buildings.forEach(building => {
            if (groups[building.type]) {
                groups[building.type].push(building);
            }
        });

        return groups;
    },

    /**
     * 根據位置分組坊市建築
     * @param {Array} buildings - 坊市建築陣列
     * @returns {Object} 按位置分組的坊市
     */
    groupMarketsByPosition(buildings) {
        const positions = ['西坊', '西市', '東坊', '東市'];
        const groups = {};

        positions.forEach(pos => {
            groups[pos] = buildings.filter(b =>
                b.type === '坊市' && (b.position === pos || b.position === '裝配方案' || b.position === '--')
            );
        });

        return groups;
    }
};

// 匯出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSVParser;
}
