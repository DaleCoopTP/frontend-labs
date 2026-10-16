import { initializeReviews } from './reviews-controller.js';
import { initializeSlider } from './slider.js';

for (const root of document.querySelectorAll('[data-reviews]')) {
    initializeReviews(root);
}

for (const root of document.querySelectorAll('[data-slider]')) {
    initializeSlider(root);
}
