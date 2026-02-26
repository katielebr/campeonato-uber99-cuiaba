// ===== State Management =====
const STORAGE_KEY = 'ranking-championship-data';

let state = {
    championship: null,
    currentView: 'setup',
    activeCategory: null,
    viewMode: 'total',
    selectedDate: new Date().toISOString().split('T')[0],
    selectedWeek: null,
    selectedMonth: null,
    selectedParticipantId: null,
    viewHistory: [],
};

// ===== Data Helpers =====
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            state.championship = JSON.parse(saved);
            return true;
        } catch (e) {
            console.error('Error loading data:', e);
        }
    }
    return false;
}

function saveData() {
    if (state.championship) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.championship));
    }
}

function clearData() {
    localStorage.removeItem(STORAGE_KEY);
    state.championship = null;
}

// ===== Initialization =====
function init() {
    if (loadData()) {
        state.activeCategory = state.championship.categories[0]?.id || null;
        state.selectedDate = state.championship.startDate;
        navigateTo('dashboard');
    } else {
        navigateTo('setup');
    }
}

// ===== Navigation =====
function navigateTo(view) {
    if (state.currentView !== view) {
        state.viewHistory.push(state.currentView);
    }
    state.currentView = view;

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.add('active');

    const backBtn = document.getElementById('btn-back');
    const settingsBtn = document.getElementById('btn-settings');
    const historyBtn = document.getElementById('btn-history');

    if (view === 'setup') {
        backBtn.classList.add('hidden');
        settingsBtn.classList.add('hidden');
        historyBtn.classList.remove('hidden');
    } else if (view === 'dashboard') {
        backBtn.classList.add('hidden');
        settingsBtn.classList.remove('hidden');
        historyBtn.classList.remove('hidden');
        renderDashboard();
    } else if (view === 'participant') {
        backBtn.classList.remove('hidden');
        settingsBtn.classList.add('hidden');
        historyBtn.classList.add('hidden');
        renderParticipantDetail();
    } else if (view === 'history') {
        backBtn.classList.remove('hidden');
        settingsBtn.classList.add('hidden');
        historyBtn.classList.add('hidden');
        renderHistory();
    }

    updateHeader(view);
}

function goBack() {
    const prev = state.viewHistory.pop();
    if (prev) {
        state.currentView = prev;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const target = document.getElementById(`view-${prev}`);
        if (target) target.classList.add('active');

        const backBtn = document.getElementById('btn-back');
        const settingsBtn = document.getElementById('btn-settings');

        const historyBtn = document.getElementById('btn-history');

        if (prev === 'dashboard') {
            backBtn.classList.add('hidden');
            settingsBtn.classList.remove('hidden');
            historyBtn.classList.remove('hidden');
            renderDashboard();
        } else if (prev === 'setup') {
            backBtn.classList.add('hidden');
            settingsBtn.classList.add('hidden');
            historyBtn.classList.remove('hidden');
        }

        updateHeader(prev);
    }
}

function updateHeader(view) {
    const title = document.getElementById('header-title');
    const subtitle = document.getElementById('header-subtitle');

    if (view === 'setup') {
        title.textContent = 'Ranking App';
        subtitle.textContent = 'Campeonato Uber + 99Pop';
    } else if (view === 'dashboard') {
        title.textContent = 'Ranking';
        subtitle.textContent = 'Campeonato Uber + 99Pop';
    } else if (view === 'participant') {
        const p = getParticipant(state.selectedParticipantId);
        title.textContent = p ? p.name : 'Participante';
        subtitle.textContent = 'Detalhes e Ganhos';
    } else if (view === 'history') {
        title.textContent = 'Histórico';
        subtitle.textContent = 'Campeonatos Anteriores';
    }
}

// ===== Championship Management =====
function createChampionship() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const hasCarro = document.getElementById('cat-carro').checked;
    const hasMoto = document.getElementById('cat-moto').checked;

    if (!startDate || !endDate) {
        showToast('Selecione as datas de início e fim', 'error');
        return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
        showToast('A data fim deve ser posterior à data início', 'error');
        return;
    }

    if (!hasCarro && !hasMoto) {
        showToast('Selecione pelo menos uma categoria', 'error');
        return;
    }

    const categories = [];
    if (hasCarro) categories.push({ id: 'carro', name: 'Carro', icon: '🚗', participants: [] });
    if (hasMoto) categories.push({ id: 'moto', name: 'Moto', icon: '🏍️', participants: [] });

    state.championship = {
        startDate,
        endDate,
        categories,
        createdAt: new Date().toISOString(),
    };

    saveData();
    state.activeCategory = categories[0].id;
    state.selectedDate = startDate;
    showToast('Campeonato criado com sucesso! 🎉', 'success');
    navigateTo('dashboard');
}

