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
        // 使用者建築管理
        userBuildings: [],
        userBuildingsBySlot: {},
        buildingsByName: {},
        sidebarOpen: false
    },

    // 當前選擇的建築（用於變體選擇彈窗）
    _currentVariantBuilding: null,

    // 當前活躍的 modal cleanup 函數（用於防止 memory leak）
    _activeModalCleanup: null,

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
        el.textContent = '';
    },

    /**
     * 初始化應用程式
     */
    async init() {
        console.log('初始化應用程式...');

        // 載入建築資料和特性資料
        await Promise.all([
            this.loadBuildings(),
            this.loadTraits()
        ]);

        // 將建築按名稱分組（供選擇器使用）
        this.groupBuildingsByName();

        // 載入使用者建築
        this.loadUserBuildings();

        // 載入儲存的設定
        this.loadSavedSettings();

        // 綁定事件
        this.bindEvents();

        // 渲染 UI
        this.render();

        // 渲染側邊欄元件
        this.renderBuildingSelector();
        this.renderUserBuildingsList();

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
     * 載入特性資料
     */
    async loadTraits() {
        await TraitsManager.loadFromURL('data/traits.csv');
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

        // ========== 側邊欄相關事件 ==========

        // 側邊欄切換
        document.getElementById('sidebarToggle')?.addEventListener('click', () => this.toggleSidebar());
        document.getElementById('sidebarClose')?.addEventListener('click', () => this.closeSidebar());
        document.getElementById('sidebarOverlay')?.addEventListener('click', () => this.closeSidebar());

        // 載入預設建築
        document.getElementById('loadDefaultsBtn')?.addEventListener('click', () => this.loadDefaultBuildings());

        // 變體選擇彈窗
        document.getElementById('variantAddBtn')?.addEventListener('click', () => this.addSelectedVariants());
        document.getElementById('variantCancelBtn')?.addEventListener('click', () => this.closeModals());

        // 匯出匯入
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportData());
        document.getElementById('importBtn')?.addEventListener('click', () => this.importData());
        document.getElementById('importFileInput')?.addEventListener('change', (e) => this.handleImportFile(e));
    },

    /**
     * 渲染 UI
     */
    render() {
        this.renderSlots();
        this.renderTargets();
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

        // 檢查是否有使用者建築
        if (this.state.userBuildings.length === 0) {
            this.clearElement(resultsContainer);
            const noBuildings = this.createElement('div', 'no-results');
            noBuildings.appendChild(this.createElement('p', null, '尚未添加任何建築'));
            noBuildings.appendChild(this.createElement('p', 'hint', '請先在左側「建築管理」中添加您擁有的建築'));
            resultsContainer.appendChild(noBuildings);
            return;
        }

        // 顯示載入中
        this.clearElement(resultsContainer);
        const loading = this.createElement('div', 'loading', '搜尋中...');
        resultsContainer.appendChild(loading);

        // 使用 setTimeout 讓 UI 更新
        setTimeout(() => {
            const results = Solver.search(
                this.state.userBuildingsBySlot,  // 改用使用者建築
                this.state.currentConfig.slots,
                this.state.currentConfig.targets,
                TraitsManager.getTraits(),
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

        // 額外效果（如果有的話）
        const buildingObjects = buildings.map(b => b.building);
        const extraEffects = TraitsManager.getExtraEffects(buildingObjects);

        if (extraEffects.length > 0) {
            const extraSection = this.createElement('div', 'result-extra-effects');
            const extraTitle = this.createElement('div', 'extra-effects-title', '額外效果');
            extraSection.appendChild(extraTitle);

            extraEffects.forEach(({ trait, effect }) => {
                const effectRow = this.createElement('div', 'extra-effect-row');
                effectRow.appendChild(this.createElement('span', 'extra-effect-text', effect));
                effectRow.appendChild(this.createElement('span', 'extra-effect-trait', `(${trait})`));
                extraSection.appendChild(effectRow);
            });

            card.appendChild(extraSection);
        }

        return card;
    },

    /**
     * 儲存配置
     */
    async saveConfig() {
        const name = await this.showInputModal('儲存配置', '請輸入配置名稱');
        if (!name) return;

        if (Storage.saveConfig(name, this.state.currentConfig)) {
            await this.showAlertModal('成功', '配置已儲存！');
        } else {
            await this.showAlertModal('錯誤', '儲存失敗，請重試。');
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
    async deleteConfig(name) {
        const confirmed = await this.showConfirmModal('刪除配置', `確定要刪除配置「${name}」嗎？`);
        if (confirmed) {
            Storage.deleteConfig(name);
            this.showLoadConfigModal();
        }
    },

    /**
     * 重設配置
     */
    async resetConfig() {
        const confirmed = await this.showConfirmModal('重設配置', '確定要重設為預設值嗎？');
        if (confirmed) {
            this.state.currentConfig = Storage.getDefaultConfig();
            Storage.saveCurrentConfig(this.state.currentConfig);
            this.render();
        }
    },

    /**
     * 關閉所有 Modal
     */
    closeModals() {
        // 呼叫活躍的 modal cleanup 函數（防止 memory leak）
        if (this._activeModalCleanup) {
            this._activeModalCleanup();
            this._activeModalCleanup = null;
        }
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    },

    // ========== 自訂對話框方法 ==========

    /**
     * 顯示輸入對話框（取代 prompt）
     * @param {string} title - 標題
     * @param {string} placeholder - 輸入框提示文字
     * @returns {Promise<string|null>} 使用者輸入的值，取消則為 null
     */
    showInputModal(title, placeholder = '') {
        return new Promise((resolve) => {
            const modal = document.getElementById('inputModal');
            const titleEl = document.getElementById('inputModalTitle');
            const input = document.getElementById('inputModalInput');
            const confirmBtn = document.getElementById('inputModalConfirm');
            const cancelBtn = document.getElementById('inputModalCancel');

            titleEl.textContent = title;
            input.value = '';
            input.placeholder = placeholder;
            modal.classList.add('active');
            input.focus();

            const cleanup = () => {
                modal.classList.remove('active');
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                input.removeEventListener('keydown', onKeydown);
                this._activeModalCleanup = null;
            };

            const onConfirm = () => {
                const value = input.value.trim();
                cleanup();
                resolve(value || null);
            };

            const onCancel = () => {
                cleanup();
                resolve(null);
            };

            const onKeydown = (e) => {
                if (e.key === 'Enter') onConfirm();
                if (e.key === 'Escape') onCancel();
            };

            // 註冊 cleanup 供 closeModals 使用（防止 memory leak）
            this._activeModalCleanup = () => {
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                input.removeEventListener('keydown', onKeydown);
                resolve(null);
            };

            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
            input.addEventListener('keydown', onKeydown);
        });
    },

    /**
     * 顯示提示對話框（取代 alert）
     * @param {string} title - 標題
     * @param {string} message - 訊息內容
     * @returns {Promise<void>}
     */
    showAlertModal(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('alertModal');
            const titleEl = document.getElementById('alertModalTitle');
            const messageEl = document.getElementById('alertModalMessage');
            const confirmBtn = document.getElementById('alertModalConfirm');

            titleEl.textContent = title;
            messageEl.textContent = message;
            modal.classList.add('active');

            const cleanup = () => {
                modal.classList.remove('active');
                confirmBtn.removeEventListener('click', onConfirm);
                this._activeModalCleanup = null;
            };

            const onConfirm = () => {
                cleanup();
                resolve();
            };

            // 註冊 cleanup 供 closeModals 使用（防止 memory leak）
            this._activeModalCleanup = () => {
                confirmBtn.removeEventListener('click', onConfirm);
                resolve();
            };

            confirmBtn.addEventListener('click', onConfirm);
        });
    },

    /**
     * 顯示確認對話框（取代 confirm）
     * @param {string} title - 標題
     * @param {string} message - 訊息內容
     * @returns {Promise<boolean>} 使用者是否確認
     */
    showConfirmModal(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            const titleEl = document.getElementById('confirmModalTitle');
            const messageEl = document.getElementById('confirmModalMessage');
            const confirmBtn = document.getElementById('confirmModalConfirm');
            const cancelBtn = document.getElementById('confirmModalCancel');

            titleEl.textContent = title;
            messageEl.textContent = message;
            modal.classList.add('active');

            const cleanup = () => {
                modal.classList.remove('active');
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                this._activeModalCleanup = null;
            };

            const onConfirm = () => {
                cleanup();
                resolve(true);
            };

            const onCancel = () => {
                cleanup();
                resolve(false);
            };

            // 註冊 cleanup 供 closeModals 使用（防止 memory leak）
            this._activeModalCleanup = () => {
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                resolve(false);
            };

            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
        });
    },

    // ========== 側邊欄管理 ==========

    /**
     * 切換側邊欄
     */
    toggleSidebar() {
        this.state.sidebarOpen = !this.state.sidebarOpen;
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        if (this.state.sidebarOpen) {
            sidebar?.classList.add('open');
            overlay?.classList.add('active');
        } else {
            sidebar?.classList.remove('open');
            overlay?.classList.remove('active');
        }
    },

    /**
     * 關閉側邊欄
     */
    closeSidebar() {
        this.state.sidebarOpen = false;
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebarOverlay')?.classList.remove('active');
    },

    // ========== 建築選擇器 ==========

    /**
     * 將建築按名稱分組
     */
    groupBuildingsByName() {
        const byName = {};
        this.state.buildings.forEach(building => {
            if (!byName[building.name]) {
                byName[building.name] = {
                    name: building.name,
                    type: building.type,
                    variants: []
                };
            }
            byName[building.name].variants.push(building);
        });
        this.state.buildingsByName = byName;
    },

    /**
     * 渲染建築選擇器
     */
    renderBuildingSelector() {
        const container = document.getElementById('buildingSelector');
        if (!container) return;

        this.clearElement(container);

        const types = ['主殿', '城牆', '廣場', '坊市'];

        types.forEach(type => {
            const typeGroup = this.createElement('div', 'building-type-group');
            typeGroup.appendChild(this.createElement('div', 'building-type-title', type));

            const buttonsContainer = this.createElement('div', 'building-buttons');

            Object.values(this.state.buildingsByName)
                .filter(b => b.type === type)
                .forEach(buildingGroup => {
                    const btn = this.createElement('button', 'building-name-btn', buildingGroup.name);
                    btn.addEventListener('click', () => this.showBuildingVariantModal(buildingGroup.name));
                    buttonsContainer.appendChild(btn);
                });

            typeGroup.appendChild(buttonsContainer);
            container.appendChild(typeGroup);
        });
    },

    // ========== 變體選擇彈窗 ==========

    /**
     * 顯示建築變體選擇彈窗
     */
    showBuildingVariantModal(buildingName) {
        const buildingGroup = this.state.buildingsByName[buildingName];
        if (!buildingGroup) return;

        const modal = document.getElementById('buildingVariantModal');
        const nameEl = document.getElementById('variantBuildingName');
        const listEl = document.getElementById('variantList');

        nameEl.textContent = buildingName;
        this.clearElement(listEl);

        // 取得特性列表
        const traits = TraitsManager.getTraits();
        const traitNames = Object.keys(traits);

        buildingGroup.variants.forEach((variant, index) => {
            const item = this.createElement('div', 'variant-item');
            item.dataset.index = index;

            // 勾選框
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'variant-checkbox';
            checkbox.dataset.index = index;
            item.appendChild(checkbox);

            // 內容區
            const content = this.createElement('div', 'variant-content');

            // 資訊行
            const info = this.createElement('div', 'variant-info');

            // 數值顯示
            const stats = [];
            if (variant.agriculture) stats.push(`農+${variant.agriculture}`);
            if (variant.mining) stats.push(`礦+${variant.mining}`);
            if (variant.military) stats.push(`軍+${variant.military}`);
            if (variant.commerce) stats.push(`商+${variant.commerce}`);
            info.appendChild(this.createElement('span', 'variant-stats', stats.join(' ') || '無加成'));

            // 原始特性標籤
            if (variant.trait) {
                info.appendChild(this.createElement('span', 'variant-original-trait', variant.trait));
            }

            // 位置顯示
            if (variant.position && variant.position !== '--' && variant.position !== '裝配方案') {
                info.appendChild(this.createElement('span', 'variant-position', `[${variant.position}]`));
            }

            content.appendChild(info);

            // 特技選擇器
            const traitSelector = this.createElement('div', 'variant-trait-selector');
            traitSelector.appendChild(this.createElement('label', null, '特技:'));

            const select = document.createElement('select');
            select.className = 'variant-trait-select';
            select.dataset.index = index;

            // 無特技選項
            const noneOption = document.createElement('option');
            noneOption.value = '';
            noneOption.textContent = '（無）';
            select.appendChild(noneOption);

            // 特技選項
            traitNames.forEach(traitName => {
                const option = document.createElement('option');
                option.value = traitName;
                option.textContent = traitName;
                if (variant.trait === traitName) {
                    option.selected = true;
                }
                select.appendChild(option);
            });

            traitSelector.appendChild(select);
            content.appendChild(traitSelector);

            item.appendChild(content);

            // 點擊整行可切換勾選
            item.addEventListener('click', (e) => {
                if (e.target !== checkbox && e.target.tagName !== 'SELECT' && e.target.tagName !== 'OPTION') {
                    checkbox.checked = !checkbox.checked;
                }
            });

            listEl.appendChild(item);
        });

        modal.classList.add('active');
        this._currentVariantBuilding = buildingGroup;
    },

    /**
     * 新增選取的變體
     */
    addSelectedVariants() {
        const listEl = document.getElementById('variantList');
        const checkboxes = listEl.querySelectorAll('.variant-checkbox:checked');

        if (checkboxes.length === 0) {
            this.showAlertModal('提示', '請至少選擇一個建築變體');
            return;
        }

        checkboxes.forEach(checkbox => {
            const index = parseInt(checkbox.dataset.index, 10);
            const variant = this._currentVariantBuilding.variants[index];

            // 取得使用者選擇的特技
            const select = listEl.querySelector(`.variant-trait-select[data-index="${index}"]`);
            const selectedTrait = select ? select.value : variant.trait;

            // 建立新建築物件（複製並覆蓋特技）
            const newBuilding = {
                ...variant,
                trait: selectedTrait || ''
            };

            Storage.addUserBuilding(newBuilding);
        });

        this.closeModals();
        this.loadUserBuildings();
        this.renderUserBuildingsList();
    },

    // ========== 使用者建築管理 ==========

    /**
     * 載入使用者建築
     */
    loadUserBuildings() {
        this.state.userBuildings = Storage.getUserBuildings();
        this.processUserBuildingsBySlot();
    },

    /**
     * 將使用者建築按槽位分組
     */
    processUserBuildingsBySlot() {
        const buildings = this.state.userBuildings;

        // 先按類型分組
        const byType = {
            '主殿': [],
            '城牆': [],
            '廣場': [],
            '坊市': []
        };

        buildings.forEach(building => {
            if (byType[building.type]) {
                byType[building.type].push(building);
            }
        });

        // 建立槽位對應
        this.state.userBuildingsBySlot = {
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
                this.state.userBuildingsBySlot[building.position].push(building);
            } else {
                // 裝配方案或無固定位置 -> 可放任何坊市槽位
                marketSlots.forEach(slot => {
                    this.state.userBuildingsBySlot[slot].push(building);
                });
            }
        });
    },

    /**
     * 渲染使用者建築列表
     */
    renderUserBuildingsList() {
        const container = document.getElementById('userBuildingsList');
        const countEl = document.getElementById('userBuildingCount');
        if (!container) return;

        this.clearElement(container);

        if (countEl) {
            countEl.textContent = this.state.userBuildings.length;
        }

        if (this.state.userBuildings.length === 0) {
            container.appendChild(this.createElement('div', 'empty-buildings', '尚未添加建築，請點擊上方建築名稱'));
            return;
        }

        this.state.userBuildings.forEach(building => {
            const item = this.createElement('div', 'user-building-item');

            const info = this.createElement('div', 'user-building-info');
            info.appendChild(this.createElement('span', 'user-building-name', building.name));

            const stats = [];
            if (building.agriculture) stats.push(`農+${building.agriculture}`);
            if (building.mining) stats.push(`礦+${building.mining}`);
            if (building.military) stats.push(`軍+${building.military}`);
            if (building.commerce) stats.push(`商+${building.commerce}`);
            info.appendChild(this.createElement('span', 'user-building-stats', stats.join(' ')));

            if (building.trait) {
                info.appendChild(this.createElement('span', 'user-building-trait', building.trait));
            }

            item.appendChild(info);

            const deleteBtn = this.createElement('button', 'user-building-delete', '×');
            deleteBtn.addEventListener('click', () => this.removeUserBuilding(building.id));
            item.appendChild(deleteBtn);

            container.appendChild(item);
        });
    },

    /**
     * 刪除使用者建築
     */
    async removeUserBuilding(id) {
        const confirmed = await this.showConfirmModal('刪除建築', '確定要刪除此建築嗎？');
        if (confirmed) {
            Storage.removeUserBuilding(id);
            this.loadUserBuildings();
            this.renderUserBuildingsList();
        }
    },

    /**
     * 載入預設建築
     */
    async loadDefaultBuildings() {
        const confirmed = await this.showConfirmModal(
            '載入預設建築',
            '這將以 CSV 中的所有建築取代目前的建築清單，確定要繼續嗎？'
        );

        if (confirmed) {
            Storage.resetToDefaults(this.state.buildings);
            this.loadUserBuildings();
            this.renderUserBuildingsList();
            await this.showAlertModal('成功', '已載入預設建築資料');
        }
    },

    // ========== 匯出匯入 ==========

    /**
     * 匯出資料
     */
    exportData() {
        const data = Storage.exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `sangokushi-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * 觸發匯入檔案選擇
     */
    importData() {
        document.getElementById('importFileInput')?.click();
    },

    /**
     * 處理匯入檔案
     */
    async handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (Storage.importAllData(data)) {
                this.loadUserBuildings();
                this.loadSavedSettings();
                this.render();
                this.renderUserBuildingsList();
                await this.showAlertModal('成功', '資料已匯入');
            } else {
                await this.showAlertModal('錯誤', '匯入失敗，檔案格式不正確');
            }
        } catch (e) {
            console.error('匯入失敗:', e);
            await this.showAlertModal('錯誤', '無法讀取檔案');
        }

        // 重設 input
        event.target.value = '';
    }
};

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
