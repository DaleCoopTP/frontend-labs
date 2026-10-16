export function validateReview(values) {
    const errors = {};
    const name = typeof values.name === 'string' ? values.name.trim() : '';
    const text = typeof values.text === 'string' ? values.text.trim() : '';
    const rating = Number(values.rating);

    if (name.length < 2 || name.length > 60) {
        errors.name = 'Введите имя длиной от 2 до 60 символов, не состоящее из пробелов.';
    }
    if (text.length < 10 || text.length > 2000) {
        errors.text = 'Напишите отзыв длиной от 10 до 2000 символов, не состоящий из пробелов.';
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        errors.rating = 'Выберите оценку от 1 до 5.';
    }

    return errors;
}

export function isReviewList(value) {
    if (!Array.isArray(value)) {
        return false;
    }

    const ids = new Set();
    return value.every((review) => {
        if (!review || typeof review !== 'object' || Array.isArray(review)) {
            return false;
        }
        if (typeof review.id !== 'string' || !review.id.trim() || review.id.length > 100 || ids.has(review.id)) {
            return false;
        }
        if (typeof review.name !== 'string' || typeof review.text !== 'string' || typeof review.rating !== 'number') {
            return false;
        }
        if (Object.keys(validateReview(review)).length > 0) {
            return false;
        }
        if (typeof review.createdAt !== 'string' || !Number.isFinite(Date.parse(review.createdAt))) {
            return false;
        }
        ids.add(review.id);
        return true;
    });
}

export function createReviewStore(initialReviews = []) {
    let reviews = isReviewList(initialReviews) ? initialReviews.map((review) => ({ ...review })) : [];
    const getAll = () => reviews.map((review) => ({ ...review }));

    function getVisible(query = '') {
        const normalizedQuery = query.trim().toLocaleLowerCase('ru');
        return getAll().filter((review) => `${review.name} ${review.text}`.toLocaleLowerCase('ru').includes(normalizedQuery));
    }

    function add(values) {
        const errors = validateReview(values);
        if (Object.keys(errors).length > 0) {
            return { errors };
        }

        let id;
        do {
            id = globalThis.crypto?.randomUUID?.()
                ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
        } while (reviews.some((review) => review.id === id));

        const review = {
            id,
            name: values.name.trim(),
            text: values.text.trim(),
            rating: Number(values.rating),
            createdAt: new Date().toISOString(),
        };
        reviews = [...reviews, review];
        return { review: { ...review }, errors: {} };
    }

    function remove(id) {
        const remaining = reviews.filter((review) => review.id !== id);
        const removed = remaining.length !== reviews.length;
        reviews = remaining;
        return removed;
    }

    return { getAll, getVisible, add, remove };
}