function toggleCategoryPreview(cat) {
    // Visual only toggle – handled by CSS
}

// ===== Dashboard =====
function renderDashboard() {
    if (!state.championship) return;

    // Banner
    const startFormatted = formatDateBR(state.championship.startDate);
    const endFormatted = formatDateBR(state.championship.endDate);
    document.getElementById('banner-date-text').textContent = `${startFormatted} — ${endFormatted}`;

    const totalParticipants = state.championship.categories.reduce((sum, c) => sum + c.participants.length, 0);
    document.getElementById('banner-participants-count').textContent = `${totalParticipants} participante${totalParticipants !== 1 ? 's' : ''}`;

    // Category Tabs
    renderCategoryTabs();

    // Period Selector
    updatePeriodSelector();

    // Ranking
    renderRanking();

    // Check if championship is complete
    checkCompletion();
}

function renderCategoryTabs() {
    const container = document.getElementById('category-tabs');
    const cats = state.championship.categories;

    if (cats.length <= 1) {
        container.innerHTML = '';
        container.style.display = 'none';
        if (cats.length === 1) state.activeCategory = cats[0].id;
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = cats.map(cat => `
    <button class="category-tab ${state.activeCategory === cat.id ? 'active' : ''}" 
            onclick="setActiveCategory('${cat.id}')" id="tab-${cat.id}">
      <span class="tab-icon">${cat.icon}</span>
      <span>${cat.name}</span>
    </button>
  `).join('');
}

function setActiveCategory(catId) {
    state.activeCategory = catId;
    renderCategoryTabs();
    renderRanking();
}

function setViewMode(mode) {
    state.viewMode = mode;

    document.querySelectorAll('.view-mode-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    // Ensure selectedDate is within the championship period
    if (state.championship) {
        if (state.selectedDate < state.championship.startDate || state.selectedDate > state.championship.endDate) {
            state.selectedDate = state.championship.startDate;
        }
    }

    updatePeriodSelector();
    renderRanking();
}

function updatePeriodSelector() {
    const selector = document.getElementById('period-selector');
    const label = document.getElementById('period-label');
    const datePicker = document.getElementById('daily-date-picker');

    if (state.viewMode === 'total') {
        selector.classList.add('hidden');
        return;
    }

    selector.classList.remove('hidden');

    if (state.viewMode === 'daily') {
        datePicker.style.display = 'block';
        datePicker.value = state.selectedDate;
        label.textContent = formatDateBR(state.selectedDate);
        label.style.pointerEvents = 'none';
    } else if (state.viewMode === 'weekly') {
        datePicker.style.display = 'none';
        label.style.pointerEvents = 'none';
        const weekRange = getWeekRange(state.selectedDate);
        label.textContent = `${formatDateShort(weekRange.start)} — ${formatDateShort(weekRange.end)}`;
    } else if (state.viewMode === 'monthly') {
        datePicker.style.display = 'none';
        label.style.pointerEvents = 'none';
        const d = new Date(state.selectedDate + 'T12:00:00');
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        label.textContent = `${months[d.getMonth()]} ${d.getFullYear()}`;
    }
}

function onDatePickerChange() {
    const val = document.getElementById('daily-date-picker').value;
    if (val) {
        state.selectedDate = val;
        updatePeriodSelector();
        renderRanking();
    }
}

function navigatePeriod(direction) {
    const d = new Date(state.selectedDate + 'T12:00:00');

    if (state.viewMode === 'daily') {
        d.setDate(d.getDate() + direction);
    } else if (state.viewMode === 'weekly') {
        d.setDate(d.getDate() + (direction * 7));
    } else if (state.viewMode === 'monthly') {
        d.setMonth(d.getMonth() + direction);
    }

    state.selectedDate = d.toISOString().split('T')[0];
    updatePeriodSelector();
    renderRanking();
}

// ===== Ranking Rendering =====
function renderRanking() {
    const container = document.getElementById('ranking-list');
    const category = getActiveCategory();

    if (!category || category.participants.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <p>Nenhum participante ainda</p>
        <span>Clique em "Adicionar" para incluir participantes</span>
      </div>
    `;
        return;
    }

    const ranked = getRankedParticipants(category);

    container.innerHTML = ranked.map((p, idx) => {
        const pos = idx + 1;
        const posClass = pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : 'regular';
        const topClass = pos <= 3 ? `top-${pos}` : '';
        const initial = p.name.charAt(0).toUpperCase();
        const daysActive = Object.keys(p.earnings).length;
        const value = getParticipantValue(p);

        return `
      <div class="ranking-item ${topClass}" onclick="openParticipant('${p.id}')" id="ranking-${p.id}">
        <div class="ranking-position ${posClass}">${pos}</div>
        <div class="ranking-avatar">${initial}</div>
        <div class="ranking-info">
          <div class="ranking-name">${escapeHtml(p.name)}</div>
          <div class="ranking-days">${daysActive} dia${daysActive !== 1 ? 's' : ''} registrado${daysActive !== 1 ? 's' : ''}</div>
        </div>
        <div class="ranking-value">${formatCurrency(value)}</div>
        <button class="btn-delete" onclick="event.stopPropagation(); deleteParticipant('${p.id}')" title="Remover participante">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>
    `;
    }).join('');
}

function getParticipantValue(participant) {
    if (state.viewMode === 'total') {
        return Object.values(participant.earnings).reduce((sum, v) => sum + v, 0);
    } else if (state.viewMode === 'daily') {
        return participant.earnings[state.selectedDate] || 0;
    } else if (state.viewMode === 'weekly') {
        const weekRange = getWeekRange(state.selectedDate);
        return getEarningsInRange(participant, weekRange.start, weekRange.end);
    } else if (state.viewMode === 'monthly') {
        const d = new Date(state.selectedDate + 'T12:00:00');
        const year = d.getFullYear();
        const month = d.getMonth();
        const start = new Date(year, month, 1).toISOString().split('T')[0];
        const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
        return getEarningsInRange(participant, start, end);
    }
    return 0;
}

function getRankedParticipants(category) {
    const participants = [...category.participants];
    participants.sort((a, b) => getParticipantValue(b) - getParticipantValue(a));
    return participants;
}

function getEarningsInRange(participant, startDate, endDate) {
    let total = 0;
    for (const [date, value] of Object.entries(participant.earnings)) {
        if (date >= startDate && date <= endDate) {
            total += value;
        }
    }
    return total;
}

// ===== Participant Management =====
function showAddParticipant() {
    document.getElementById('participant-name-input').value = '';
    openModal('modal-add-participant');
    setTimeout(() => document.getElementById('participant-name-input').focus(), 300);
}

function addParticipant() {
    const name = document.getElementById('participant-name-input').value.trim();

    if (!name) {
        showToast('Digite o nome do participante', 'error');
        return;
    }

    const category = getActiveCategory();
    if (!category) return;

    const exists = category.participants.some(p => p.name.toLowerCase() === name.toLowerCase());
    if (exists) {
        showToast('Participante já existe nessa categoria', 'error');
        return;
    }

    category.participants.push({
        id: generateId(),
        name,
        earnings: {},
    });

    saveData();
    closeModal('modal-add-participant');
    renderDashboard();
    showToast(`${name} adicionado(a) com sucesso! 🎉`, 'success');
}

function deleteParticipant(participantId) {
    if (!confirm('Tem certeza que deseja remover este participante?')) return;

    const category = getActiveCategory();
    if (!category) return;

    category.participants = category.participants.filter(p => p.id !== participantId);
    saveData();
    renderDashboard();
    showToast('Participante removido', 'success');
}

function openParticipant(participantId) {
    state.selectedParticipantId = participantId;
    navigateTo('participant');
}

function getParticipant(participantId) {
    if (!state.championship) return null;
    for (const cat of state.championship.categories) {
        const p = cat.participants.find(p => p.id === participantId);
        if (p) return p;
    }
    return null;
}

function getParticipantCategory(participantId) {
    if (!state.championship) return null;
    for (const cat of state.championship.categories) {
        if (cat.participants.some(p => p.id === participantId)) return cat;
    }
    return null;
}

// ===== Participant Detail =====
function renderParticipantDetail() {
    const participant = getParticipant(state.selectedParticipantId);
    const category = getParticipantCategory(state.selectedParticipantId);

    if (!participant || !category) return;

    // Header
    document.getElementById('participant-avatar').textContent = participant.name.charAt(0).toUpperCase();
    document.getElementById('participant-name').textContent = participant.name;
    document.getElementById('participant-category-badge').innerHTML = `${category.icon} ${category.name}`;

    const total = Object.values(participant.earnings).reduce((sum, v) => sum + v, 0);
    document.getElementById('participant-total-value').textContent = formatCurrency(total);

    // Earning date: preserve current value if valid, otherwise default to start date
    const currentDateVal = document.getElementById('earning-date').value;
    if (!currentDateVal || currentDateVal < state.championship.startDate || currentDateVal > state.championship.endDate) {
        document.getElementById('earning-date').value = state.championship.startDate;
    }
    // Don't clear the earning value input here — it's cleared in addEarning()

    // Auto open calendar when clicking date field
    const earningDateInput = document.getElementById('earning-date');
    earningDateInput.addEventListener('click', function () {
        if (this.showPicker) this.showPicker();
    });
    earningDateInput.addEventListener('focus', function () {
        if (this.showPicker) this.showPicker();
    });

    // Date constraints
    document.getElementById('earning-date').min = state.championship.startDate;
    document.getElementById('earning-date').max = state.championship.endDate;

    // Render Earnings History
    renderEarningsHistory(participant);
}

function renderEarningsHistory(participant) {
    const container = document.getElementById('earnings-history');
    const entries = Object.entries(participant.earnings).sort((a, b) => b[0].localeCompare(a[0]));

    if (entries.length === 0) {
        container.innerHTML = `
      <div class="empty-state small">
        <p>Nenhum ganho registrado</p>
      </div>
    `;
        return;
    }

    const startDate = new Date(state.championship.startDate + 'T12:00:00');

    container.innerHTML = entries.map(([date, value], idx) => {
        const d = new Date(date + 'T12:00:00');
        const dayNumber = Math.floor((d - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const weekday = weekdays[d.getDay()];

        return `
      <div class="earning-item" style="animation-delay: ${idx * 40}ms">
        <div class="earning-date-info">
          <div class="earning-day-badge">
            <span class="earning-day-number">${dayNumber}</span>
            <span class="earning-day-label">Dia</span>
          </div>
          <div>
            <div class="earning-date-text">${formatDateBR(date)}</div>
            <div class="earning-date-weekday">${weekday}</div>
          </div>
        </div>
        <div class="earning-value-wrapper">
          <span class="earning-value">${formatCurrency(value)}</span>
          <button class="btn-delete-earning" onclick="deleteEarning('${date}')" title="Remover ganho">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
    }).join('');
}

function addEarning() {
    const date = document.getElementById('earning-date').value;
    const value = parseFloat(document.getElementById('earning-value').value);

    if (!date) {
        showToast('Selecione a data', 'error');
        return;
    }

    if (isNaN(value) || value < 0) {
        showToast('Digite um valor válido', 'error');
        return;
    }

    // Check date within championship range
    if (date < state.championship.startDate || date > state.championship.endDate) {
        showToast('Data fora do período do campeonato', 'error');
        return;
    }

    const participant = getParticipant(state.selectedParticipantId);
    if (!participant) return;

    if (participant.earnings[date] !== undefined) {
        // If there's already a value for this date, add to it or replace
        if (!confirm(`Já existe um ganho de ${formatCurrency(participant.earnings[date])} para ${formatDateBR(date)}. Deseja substituir?`)) {
            return;
        }
    }

    participant.earnings[date] = value;
    saveData();

    // Advance date to next day (within championship bounds)
    const nextDay = new Date(date + 'T12:00:00');
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];

    document.getElementById('earning-value').value = '';

    if (nextDayStr <= state.championship.endDate) {
        document.getElementById('earning-date').value = nextDayStr;
    }

    renderParticipantDetail();
    showToast(`Ganho de ${formatCurrency(value)} adicionado! 💰`, 'success');
}

