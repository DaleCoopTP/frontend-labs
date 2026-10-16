export function initializeSlider(root) {
    if (root.dataset.sliderReady === 'true') {
        return;
    }

    const slides = [...root.querySelectorAll('[data-slide]')];
    const controls = root.querySelector('[data-slider-controls]');
    const previous = root.querySelector('[data-slider-previous]');
    const next = root.querySelector('[data-slider-next]');
    const indicators = root.querySelector('[data-slider-indicators]');
    const status = root.querySelector('[data-slider-status]');
    if (slides.length === 0 || !controls || !previous || !next || !indicators || !status) {
        return;
    }

    let currentIndex = 0;
    const dots = slides.map((slide, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'slider__indicator';
        dot.dataset.slideIndex = String(index);
        dot.setAttribute('aria-label', `Показать отзыв ${index + 1}`);
        return dot;
    });
    indicators.replaceChildren(...dots);

    function render() {
        const requested = Number.parseInt(getComputedStyle(root).getPropertyValue('--slides-per-view'), 10) || 1;
        const visibleCount = Math.min(slides.length, Math.max(1, Math.min(requested, 3)));
        slides.forEach((slide) => {
            slide.hidden = true;
            slide.removeAttribute('data-position');
        });
        const visibleNumbers = [];
        for (let offset = 0; offset < visibleCount; offset += 1) {
            const index = (currentIndex + offset) % slides.length;
            slides[index].hidden = false;
            slides[index].dataset.position = String(offset);
            visibleNumbers.push(index + 1);
        }
        dots.forEach((dot, index) => {
            dot.classList.toggle('slider__indicator--current', index === currentIndex);
            dot.setAttribute('aria-pressed', String(index === currentIndex));
        });
        previous.disabled = slides.length < 2;
        next.disabled = slides.length < 2;
        status.textContent = `Показаны отзывы: ${visibleNumbers.join(', ')} из ${slides.length}.`;
    }

    function move(step) {
        currentIndex = (currentIndex + step + slides.length) % slides.length;
        render();
    }

    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    indicators.addEventListener('click', (event) => {
        const dot = event.target.closest('button[data-slide-index]');
        if (!dot || !indicators.contains(dot)) {
            return;
        }
        currentIndex = Number(dot.dataset.slideIndex);
        render();
    });

    root.dataset.sliderReady = 'true';
    controls.hidden = false;
    render();
    const observer = new ResizeObserver(render);
    observer.observe(root);
}
