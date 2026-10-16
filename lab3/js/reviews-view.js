function createElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

function createReviewCard(review) {
    const item = createElement('li', 'feedback__item');
    const article = createElement('article', 'feedback-card');
    const header = createElement('header', 'feedback-card__header');
    const name = createElement('h3', 'feedback-card__name', review.name);
    const date = createElement('time', 'feedback-card__date');
    date.dateTime = review.createdAt;
    date.textContent = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' }).format(new Date(review.createdAt));
    header.append(name, date);

    const rating = createElement('p', 'feedback-card__rating', `Оценка: ${review.rating} из 5`);
    const text = createElement('p', 'feedback-card__text', review.text);
    const remove = createElement('button', 'button button--secondary feedback-card__delete', 'Удалить отзыв');
    remove.type = 'button';
    remove.dataset.reviewId = review.id;
    remove.setAttribute('aria-label', `Удалить отзыв: ${review.name}`);
    article.append(header, rating, text, remove);
    item.append(article);
    return item;
}

export function createReviewView(root) {
    const form = root.querySelector('[data-review-form]');
    const list = root.querySelector('[data-review-list]');
    const empty = root.querySelector('[data-review-empty]');
    const summary = root.querySelector('[data-review-summary]');
    const storageError = root.querySelector('[data-storage-error]');
    const status = root.querySelector('[data-review-status]');
    const fields = ['name', 'text', 'rating'];

    function render(reviews, total) {
        const fragment = document.createDocumentFragment();
        reviews.forEach((review) => fragment.append(createReviewCard(review)));
        list.replaceChildren(fragment);
        empty.hidden = reviews.length > 0;
        empty.textContent = total === 0
            ? 'Пока нет отзывов. Поделитесь впечатлениями о консультации первым.'
            : 'По вашему запросу ничего не найдено. Измените запрос или сбросьте поиск.';
        summary.textContent = `Показано отзывов: ${reviews.length} из ${total}.`;
    }

    function showStorageError(message) {
        storageError.textContent = message;
        storageError.hidden = !message;
    }

    function showFieldError(name, message = '') {
        const field = form.elements.namedItem(name);
        const error = root.querySelector(`[data-error-for="${name}"]`);
        field.setCustomValidity(message);
        if (message) {
            field.setAttribute('aria-invalid', 'true');
        } else {
            field.removeAttribute('aria-invalid');
        }
        error.textContent = message;
        error.hidden = !message;
    }

    function showErrors(errors) {
        fields.forEach((name) => showFieldError(name, errors[name]));
    }

    function announce(message) {
        status.textContent = message;
    }

    return { render, showStorageError, showErrors, showFieldError, announce };
}
