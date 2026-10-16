import test from 'node:test';
import assert from 'node:assert/strict';
import { createReviewStore, isReviewList, validateReview } from '../js/reviews-model.js';
import { createReviewStorage, REVIEWS_STORAGE_KEY } from '../js/reviews-storage.js';

const values = { name: 'Матвей', text: 'Спасибо за подробную консультацию.', rating: '5' };

function memoryStorage(initial = null) {
    let raw = initial;
    return {
        getItem: () => raw,
        setItem(key, value) {
            assert.equal(key, REVIEWS_STORAGE_KEY);
            raw = value;
        },
    };
}

test('отсутствие данных и сохранённый пустой массив дают пустой список', () => {
    for (const raw of [null, '[]']) {
        assert.deepEqual(createReviewStorage(() => memoryStorage(raw)).load(), { reviews: [], error: '' });
    }
});

test('пробелы, неверные длины и оценки не создают записи', () => {
    const store = createReviewStore();
    for (const invalid of [
        { ...values, name: '    ' },
        { ...values, name: 'М' },
        { ...values, name: 'М'.repeat(61) },
        { ...values, text: '                ' },
        { ...values, text: 'Коротко' },
        { ...values, text: 'М'.repeat(2001) },
        { ...values, rating: '' },
        { ...values, rating: '6' },
        { ...values, rating: '1.5' },
    ]) {
        assert.ok(Object.keys(validateReview(invalid)).length > 0);
        assert.equal(store.add(invalid).review, undefined);
    }
    assert.deepEqual(store.getAll(), []);
});

test('создаются уникальные устойчивые идентификаторы, текст обрезается по краям', () => {
    const store = createReviewStore();
    const first = store.add({ ...values, name: '  Матвей  ', text: `  ${values.text}  ` }).review;
    const second = store.add(values).review;
    assert.equal(first.name, values.name);
    assert.equal(first.text, values.text);
    assert.equal(first.rating, 5);
    assert.notEqual(first.id, second.id);
    const restored = createReviewStore(JSON.parse(JSON.stringify(store.getAll())));
    assert.deepEqual(restored.getAll(), store.getAll());
});

test('поиск не меняет исходный список и учитывает имя, текст и регистр', () => {
    const store = createReviewStore();
    store.add(values);
    store.add({ ...values, name: 'Анна', text: 'Помогли с жилищным вопросом.' });
    const original = store.getAll();
    assert.equal(store.getVisible(' МАТВЕЙ ').length, 1);
    assert.equal(store.getVisible('ЖИЛИЩНЫМ')[0].name, 'Анна');
    assert.deepEqual(store.getVisible('нет совпадений'), []);
    assert.deepEqual(store.getVisible('   '), original);
    assert.deepEqual(store.getAll(), original);
    store.getVisible('')[0].name = 'Изменено';
    assert.equal(store.getAll()[0].name, 'Матвей');
});

test('при фильтрации новый неподходящий отзыв скрыт, удаление использует id', () => {
    const store = createReviewStore();
    const first = store.add(values).review;
    const second = store.add({ ...values, name: 'Анна', text: 'Помогли с жилищным вопросом.' }).review;
    const third = store.add({ ...values, name: 'Анна', text: 'Ещё одна подробная консультация.' }).review;
    assert.deepEqual(store.getVisible('Анна').map((review) => review.id), [second.id, third.id]);
    assert.equal(store.remove(second.id), true);
    assert.equal(store.remove('несуществующий'), false);
    assert.deepEqual(store.getAll().map((review) => review.id), [first.id, third.id]);
    assert.deepEqual(store.getVisible('Анна').map((review) => review.id), [third.id]);
});

test('после удаления последнего отзыва сохраняется и восстанавливается []', () => {
    const store = createReviewStore();
    const storage = createReviewStorage(() => memory);
    const memory = memoryStorage();
    const review = store.add(values).review;
    assert.equal(storage.save(store.getAll()), '');
    assert.equal(storage.load().reviews[0].id, review.id);
    store.remove(review.id);
    assert.equal(storage.save(store.getAll()), '');
    assert.equal(memory.getItem(), '[]');
    assert.deepEqual(storage.load().reviews, []);
});

test('некорректный JSON и структуры распознаются без исключения', () => {
    const valid = createReviewStore().add(values).review;
    for (const raw of ['{', '', 'null', '{}', '[null]', '[1]', JSON.stringify([valid, valid]),
        JSON.stringify([{ ...valid, rating: '5' }]), JSON.stringify([{ ...valid, rating: 7 }]),
        JSON.stringify([{ ...valid, id: ' ' }]), JSON.stringify([{ ...valid, name: '  ' }]),
        JSON.stringify([{ ...valid, text: ' ' }]), JSON.stringify([{ ...valid, createdAt: 'не дата' }]),
        JSON.stringify([{ id: valid.id }])]) {
        const result = createReviewStorage(() => memoryStorage(raw)).load();
        assert.deepEqual(result.reviews, []);
        assert.ok(result.error);
    }
    assert.equal(isReviewList([valid]), true);
    assert.equal(isReviewList([]), true);
});

test('запрет доступа, ошибки чтения и записи не выбрасываются наружу', () => {
    const denied = createReviewStorage(() => { throw new Error('denied'); });
    assert.ok(denied.load().error);
    assert.ok(denied.save([]));
    const broken = createReviewStorage(() => ({
        getItem() { throw new Error('read'); },
        setItem() { throw new Error('quota'); },
    }));
    assert.ok(broken.load().error);
    assert.ok(broken.save([]));
});
