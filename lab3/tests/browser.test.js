import { initializeReviews } from '../js/reviews-controller.js';
import { createReviewStorage } from '../js/reviews-storage.js';
import { initializeSlider } from '../js/slider.js';

const results = document.querySelector('[data-test-results]');
const summary = document.querySelector('[data-test-summary]');
const fixture = document.querySelector('[data-test-fixture]');
const response = await fetch('../index.html');
const source = new DOMParser().parseFromString(await response.text(), 'text/html');
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function test(title, action) {
    const result = document.createElement('li');
    try {
        action();
        passed += 1;
        result.textContent = `Пройдено: ${title}`;
    } catch (error) {
        failed += 1;
        result.textContent = `Ошибка: ${title}. ${error.message}`;
    }
    results.append(result);
}

function memoryStorage(raw = null) {
    return {
        raw,
        getItem() { return this.raw; },
        setItem(key, value) { this.raw = value; },
    };
}

function reviewsRoot(memory) {
    const root = source.querySelector('[data-reviews]').cloneNode(true);
    fixture.replaceChildren(root);
    initializeReviews(root, createReviewStorage(() => memory));
    return root;
}

function addReview(root, name, text, rating = '5') {
    const form = root.querySelector('[data-review-form]');
    for (const [fieldName, value] of Object.entries({ name, text, rating })) {
        const field = form.elements.namedItem(fieldName);
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
    }
    form.requestSubmit();
}

function searchReviews(root, query) {
    const search = root.querySelector('[data-review-search]');
    search.value = query;
    search.dispatchEvent(new Event('input', { bubbles: true }));
}

function reviewCards(root) {
    return [...root.querySelectorAll('.feedback-card')];
}

const memory = memoryStorage();
let root = reviewsRoot(memory);

test('исходный список пуст при отсутствии сохранения', () => {
    assert(reviewCards(root).length === 0, 'В списке появились исходные записи.');
    assert(root.querySelector('[data-review-empty]').textContent.includes('Пока нет'), 'Нет сообщения о пустом списке.');
});

test('пробельный ввод отклоняется с объяснением ошибки', () => {
    addReview(root, '    ', '                 ');
    assert(reviewCards(root).length === 0, 'Создан некорректный отзыв.');
    assert(!root.querySelector('[data-error-for="name"]').hidden, 'Нет ошибки имени.');
    assert(!root.querySelector('[data-error-for="text"]').hidden, 'Нет ошибки текста.');
});

test('HTML-ограничения и JS отклоняют пустую оценку', () => {
    addReview(root, 'Анна', 'Спасибо за помощь с документами.', '');
    assert(reviewCards(root).length === 0, 'Создан отзыв без оценки.');
    assert(!root.querySelector('[data-error-for="rating"]').hidden, 'Нет объяснения ошибки оценки.');
});

test('успешное добавление очищает форму и сохраняет отзыв', () => {
    addReview(root, 'Анна', 'Спасибо за помощь с документами.');
    const form = root.querySelector('[data-review-form]');
    assert(reviewCards(root).length === 1, 'Отзыв не добавлен.');
    assert(form.elements.namedItem('name').value === '' && form.elements.namedItem('text').value === '' && form.elements.namedItem('rating').value === '', 'Форма не очищена.');
    assert(JSON.parse(memory.raw).length === 1, 'Отзыв не сохранён.');
});

test('пользовательский HTML отображается текстом', () => {
    addReview(root, 'Борис', '<img src=x onerror="throw new Error()">');
    const list = root.querySelector('[data-review-list]');
    assert(list.querySelector('img') === null, 'Пользовательский HTML стал разметкой.');
    assert(list.textContent.includes('<img src=x'), 'Текст отзыва изменён.');
});

test('поиск не изменяет сохранённый массив', () => {
    const saved = memory.raw;
    searchReviews(root, 'АННА');
    assert(reviewCards(root).length === 1, 'Поиск по имени не работает.');
    assert(memory.raw === saved, 'Поиск изменил исходные данные.');
});

