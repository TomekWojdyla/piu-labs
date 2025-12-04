// ./src/js/kanban.js

const STORAGE_KEY = 'kanbanCards';

let cards = [];
let notificationTimeoutId = null;

const COLUMN_LABELS = {
    todo: 'Do zrobienia',
    inprogress: 'W trakcie',
    done: 'Zrobione',
};

// --- Funkcje pomocnicze ---

function loadCardsFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) {
        console.error('Błąd podczas odczytu z localStorage', e);
        return [];
    }
}

function saveCardsToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function generateCardId() {
    return (
        'card-' +
        Date.now().toString(36) +
        '-' +
        Math.floor(Math.random() * 100000).toString(36)
    );
}

function getRandomPastelColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 85%)`;
}

// --- Powiadomienie (toast) ---

function showNotification(message) {
    const board = document.querySelector('.kanban-board-container');
    if (!board) return;

    let note = board.querySelector('.kanban-notification');
    if (!note) {
        note = document.createElement('div');
        note.classList.add('kanban-notification');
        board.appendChild(note);
    }

    note.textContent = message;
    note.classList.add('visible');

    if (notificationTimeoutId) {
        clearTimeout(notificationTimeoutId);
    }

    notificationTimeoutId = setTimeout(() => {
        note.classList.remove('visible');
    }, 2000);
}

// --- Liczniki ---

function updateColumnCounter(columnId) {
    const column = document.querySelector(
        `.kanban-column[data-column="${columnId}"]`
    );
    if (!column) return;

    const counterEl = column.querySelector('.kanban-column-counter');
    if (!counterEl) return;

    const count = cards.filter((c) => c.column === columnId).length;
    counterEl.textContent = count;
}

function updateAllColumnCounters() {
    const columns = document.querySelectorAll('.kanban-column');
    columns.forEach((column) => {
        const columnId = column.dataset.column;
        updateColumnCounter(columnId);
    });
}

// --- Kolorowanie ---

// pojedyncza karta
function recolorSingleCard(cardId) {
    const cardObj = cards.find((c) => c.id === cardId);
    if (!cardObj) return;

    const newColor = getRandomPastelColor();
    cardObj.color = newColor;
    saveCardsToStorage();

    const cardEl = document.querySelector(
        `.kanban-card[data-card-id="${cardId}"]`
    );
    if (cardEl) {
        cardEl.style.backgroundColor = newColor;
    }
}

// wszystkie karty w kolumnie
function colorizeColumn(columnId) {
    const newColor = getRandomPastelColor();

    // update modelu
    cards.forEach((c) => {
        if (c.column === columnId) {
            c.color = newColor;
        }
    });
    saveCardsToStorage();

    // update DOM
    const column = document.querySelector(
        `.kanban-column[data-column="${columnId}"]`
    );
    if (!column) return;
    const cardEls = column.querySelectorAll('.kanban-card');
    cardEls.forEach((cardEl) => {
        cardEl.style.backgroundColor = newColor;
    });

    const label = COLUMN_LABELS[columnId] || columnId;
    showNotification(`Pokolorowano karty w kolumnie "${label}"`);
}

// --- Sortowanie ---

function sortColumnBy(columnId, mode, direction) {
    // wyciągamy karty z tej kolumny
    const columnCards = cards.filter((c) => c.column === columnId);

    if (mode === 'date') {
        columnCards.sort((a, b) => {
            const da = a.createdAt || 0;
            const db = b.createdAt || 0;
            return da - db; // rosnąco (najstarsze -> najnowsze)
        });
    } else if (mode === 'abc') {
        columnCards.sort((a, b) => {
            const ta = (a.content || '').toLowerCase();
            const tb = (b.content || '').toLowerCase();
            if (ta < tb) return -1;
            if (ta > tb) return 1;
            return 0;
        });
    }

    if (direction === 'desc') {
        columnCards.reverse();
    }

    // aktualizujemy tablicę cards tak, żeby kolejność w tej kolumnie się zmieniła
    let j = 0;
    for (let i = 0; i < cards.length; i++) {
        if (cards[i].column === columnId) {
            cards[i] = columnCards[j++];
        }
    }

    saveCardsToStorage();

    // czyścimy samą kolumnę w DOM i renderujemy karty w nowej kolejności
    const columnEl = document.querySelector(
        `.kanban-column[data-column="${columnId}"]`
    );
    if (!columnEl) return;

    const container = columnEl.querySelector('.kanban-cards');
    if (!container) return;

    container.innerHTML = '';
    columnCards.forEach((card) => renderCard(card));
}

function resetSortButtonIcons() {
    const sortButtons = document.querySelectorAll('.kanban-sort-btn');
    sortButtons.forEach((btn) => {
        const baseLabel = btn.dataset.baseLabel;
        if (baseLabel) {
            btn.textContent = baseLabel;
        }
    });
}

function setSortButtonIcon(btn, direction) {
    const baseLabel = btn.dataset.baseLabel || btn.textContent;
    const arrow = direction === 'asc' ? ' ↑' : ' ↓';
    btn.textContent = baseLabel + arrow;
}

// --- Render kart ---

function renderCard(card) {
    const column = document.querySelector(
        `.kanban-column[data-column="${card.column}"]`
    );
    if (!column) return;

    const cardsContainer = column.querySelector('.kanban-cards');
    if (!cardsContainer) return;

    const cardEl = document.createElement('div');
    cardEl.classList.add('kanban-card');
    cardEl.dataset.cardId = card.id;
    cardEl.style.backgroundColor = card.color;

    // HEADER: kolor + X
    const headerEl = document.createElement('div');
    headerEl.classList.add('kanban-card-header');

    const colorBtn = document.createElement('button');
    colorBtn.classList.add('kanban-card-color-btn');
    colorBtn.title = 'Zmień kolor karty';
    colorBtn.textContent = '🎨';

    // ukryty input typu color
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.classList.add('kanban-card-color-input');

    // jeśli kolor karty jest w formacie #rrggbb – ustaw jako domyślny
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(card.color)) {
        colorInput.value = card.color;
    } else {
        // jeśli masz stare kolory w HSL, ustaw cokolwiek sensownego
        colorInput.value = '#ffffff';
    }

    const removeBtn = document.createElement('button');
    removeBtn.classList.add('kanban-card-remove');
    removeBtn.textContent = '×';

    headerEl.appendChild(colorBtn);
    headerEl.appendChild(removeBtn);
    headerEl.appendChild(colorInput); // input musi być w DOM

    // Treść
    const contentEl = document.createElement('div');
    contentEl.classList.add('kanban-card-content');
    contentEl.contentEditable = 'true';
    contentEl.textContent = card.content || 'Wpisz tutaj treść zadania...';

    // Pasek akcji: ← Przenieś →
    const actionsEl = document.createElement('div');
    actionsEl.classList.add('kanban-card-actions');

    const moveLeftBtn = document.createElement('button');
    moveLeftBtn.classList.add('kanban-move-btn', 'kanban-move-left');
    moveLeftBtn.textContent = '←';

    const moveLabel = document.createElement('span');
    moveLabel.classList.add('kanban-move-label');
    moveLabel.textContent = 'Przenieś';

    const moveRightBtn = document.createElement('button');
    moveRightBtn.classList.add('kanban-move-btn', 'kanban-move-right');
    moveRightBtn.textContent = '→';

    if (card.column === 'todo') {
        moveLeftBtn.disabled = true;
    } else if (card.column === 'done') {
        moveRightBtn.disabled = true;
    }

    actionsEl.appendChild(moveLeftBtn);
    actionsEl.appendChild(moveLabel);
    actionsEl.appendChild(moveRightBtn);

    // --- zdarzenia ---

    // usuwanie
    removeBtn.addEventListener('click', () => {
        const ok = confirm('Czy na pewno chcesz usunąć tę kartę?');
        if (ok) {
            deleteCard(card.id);
        }
    });

    // popup z color-pickerem obok przycisku 🎨
    colorBtn.addEventListener('click', (event) => {
        event.stopPropagation();

        // zamknij inne otwarte popupy
        document
            .querySelectorAll('.kanban-color-popup')
            .forEach((el) => el.remove());

        // tworzymy popup
        const popup = document.createElement('div');
        popup.classList.add('kanban-color-popup');

        const picker = document.createElement('input');
        picker.type = 'color';
        picker.value = '#ffd27f';

        const apply = document.createElement('button');
        apply.textContent = 'OK';

        popup.appendChild(picker);
        popup.appendChild(apply);
        document.body.appendChild(popup);

        // pozycjonowanie popupu obok przycisku
        const rect = colorBtn.getBoundingClientRect();
        popup.style.left = rect.left + 'px';
        popup.style.top = rect.bottom + 5 + 'px';

        // zatwierdzenie koloru
        apply.addEventListener('click', () => {
            const newColor = picker.value;
            card.color = newColor;
            saveCardsToStorage();
            cardEl.style.backgroundColor = newColor;
            popup.remove();
        });
    });

    // zapis zmian treści
    contentEl.addEventListener('input', () => {
        const idx = cards.findIndex((c) => c.id === card.id);
        if (idx !== -1) {
            cards[idx].content = contentEl.textContent;
            saveCardsToStorage();
        }
    });

    // składamy kartę
    cardEl.appendChild(headerEl);
    cardEl.appendChild(contentEl);
    cardEl.appendChild(actionsEl);
    cardsContainer.appendChild(cardEl);
}

function renderAllCards() {
    cards.forEach((card) => renderCard(card));
}

// --- Operacje na kartach ---

function addNewCardToColumn(columnId) {
    const newCard = {
        id: generateCardId(),
        column: columnId,
        content: 'Wpisz tutaj treść zadania...',
        color: getRandomPastelColor(),
        createdAt: Date.now(),
    };

    cards.push(newCard);
    saveCardsToStorage();
    renderCard(newCard);
    updateColumnCounter(columnId);
}

function deleteCard(cardId) {
    const index = cards.findIndex((c) => c.id === cardId);
    if (index === -1) return;

    const columnId = cards[index].column;

    cards.splice(index, 1);
    saveCardsToStorage();

    const cardEl = document.querySelector(
        `.kanban-card[data-card-id="${cardId}"]`
    );
    if (cardEl && cardEl.parentElement) {
        cardEl.parentElement.removeChild(cardEl);
    }

    updateColumnCounter(columnId);
}

// Przenoszenie kart między kolumnami
function moveCard(cardId, direction) {
    const index = cards.findIndex((c) => c.id === cardId);
    if (index === -1) return;

    const card = cards[index];
    const oldColumn = card.column;
    let newColumn = oldColumn;

    if (oldColumn === 'todo' && direction === 'right') {
        newColumn = 'inprogress';
    } else if (oldColumn === 'inprogress' && direction === 'left') {
        newColumn = 'todo';
    } else if (oldColumn === 'inprogress' && direction === 'right') {
        newColumn = 'done';
    } else if (oldColumn === 'done' && direction === 'left') {
        newColumn = 'inprogress';
    }

    if (newColumn === oldColumn) return;

    card.column = newColumn;
    saveCardsToStorage();

    const oldCardEl = document.querySelector(
        `.kanban-card[data-card-id="${cardId}"]`
    );
    if (oldCardEl) {
        oldCardEl.remove();
    }

    renderCard(card);

    updateColumnCounter(oldColumn);
    updateColumnCounter(newColumn);

    const label = COLUMN_LABELS[newColumn] || newColumn;
    showNotification(`Przeniesiono kartę do kolumny "${label}"`);
}

// --- Inicjalizacja ---

document.addEventListener('DOMContentLoaded', () => {
    cards = loadCardsFromStorage();

    // dopisuje createdAt jeśli brakuje (dla już zapisanych kart)
    const now = Date.now();
    let changed = false;
    cards.forEach((card) => {
        if (!card.createdAt) {
            card.createdAt = now;
            changed = true;
        }
    });
    if (changed) saveCardsToStorage();

    renderAllCards();
    updateAllColumnCounters();

    // przyciski "Dodaj kartę"
    const addButtons = document.querySelectorAll('.kanban-add-card-btn');
    addButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const column = btn.closest('.kanban-column');
            if (!column) return;
            const columnId = column.dataset.column;
            addNewCardToColumn(columnId);
        });
    });

    // przyciski "Koloruj kolumnę"
    const colorColumnButtons = document.querySelectorAll(
        '.kanban-color-column-btn'
    );
    colorColumnButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const column = btn.closest('.kanban-column');
            if (!column) return;
            const columnId = column.dataset.column;
            colorizeColumn(columnId);
        });
    });

    // sortowanie: data
    const sortDateButtons = document.querySelectorAll('.kanban-sort-date-btn');
    sortDateButtons.forEach((btn) => {
        btn.dataset.baseLabel = 'Sortuj (data)';
        btn.dataset.direction = 'asc'; // pierwszy klik -> desc (najnowsze na górze)

        btn.addEventListener('click', () => {
            const column = btn.closest('.kanban-column');
            if (!column) return;
            const columnId = column.dataset.column;

            const prevDir = btn.dataset.direction || 'asc';
            const newDir = prevDir === 'asc' ? 'desc' : 'asc';
            btn.dataset.direction = newDir;

            sortColumnBy(columnId, 'date', newDir);

            resetSortButtonIcons();
            setSortButtonIcon(btn, newDir);

            const msg =
                newDir === 'desc'
                    ? 'Przesortowano karty w kolumnie: najnowsze na górze'
                    : 'Przesortowano karty w kolumnie: najstarsze na górze';
            showNotification(msg);
        });
    });

    // sortowanie: ABC
    const sortAbcButtons = document.querySelectorAll('.kanban-sort-abc-btn');
    sortAbcButtons.forEach((btn) => {
        btn.dataset.baseLabel = 'Sortuj (abc)';
        btn.dataset.direction = 'desc'; // pierwszy klik -> asc (A–Z)

        btn.addEventListener('click', () => {
            const column = btn.closest('.kanban-column');
            if (!column) return;
            const columnId = column.dataset.column;

            const prevDir = btn.dataset.direction || 'desc';
            const newDir = prevDir === 'asc' ? 'desc' : 'asc';
            btn.dataset.direction = newDir;

            sortColumnBy(columnId, 'abc', newDir);

            resetSortButtonIcons();
            setSortButtonIcon(btn, newDir);

            const msg =
                newDir === 'asc'
                    ? 'Przesortowano karty w kolumnie: A–Z'
                    : 'Przesortowano karty w kolumnie: Z–A';
            showNotification(msg);
        });
    });

    // delegacja zdarzeń na kolumny – przenoszenie
    const columns = document.querySelectorAll('.kanban-column');
    columns.forEach((column) => {
        column.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            if (
                target.classList.contains('kanban-move-left') ||
                target.classList.contains('kanban-move-right')
            ) {
                if (target.disabled) return;

                const cardEl = target.closest('.kanban-card');
                if (!cardEl) return;

                const cardId = cardEl.dataset.cardId;
                const direction = target.classList.contains('kanban-move-left')
                    ? 'left'
                    : 'right';

                moveCard(cardId, direction);
            }
        });
    });
});

document.addEventListener('click', (e) => {
    const popup = document.querySelector('.kanban-color-popup');
    if (
        popup &&
        !popup.contains(e.target) &&
        !e.target.classList.contains('kanban-card-color-btn')
    ) {
        popup.remove();
    }
});
