// src/js/app.js
import store from './store.js';
import './ui.js'; // samo podpięcie subskrypcji i delegacji kliknięć

// przyciski funkcjonalne oraz pole/tablica z kształtami
const addSquareBtn = document.querySelector('#addSquare');
const addCircleBtn = document.querySelector('#addCircle');
const recolorSquaresBtn = document.querySelector('#recolorSquares');
const recolorCirclesBtn = document.querySelector('#recolorCircles');
const board = document.querySelector('#board');

// Zdarzenia na przyciskach wywołują akcje na stanie w store:
addSquareBtn.addEventListener('click', () => {
    store.addShape('square');
});

addCircleBtn.addEventListener('click', () => {
    store.addShape('circle');
});

recolorSquaresBtn.addEventListener('click', () => {
    store.recolorShapesOfType('square');
});

recolorCirclesBtn.addEventListener('click', () => {
    store.recolorShapesOfType('circle');
});

// Usuwanie kształtów odddelegowane do tablicy/pola #board
board.addEventListener('click', (e) => {
    // szukamy najbliższego elementu z klasą .shape
    const shapeEl = e.target.closest('.shape');
    if (!shapeEl || !board.contains(shapeEl)) return;

    const id = Number(shapeEl.dataset.id);
    if (!Number.isNaN(id)) {
        // kliknięcie zmienia stan poprzez operację store
        store.removeShape(id);
    }
});
