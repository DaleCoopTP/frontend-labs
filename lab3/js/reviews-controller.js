import { createReviewStore, validateReview } from './reviews-model.js';
import { createReviewStorage } from './reviews-storage.js';
import { createReviewView } from './reviews-view.js';

export function initializeReviews(root, storage = createReviewStorage()) {
    if (root.dataset.reviewsReady === 'true') {
        return;
    }
    root.dataset.reviewsReady = 'true';

    const loaded = storage.load();
    const store = createReviewStore(loaded.reviews);
    const view = createReviewView(root);
    const form = root.querySelector('[data-review-form]');
    const search = root.querySelector('[data-review-search]');
    const reset = root.querySelector('[data-review-reset]');
    const list = root.querySelector('[data-review-list]');
    form.noValidate = true;

    function render() {
        view.render(store.getVisible(search.value), store.getAll().length);
    }

    function save() {
        view.showStorageError(storage.save(store.getAll()));
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(form));
        const errors = validateReview(values);
        view.showErrors(errors);
        if (!form.checkValidity()) {
            view.announce('Проверьте поля формы. Отзыв не добавлен.');
            form.reportValidity();
            return;
        }

        const result = store.add(values);
        if (!result.review) {
            view.showErrors(result.errors);
            return;
        }
        save();
        render();
        const isVisible = store.getVisible(search.value).some((review) => review.id === result.review.id);
        view.announce(isVisible ? 'Отзыв добавлен.' : 'Отзыв добавлен. Он не соответствует поиску и появится после сброса.');
        form.reset();
        view.showErrors({});
        form.elements.namedItem('name').focus();
    });

    form.addEventListener('input', (event) => {
        if (['name', 'text', 'rating'].includes(event.target.name)) {
            view.showFieldError(event.target.name);
        }
    });

    search.addEventListener('input', () => {
        render();
        view.announce('');
    });

    reset.addEventListener('click', () => {
        search.value = '';
        render();
        view.announce('Поиск сброшен. Показаны все оставшиеся отзывы.');
        search.focus();
    });

    list.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-review-id]');
        if (!button || !list.contains(button)) {
            return;
        }
        const position = [...list.querySelectorAll('button[data-review-id]')].indexOf(button);
        if (!store.remove(button.dataset.reviewId)) {
            return;
        }
        save();
        render();
        view.announce('Отзыв удалён.');
        const remainingButtons = list.querySelectorAll('button[data-review-id]');
        const nextButton = remainingButtons[Math.min(position, remainingButtons.length - 1)];
        (nextButton ?? search).focus();
    });

    view.showStorageError(loaded.error);
    render();
}