function deleteEarning(date) {
    if (!confirm(`Remover ganho de ${formatDateBR(date)}?`)) return;

    const participant = getParticipant(state.selectedParticipantId);
    if (!participant) return;

    delete participant.earnings[date];
    saveData();
    renderParticipantDetail();
    showToast('Ganho removido', 'success');
}

// ===== Settings =====
function showSettings() {
    if (!state.championship) return;

    document.getElementById('settings-start-date').value = state.championship.startDate;
    document.getElementById('settings-end-date').value = state.championship.endDate;

    const hasCarro = state.championship.categories.some(c => c.id === 'carro');
    const hasMoto = state.championship.categories.some(c => c.id === 'moto');

    document.getElementById('settings-cat-carro').checked = hasCarro;
    document.getElementById('settings-cat-moto').checked = hasMoto;

    openModal('modal-settings');
}

function saveSettings() {
    const startDate = document.getElementById('settings-start-date').value;
    const endDate = document.getElementById('settings-end-date').value;
    const hasCarro = document.getElementById('settings-cat-carro').checked;
    const hasMoto = document.getElementById('settings-cat-moto').checked;

    if (!startDate || !endDate) {
        showToast('Selecione as datas', 'error');
        return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
        showToast('Data fim deve ser posterior à data início', 'error');
        return;
    }

    if (!hasCarro && !hasMoto) {
        showToast('Selecione pelo menos uma categoria', 'error');
        return;
    }

    state.championship.startDate = startDate;
    state.championship.endDate = endDate;

    // Handle categories
    const existingIds = state.championship.categories.map(c => c.id);

    if (hasCarro && !existingIds.includes('carro')) {
        state.championship.categories.push({ id: 'carro', name: 'Carro', icon: '🚗', participants: [] });
    }
    if (hasMoto && !existingIds.includes('moto')) {
        state.championship.categories.push({ id: 'moto', name: 'Moto', icon: '🏍️', participants: [] });
    }
    if (!hasCarro) {
        state.championship.categories = state.championship.categories.filter(c => c.id !== 'carro');
    }
    if (!hasMoto) {
        state.championship.categories = state.championship.categories.filter(c => c.id !== 'moto');
    }

    // Update active category if needed
    if (!state.championship.categories.some(c => c.id === state.activeCategory)) {
        state.activeCategory = state.championship.categories[0]?.id || null;
    }

    saveData();
    closeModal('modal-settings');
    renderDashboard();
    showToast('Configurações salvas! ✅', 'success');
}

