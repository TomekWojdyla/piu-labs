// src/js/ui.js
import store from './store.js';

// pobieramy elementy interfejsu
const board = document.querySelector('#board');
const cntSquaresEl = document.querySelector('#cntSquares');
const cntCirclesEl = document.querySelector('#cntCircles');

// ====== RENDEROWANIE STANU ======

function render(state, counts) {
    const { shapes } = state;

    // mapka: id -> obiekt kształtu
    const shapesById = new Map(shapes.map((s) => [String(s.id), s]));

    // 1) usuń elementy z DOM, których nie ma już w stanie
    const existingEls = Array.from(board.children);
    for (const el of existingEls) {
        const id = el.dataset.id;
        if (!shapesById.has(id)) {
            el.remove();
        }
    }

    // 2) dodaj / zaktualizuj elementy na podstawie stanu
    for (const shape of shapes) {
        const idStr = String(shape.id);
        let el = board.querySelector(`[data-id="${idStr}"]`);

        if (!el) {
            // nowy element
            el = document.createElement('div');
            el.classList.add('shape');
            el.dataset.id = idStr;
            board.appendChild(el);
        }

        // ustaw typ (square / circle)
        el.classList.toggle('square', shape.type === 'square');
        el.classList.toggle('circle', shape.type === 'circle');

        // kolor
        el.style.backgroundColor = shape.color;
    }

    // 3) liczniki
    cntSquaresEl.textContent = counts.squares;
    cntCirclesEl.textContent = counts.circles;
}

// subskrypcja na zmiany store -> Obserwator
store.subscribe(render);
