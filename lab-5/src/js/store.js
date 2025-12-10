// src/js/store.js
import { randomHsl } from './helpers.js';

const STORAGE_KEY = 'shapes-app-state-v1';

class Store {
    // Prywatne pola
    #subscribers;
    #shapes;
    #nextId;

    constructor() {
        this.#subscribers = new Set();

        // domyślny stan
        this.#shapes = [];
        this.#nextId = 1;

        // wczytaj z localStorage, jeśli jest
        try {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed.shapes)) {
                    this.#shapes = parsed.shapes;
                    this.#nextId =
                        typeof parsed.nextId === 'number'
                            ? parsed.nextId
                            : this.#calculateNextId();
                }
            }
        } catch (e) {
            console.warn('Nie udało się wczytać stanu z localStorage', e);
        }

        // początkowy notify, żeby UI zrenderował to, co jest w pamięci
        this.#notify();
    }

    // prywatne:
    // zapis do localStorage
    #saveToLocalStorage() {
        try {
            const data = JSON.stringify({
                shapes: this.#shapes,
                nextId: this.#nextId,
            });
            window.localStorage.setItem(STORAGE_KEY, data);
        } catch (e) {
            console.warn('Nie udało się zapisać stanu do localStorage', e);
        }
    }

    // powiadomienia
    #notify() {
        const snapshot = this.getState();
        const counts = this.getCounts();
        for (const fn of this.#subscribers) {
            fn(snapshot, counts);
        }
        // tu też zapis do localStorage
        this.#saveToLocalStorage();
    }

    // liczenie nextId na podstawie aktualnych kształtów
    #calculateNextId() {
        if (this.#shapes.length === 0) return 1;
        return Math.max(...this.#shapes.map((s) => s.id)) + 1;
    }

    // Gettery - publiczne
    // "Kopia" stanu
    getState() {
        return {
            shapes: this.#shapes.map((s) => ({ ...s })),
        };
    }

    // liczniki kształtów
    getCounts() {
        let squares = 0;
        let circles = 0;
        for (const s of this.#shapes) {
            if (s.type === 'square') squares++;
            else if (s.type === 'circle') circles++;
        }
        return { squares, circles };
    }

    // subskrybcja na zmiany -> wzorzec Obserwator
    subscribe(callback) {
        this.#subscribers.add(callback);
        // od razu dajemy aktualny stan i liczniki
        callback(this.getState(), this.getCounts());
        // zwracamy funkcję do wypisania się
        return () => {
            this.#subscribers.delete(callback);
        };
    }

    // Metody (publiczne) modyfikujące stan -> realnie jedyne wejście do zmiany z app.js

    addShape(type) {
        if (type !== 'square' && type !== 'circle') {
            throw new Error('Nieznany typ kształtu: ' + type);
        }
        const shape = {
            id: this.#nextId++,
            type,
            color: randomHsl(),
        };
        this.#shapes.push(shape);
        this.#notify();
    }

    removeShape(id) {
        const before = this.#shapes.length;
        this.#shapes = this.#shapes.filter((s) => s.id !== id);
        if (this.#shapes.length !== before) {
            this.#notify();
        }
    }

    recolorShapesOfType(type) {
        let changed = false; // domyslnie nic sie nie zmieniło
        this.#shapes = this.#shapes.map((s) => {
            if (s.type === type) {
                changed = true; // przypadek, że jednak coś się zmieniło
                return { ...s, color: randomHsl() };
            }
            return s;
        });
        if (changed) {
            this.#notify(); // notify i renderujemy tylko jezeli coś sie zmieniło
        }
    }
}

// globalny store -> Singleton
const store = new Store();
export default store;