function resetChampionship() {
    if (!confirm('⚠️ Tem certeza que deseja resetar todo o campeonato? Esta ação não pode ser desfeita!')) return;
    if (!confirm('Esta ação vai apagar TODOS os dados. Confirma?')) return;

    clearData();
    closeModal('modal-settings');
    state.viewHistory = [];
    navigateTo('setup');
    showToast('Campeonato resetado', 'success');
}

// ===== Modals =====
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('active')) {
        e.target.classList.remove('active');
    }
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// Enter key to submit on participant name input
document.getElementById('participant-name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addParticipant();
});

// ===== Championship Completion =====
const HISTORY_KEY = 'ranking-championship-history';

function getChampionshipDays() {
    if (!state.championship) return 0;
    const start = new Date(state.championship.startDate + 'T12:00:00');
    const end = new Date(state.championship.endDate + 'T12:00:00');
    return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

function isChampionshipComplete() {
    if (!state.championship) return false;

    const totalDays = getChampionshipDays();
    const allParticipants = state.championship.categories.flatMap(c => c.participants);

    if (allParticipants.length === 0) return false;

    // Check if ALL participants have ALL days filled
    for (const participant of allParticipants) {
        const filledDays = Object.keys(participant.earnings).length;
        if (filledDays < totalDays) return false;
    }

    return true;
}

function getCompletionProgress() {
    if (!state.championship) return { filled: 0, total: 0, percentage: 0 };

    const totalDays = getChampionshipDays();
    const allParticipants = state.championship.categories.flatMap(c => c.participants);

    if (allParticipants.length === 0) return { filled: 0, total: 0, percentage: 0 };

    const totalSlots = allParticipants.length * totalDays;
    const filledSlots = allParticipants.reduce((sum, p) => sum + Object.keys(p.earnings).length, 0);
    const percentage = Math.round((filledSlots / totalSlots) * 100);

    return { filled: filledSlots, total: totalSlots, percentage };
}

function checkCompletion() {
    const banner = document.getElementById('completion-banner');
    const progressText = document.getElementById('completion-progress-text');

    if (isChampionshipComplete()) {
        banner.classList.remove('hidden');
        const progress = getCompletionProgress();
        progressText.textContent = `Todos os ${progress.total} registros preenchidos (${getChampionshipDays()} dias × ${state.championship.categories.flatMap(c => c.participants).length} participantes)`;
    } else {
        banner.classList.add('hidden');
    }
}

// ===== Archive & History =====
function loadHistory() {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Error loading history:', e);
        }
    }
    return [];
}

function saveHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function archiveChampionship() {
    if (!state.championship) return;

    const history = loadHistory();
    const archived = {
        ...JSON.parse(JSON.stringify(state.championship)),
        archivedAt: new Date().toISOString(),
        id: generateId(),
    };

    history.unshift(archived);
    saveHistory(history);
    showToast('Campeonato salvo no histórico! 📜', 'success');
}

function archiveAndCreateNew() {
    if (!state.championship) return;

    archiveChampionship();

    // Clear current championship
    clearData();
    state.viewHistory = [];
    navigateTo('setup');
    showToast('Campeonato arquivado! Crie um novo 🎉', 'success');
}

function deleteCurrentChampionship() {
    if (!confirm('⚠️ Tem certeza que deseja EXCLUIR o campeonato atual?\nEsta ação não pode ser desfeita!')) return;
    if (!confirm('Todos os dados serão perdidos. Confirma?')) return;

    clearData();
    state.viewHistory = [];
    navigateTo('setup');
    showToast('Campeonato excluído', 'success');
}

function deleteArchivedChampionship(archivedId) {
    if (!confirm('Remover este campeonato do histórico?')) return;

    const history = loadHistory();
    const updated = history.filter(h => h.id !== archivedId);
    saveHistory(updated);
    renderHistory();
    showToast('Campeonato removido do histórico', 'success');
}

