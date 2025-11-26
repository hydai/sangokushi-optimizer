/**
 * 主應用程式
 * 負責 UI 控制與各模組整合
 */

const App = {
    // 應用程式狀態
    state: {
        buildings: [],
        buildingsBySlot: {},
        currentConfig: null,
        traits: {}
    },

    /**
     * 安全建立元素的輔助函數
     */
    createElement(tag, className, textContent) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent) el.textContent = textContent;
        return el;
    },

    /**
     * 清空元素內容
     */
    clearElement(el) {
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
    },

    /**
     * 初始化應用程式
     */
    async init() {
        console.log('初始化應用程式...');

        // 載入建築資料
        await this.loadBuildings();

        // 載入儲存的設定
        this.loadSavedSettings();

        // 綁定事件
        this.bindEvents();

        // 渲染 UI
        this.render();

        console.log('應用程式初始化完成');
    },

    /**
     * 載入建築資料
     */
    async loadBuildings() {
        this.state.buildings = await CSVParser.loadFromURL('data/buildings.csv');
        console.log(`載入 ${this.state.buildings.length} 筆建築資料`);

        // 分組處理
        this.processBuildingsBySlot();
    },

    /**
     * 將建築按槽位分組
     */
    processBuildingsBySlot() {
        const buildings = this.state.buildings;

        // 先按類型分組
        const byType = CSVParser.groupByType(buildings);

        // 建立槽位對應
        this.state.buildingsBySlot = {
            '主殿': byType['主殿'] || [],
            '城牆': byType['城牆'] || [],
            '廣場': byType['廣場'] || [],
            '西坊': [],
            '西市': [],
            '東坊': [],
            '東市': []
        };

        // 將坊市建築分配到各槽位
        const markets = byType['坊市'] || [];
        const marketSlots = ['西坊', '西市', '東坊', '東市'];

        markets.forEach(building => {
            if (marketSlots.includes(building.position)) {
                this.state.buildingsBySlot[building.position].push(building);
            } else {
                marketSlots.forEach(slot => {
                    this.state.buildingsBySlot[slot].push(building);
                });
            }
        });

        console.log('建築分組完成:', this.state.buildingsBySlot);
    },

    /**
     * 載入儲存的設定
     */
    loadSavedSettings() {
        this.state.currentConfig = Storage.getCurrentConfig();
        this.state.traits = Storage.getTraits();
    },

    /**
     * 綁定 UI 事件
     */
    bindEvents() {
        // 槽位複選框
        document.querySelectorAll('.slot-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.onSlotChange(e));
        });

        // 目標數值輸入
        document.querySelectorAll('.target-input').forEach(input => {
            input.addEventListener('input', (e) => this.onTargetChange(e));
        });

        // 搜尋按鈕
        document.getElementById('searchBtn')?.addEventListener('click', () => this.search());

        // 配置管理按鈕
        document.getElementById('saveConfigBtn')?.addEventListener('click', () => this.saveConfig());
        document.getElementById('loadConfigBtn')?.addEventListener('click', () => this.showLoadConfigModal());
        document.getElementById('newConfigBtn')?.addEventListener('click', () => this.resetConfig());

        // 特性編輯按鈕
        document.getElementById('editTraitsBtn')?.addEventListener('click', () => this.showTraitsModal());

        // Modal 關閉按鈕
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // 點擊 Modal 背景關閉
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModals();
            });
        });
    },

    /**
     * 渲染 UI
     */
    render() {
        this.renderSlots();
        this.renderTargets();
        this.renderTraitsSummary();
    },

    /**
     * 渲染槽位選擇
     */
    renderSlots() {
        const slots = this.state.currentConfig.slots;
        Object.entries(slots).forEach(([key, value]) => {
            const checkbox = document.getElementById(`slot-${key}`);
            if (checkbox) {
                checkbox.checked = value;
            }
        });
    },

    /**
     * 渲染目標數值
     */
    renderTargets() {
        const targets = this.state.currentConfig.targets;
        Object.entries(targets).forEach(([key, value]) => {
            const input = document.getElementById(`target-${key}`);
            if (input) {
                input.value = value || '';
            }
        });
    },

    /**
     * 渲染特性摘要
     */
    renderTraitsSummary() {
        const container = document.getElementById('traitsSummary');
        if (!container) return;

        this.clearElement(container);

        const traits = Object.keys(this.state.traits);
        const span = document.createElement('span');

        if (traits.length === 0) {
            span.className = 'no-traits';
            span.textContent = '尚未設定特性效果';
        } else {
            span.className = 'traits-count';
            span.textContent = `已設定 ${traits.length} 個特性`;
        }

        container.appendChild(span);
    },

    /**
     * 槽位變更處理
     */
    onSlotChange(e) {
        const slotKey = e.target.id.replace('slot-', '');
        this.state.currentConfig.slots[slotKey] = e.target.checked;
        Storage.saveCurrentConfig(this.state.currentConfig);
    },

    /**
     * 目標數值變更處理
     */
    onTargetChange(e) {
        const targetKey = e.target.id.replace('target-', '');
        this.state.currentConfig.targets[targetKey] = parseInt(e.target.value, 10) || 0;
        Storage.saveCurrentConfig(this.state.currentConfig);
    },

    /**
     * 執行搜尋
     */
    search() {
        const resultsContainer = document.getElementById('results');
        if (!resultsContainer) return;

        // 顯示載入中
        this.clearElement(resultsContainer);
        const loading = this.createElement('div', 'loading', '搜尋中...');
        resultsContainer.appendChild(loading);

        // 使用 setTimeout 讓 UI 更新
        setTimeout(() => {
            const results = Solver.search(
                this.state.buildingsBySlot,
                this.state.currentConfig.slots,
                this.state.currentConfig.targets,
                this.state.traits,
                5
            );

            this.renderResults(results);
        }, 100);
    },

    /**
     * 渲染搜尋結果
     */
    renderResults(results) {
        const container = document.getElementById('results');
        if (!container) return;

        this.clearElement(container);

        if (results.length === 0) {
            const noResults = this.createElement('div', 'no-results');
            const p1 = this.createElement('p', null, '找不到符合條件的組合');
            const p2 = this.createElement('p', 'hint', '請嘗試降低目標數值或開放更多槽位');
            noResults.appendChild(p1);
            noResults.appendChild(p2);
            container.appendChild(noResults);
            return;
        }

        results.forEach((result, index) => {
            const card = this.createResultCard(result, index + 1);
            container.appendChild(card);
        });
    },

    /**
     * 建立單個結果卡片
     */
    createResultCard(result, rank) {
        const { buildings, totals, thresholdScore, thresholdDetails } = result;

        const card = this.createElement('div', 'result-card');

        // 標題列
        const header = this.createElement('div', 'result-header');
        header.appendChild(this.createElement('span', 'result-rank', `方案 ${rank}`));
        header.appendChild(this.createElement('span', 'result-score', `達成 ${thresholdScore} 個門檻`));
        card.appendChild(header);

        // 數值統計
        const stats = this.createElement('div', 'result-stats');
        const statItems = [
            { label: '農業', key: 'agriculture' },
            { label: '礦業', key: 'mining' },
            { label: '軍事', key: 'military' },
            { label: '商業', key: 'commerce' }
        ];

        statItems.forEach(({ label, key }) => {
            const row = this.createElement('div', 'stat-row');
            row.appendChild(this.createElement('span', 'stat-label', label));
            row.appendChild(this.createElement('span', 'stat-value', String(totals[key])));

            const indicator = this.createElement('span',
                `threshold-indicator ${Solver.getThresholdClass(thresholdDetails[key])}`,
                Solver.formatThresholdIndicator(totals[key])
            );
            row.appendChild(indicator);
            stats.appendChild(row);
        });
        card.appendChild(stats);

        // 建築列表
        const buildingList = this.createElement('div', 'result-buildings');
        buildings.forEach(({ slot, building }) => {
            const row = this.createElement('div', 'building-row');
            row.appendChild(this.createElement('span', 'slot-name', slot));

            const nameSpan = this.createElement('span', 'building-name', building.name);
            if (building.trait) {
                const traitSpan = this.createElement('span', 'building-trait', building.trait);
                nameSpan.appendChild(traitSpan);
            }
            row.appendChild(nameSpan);

            const bonuses = [];
            if (building.agriculture) bonuses.push(`農+${building.agriculture}`);
            if (building.mining) bonuses.push(`礦+${building.mining}`);
            if (building.military) bonuses.push(`軍+${building.military}`);
            if (building.commerce) bonuses.push(`商+${building.commerce}`);
            row.appendChild(this.createElement('span', 'building-bonuses', bonuses.join(' ')));

            buildingList.appendChild(row);
        });
        card.appendChild(buildingList);

        return card;
    },

    /**
     * 儲存配置
     */
    saveConfig() {
        const name = prompt('請輸入配置名稱：');
        if (!name) return;

        if (Storage.saveConfig(name, this.state.currentConfig)) {
            alert('配置已儲存！');
        } else {
            alert('儲存失敗，請重試。');
        }
    },

    /**
     * 顯示載入配置 Modal
     */
    showLoadConfigModal() {
        const modal = document.getElementById('loadConfigModal');
        const list = document.getElementById('configList');
        if (!modal || !list) return;

        this.clearElement(list);
        const configs = Storage.getConfigs();

        if (configs.length === 0) {
            list.appendChild(this.createElement('div', 'no-configs', '尚無儲存的配置'));
        } else {
            configs.forEach(config => {
                const item = this.createElement('div', 'config-item');

                item.appendChild(this.createElement('span', 'config-name', config.name));
                item.appendChild(this.createElement('span', 'config-date',
                    new Date(config.updatedAt).toLocaleDateString()));

                const loadBtn = this.createElement('button', 'btn-load', '載入');
                loadBtn.addEventListener('click', () => this.loadConfig(config.name));
                item.appendChild(loadBtn);

                const deleteBtn = this.createElement('button', 'btn-delete', '刪除');
                deleteBtn.addEventListener('click', () => this.deleteConfig(config.name));
                item.appendChild(deleteBtn);

                list.appendChild(item);
            });
        }

        modal.classList.add('active');
    },

    /**
     * 載入配置
     */
    loadConfig(name) {
        const configs = Storage.getConfigs();
        const config = configs.find(c => c.name === name);

        if (config) {
            this.state.currentConfig = {
                slots: { ...config.slots },
                targets: { ...config.targets }
            };
            Storage.saveCurrentConfig(this.state.currentConfig);
            this.render();
            this.closeModals();
        }
    },

    /**
     * 刪除配置
     */
    deleteConfig(name) {
        if (confirm(`確定要刪除配置「${name}」嗎？`)) {
            Storage.deleteConfig(name);
            this.showLoadConfigModal();
        }
    },

    /**
     * 重設配置
     */
    resetConfig() {
        if (confirm('確定要重設為預設值嗎？')) {
            this.state.currentConfig = Storage.getDefaultConfig();
            Storage.saveCurrentConfig(this.state.currentConfig);
            this.render();
        }
    },

    /**
     * 顯示特性編輯 Modal
     */
    showTraitsModal() {
        const modal = document.getElementById('traitsModal');
        const list = document.getElementById('traitsList');
        if (!modal || !list) return;

        this.renderTraitsList();
        modal.classList.add('active');
    },

    /**
     * 渲染特性列表
     */
    renderTraitsList() {
        const list = document.getElementById('traitsList');
        if (!list) return;

        this.clearElement(list);

        // 從建築資料中取得所有特性
        const allTraits = TraitsManager.extractTraitsFromBuildings(this.state.buildings);
        const savedTraits = this.state.traits;

        if (allTraits.length === 0) {
            list.appendChild(this.createElement('div', 'no-traits', '無特性資料'));
            return;
        }

        allTraits.forEach(traitName => {
            const effect = savedTraits[traitName] || { agriculture: 0, mining: 0, military: 0, commerce: 0 };

            const item = this.createElement('div', 'trait-item');
            item.dataset.trait = traitName;

            item.appendChild(this.createElement('div', 'trait-name', traitName));

            const inputs = this.createElement('div', 'trait-inputs');
            const fields = [
                { key: 'agriculture', label: '農' },
                { key: 'mining', label: '礦' },
                { key: 'military', label: '軍' },
                { key: 'commerce', label: '商' }
            ];

            fields.forEach(({ key, label }) => {
                const labelEl = document.createElement('label');
                labelEl.textContent = label;

                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'trait-input';
                input.dataset.field = key;
                input.value = effect[key];
                input.min = '0';
                input.addEventListener('change', (e) => this.onTraitInputChange(e));

                labelEl.appendChild(input);
                inputs.appendChild(labelEl);
            });

            item.appendChild(inputs);
            list.appendChild(item);
        });
    },

    /**
     * 特性輸入變更處理
     */
    onTraitInputChange(e) {
        const traitItem = e.target.closest('.trait-item');
        const traitName = traitItem.dataset.trait;
        const field = e.target.dataset.field;
        const value = parseInt(e.target.value, 10) || 0;

        if (!this.state.traits[traitName]) {
            this.state.traits[traitName] = { agriculture: 0, mining: 0, military: 0, commerce: 0 };
        }
        this.state.traits[traitName][field] = value;

        Storage.saveTraits(this.state.traits);
        this.renderTraitsSummary();
    },

    /**
     * 關閉所有 Modal
     */
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
};

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
