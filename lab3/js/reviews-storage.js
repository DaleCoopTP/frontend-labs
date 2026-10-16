import { isReviewList } from './reviews-model.js';

export const REVIEWS_STORAGE_KEY = '100-lawyers:lab3:reviews';

export function createReviewStorage(getStorage = () => globalThis.localStorage) {
    function load() {
        let raw;
        try {
            raw = getStorage().getItem(REVIEWS_STORAGE_KEY);
        } catch {
            return { reviews: [], error: 'Не удалось прочитать сохранённые отзывы. Раздел работает, но прежние данные недоступны.' };
        }
        if (raw === null) {
            return { reviews: [], error: '' };
        }

        let reviews;
        try {
            reviews = JSON.parse(raw);
        } catch {
            return { reviews: [], error: 'Сохранённые отзывы содержат некорректный JSON. Можно начать новый список.' };
        }
        if (!isReviewList(reviews)) {
            return { reviews: [], error: 'Структура сохранённых отзывов повреждена. Можно начать новый список.' };
        }
        return { reviews, error: '' };
    }

    function save(reviews) {
        try {
            getStorage().setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
            return '';
        } catch {
            return 'Не удалось сохранить отзывы. Изменения доступны в этой вкладке и могут потеряться после перезагрузки.';
        }
    }

    return { load, save };
}