// ===== History View =====
function showHistory() {
    navigateTo('history');
}

function renderHistory() {
    const container = document.getElementById('history-list');
    const history = loadHistory();

    if (history.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📜</div>
        <p>Nenhum campeonato salvo</p>
        <span>Quando um campeonato for concluído, salve-o aqui para manter o histórico</span>
      </div>
    `;
        return;
    }

    container.innerHTML = history.map((champ, idx) => {
        const startFormatted = formatDateBR(champ.startDate);
        const endFormatted = formatDateBR(champ.endDate);
        const archivedDate = new Date(champ.archivedAt).toLocaleDateString('pt-BR');

        const categoriesHtml = champ.categories.map(cat => {
            const sorted = [...cat.participants].sort((a, b) => {
                const totalA = Object.values(a.earnings).reduce((s, v) => s + v, 0);
                const totalB = Object.values(b.earnings).reduce((s, v) => s + v, 0);
                return totalB - totalA;
            });

            const participantsHtml = sorted.slice(0, 3).map((p, i) => {
                const total = Object.values(p.earnings).reduce((s, v) => s + v, 0);
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
                return `
              <div class="history-participant">
                <span class="history-participant-name">${medal} ${escapeHtml(p.name)}</span>
                <span class="history-participant-value">${formatCurrency(total)}</span>
              </div>
            `;
            }).join('');

            return `
            <div class="history-category">
              <div class="history-category-title">${cat.icon} ${cat.name}</div>
              ${participantsHtml}
              ${sorted.length > 3 ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.25rem">+${sorted.length - 3} mais</div>` : ''}
            </div>
          `;
        }).join('');

        return `
        <div class="history-card" style="animation-delay: ${idx * 60}ms">
          <div class="history-card-header">
            <div class="history-card-period">${startFormatted} — ${endFormatted}</div>
            <div class="history-card-date">Salvo em ${archivedDate}</div>
          </div>
          <div class="history-categories">
            ${categoriesHtml}
          </div>
          <div class="history-card-footer">
            <button class="btn btn-sm btn-danger" onclick="deleteArchivedChampionship('${champ.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              Excluir
            </button>
          </div>
        </div>
      `;
    }).join('');
}

// ===== Toast =====
let toastTimeout;
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;

    clearTimeout(toastTimeout);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== Utility Functions =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateShort(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getWeekRange(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0],
    };
}

function getActiveCategory() {
    if (!state.championship) return null;
    return state.championship.categories.find(c => c.id === state.activeCategory) || null;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== Start App =====
document.addEventListener('DOMContentLoaded', init);