test('неподходящий отзыв добавляется, но скрыт при активном поиске', () => {
    addReview(root, 'Виктор', 'Подробно объяснили порядок действий.');
    assert(reviewCards(root).length === 1, 'Неподходящий отзыв показан.');
    assert(JSON.parse(memory.raw).length === 3, 'Неподходящий отзыв не сохранён.');
    assert(root.querySelector('[data-review-search]').value === 'АННА', 'Поиск сброшен при добавлении.');
});

test('подходящий отзыв появляется при активном поиске', () => {
    addReview(root, 'Анна', 'Помогли составить исковое заявление.');
    assert(reviewCards(root).length === 2, 'Подходящий отзыв не показан.');
});

test('удаление под фильтром удаляет выбранный id и сохраняет остальные записи', () => {
    const original = JSON.parse(memory.raw);
    const button = reviewCards(root)[1].querySelector('button');
    const selectedId = button.dataset.reviewId;
    button.click();
    const remaining = JSON.parse(memory.raw);
    assert(!remaining.some((review) => review.id === selectedId), 'Удалён другой отзыв.');
    assert(remaining.length === original.length - 1, 'Удалено несколько отзывов.');
    assert(remaining.some((review) => review.name === 'Борис'), 'Удалён скрытый отзыв.');
    assert(document.activeElement.matches('button[data-review-id]'), 'После удаления потерян фокус.');
});

test('отсутствие совпадений отличается от пустого исходного списка', () => {
    searchReviews(root, 'совпадений точно нет');
    assert(reviewCards(root).length === 0, 'Есть лишние результаты.');
    assert(root.querySelector('[data-review-empty]').textContent.includes('ничего не найдено'), 'Нет сообщения об отсутствии совпадений.');
});

test('сброс поиска возвращает все оставшиеся записи', () => {
    root.querySelector('[data-review-reset]').click();
    assert(reviewCards(root).length === 3, 'Вернулись не все записи.');
    assert(root.querySelector('[data-review-search]').value === '', 'Строка поиска не очищена.');
});

test('повторная инициализация не накапливает обработчики', () => {
    initializeReviews(root, createReviewStorage(() => memory));
    addReview(root, 'Галина', 'Быстро ответили на мой юридический вопрос.');
    assert(JSON.parse(memory.raw).length === 4, 'Обработчик сработал несколько раз.');
});

test('повторное открытие восстанавливает записи и идентификаторы', () => {
    const savedIds = JSON.parse(memory.raw).map((review) => review.id).join(',');
    root = reviewsRoot(memory);
    const restoredIds = [...root.querySelectorAll('[data-review-id]')].map((button) => button.dataset.reviewId).join(',');
    assert(savedIds === restoredIds, 'Изменились данные или идентификаторы.');
});

test('удаление всех записей сохраняет [] и после повторного открытия список пуст', () => {
    while (root.querySelector('[data-review-id]')) {
        root.querySelector('[data-review-id]').click();
    }
    assert(memory.raw === '[]', 'Пустой список не сохранён.');
    root = reviewsRoot(memory);
    assert(reviewCards(root).length === 0, 'Удалённые отзывы восстановились.');
    assert(root.querySelector('[data-review-empty]').textContent.includes('Пока нет'), 'Нет сообщения о пустом списке.');
});

test('повреждённые JSON и структура не мешают дальнейшему добавлению', () => {
    for (const raw of ['{', '{"reviews":[]}', '[{"id":1}]']) {
        const damaged = memoryStorage(raw);
        const section = reviewsRoot(damaged);
        assert(!section.querySelector('[data-storage-error]').hidden, 'Ошибка не показана.');
        addReview(section, 'Денис', 'Помогли разобраться в сложном вопросе.');
        assert(reviewCards(section).length === 1, 'Раздел перестал работать.');
        assert(JSON.parse(damaged.raw).length === 1, 'Список не восстановлен после изменения.');
    }
});

test('ошибки чтения и сохранения сообщаются, добавление и удаление продолжают работать', () => {
    const broken = {
        getItem() { throw new Error('read denied'); },
        setItem() { throw new Error('quota exceeded'); },
    };
    const section = reviewsRoot(broken);
    assert(!section.querySelector('[data-storage-error]').hidden, 'Нет ошибки чтения.');
    addReview(section, 'Елена', 'Спасибо за понятный и подробный ответ.');
    assert(reviewCards(section).length === 1, 'Ошибка записи сломала добавление.');
    assert(section.querySelector('[data-storage-error]').textContent.includes('сохранить'), 'Нет ошибки сохранения.');
    section.querySelector('[data-review-id]').click();
    assert(reviewCards(section).length === 0, 'Ошибка записи сломала удаление.');
});

fixture.replaceChildren();
let sliderNumber = 0;
function sliderRoot(count = 3) {
    const slider = source.querySelector('[data-slider]').cloneNode(true);
    slider.removeAttribute('id');
    sliderNumber += 1;
    const titleId = `test-slider-title-${sliderNumber}`;
    slider.querySelector('h2').id = titleId;
    slider.setAttribute('aria-labelledby', titleId);
    [...slider.querySelectorAll('[data-slide]')].slice(count).forEach((slide) => slide.remove());
    fixture.append(slider);
    initializeSlider(slider);
    return slider;
}

function currentSlide(slider) {
    return slider.querySelector('.slider__indicator--current')?.dataset.slideIndex;
}

const firstSlider = sliderRoot();
const secondSlider = sliderRoot();

test('стрелки зацикливают слайдер в обе стороны', () => {
    firstSlider.querySelector('[data-slider-previous]').click();
    assert(currentSlide(firstSlider) === '2', 'Переход назад через границу не работает.');
    firstSlider.querySelector('[data-slider-next]').click();
    assert(currentSlide(firstSlider) === '0', 'Переход вперёд через границу не работает.');
});

test('точки переключают слайды и обновляют активный индикатор', () => {
    firstSlider.querySelector('[data-slide-index="1"]').click();
    assert(currentSlide(firstSlider) === '1', 'Точка не переключила слайд.');
    assert(firstSlider.querySelectorAll('[aria-pressed="true"]').length === 1, 'Выделено несколько индикаторов.');
    assert(firstSlider.querySelector('[data-slide][data-position="0"]').getAttribute('aria-label') === 'Отзыв 2 из 3', 'Показана другая группа.');
});

test('два слайдера независимы, повторная инициализация не удваивает переключение', () => {
    assert(currentSlide(secondSlider) === '0', 'Изменился другой слайдер.');
    initializeSlider(firstSlider);
    firstSlider.querySelector('[data-slider-next]').click();
    assert(currentSlide(firstSlider) === '2', 'Дублируются обработчики.');
    assert(currentSlide(secondSlider) === '0', 'Слайдеры используют общее состояние.');
});

test('долгое переключение не выходит за границы, число видимых карточек соответствует CSS', () => {
    for (let index = 0; index < 20; index += 1) {
        firstSlider.querySelector('[data-slider-next]').click();
    }
    const expected = Math.min(3, Number.parseInt(getComputedStyle(firstSlider).getPropertyValue('--slides-per-view'), 10));
    assert(firstSlider.querySelectorAll('[data-slide]:not([hidden])').length === expected, 'Показано неверное число карточек.');
    assert(firstSlider.querySelectorAll('[data-position="0"]').length === 1, 'Неверная текущая карточка.');
});

test('слайдеры с одним и без слайдов не вызывают ошибок', () => {
    const single = sliderRoot(1);
    const empty = sliderRoot(0);
    assert(single.querySelector('[data-slider-next]').disabled, 'Кнопка единственного слайда доступна.');
    assert(single.querySelector('[data-slider-previous]').disabled, 'Кнопка единственного слайда доступна.');
    assert(empty.querySelector('[data-slider-controls]').hidden, 'У пустого слайдера видны кнопки.');
});

fixture.replaceChildren();
summary.textContent = `Пройдено: ${passed}. Ошибок: ${failed}.`;
document.body.dataset.testResult = failed === 0 ? 'passed' : 'failed';
