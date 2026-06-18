(function () {
    var sections = document.querySelectorAll('.section');
    var pages = document.querySelectorAll('.section-page');
    var navLinks = document.querySelectorAll('.nav-link');
    var container = document.querySelector('.scroll-container');
    var ticking = false;
    var editMode = false;

    /* ─── Nav Highlight ─── */

    function updateActive() {
        var scrollTop = container.scrollTop;
        var containerHeight = container.clientHeight;
        var halfView = containerHeight / 2;

        var activeIndex = 0;
        sections.forEach(function (sec, i) {
            var offsetTop = sec.offsetTop;
            var offsetBottom = offsetTop + sec.offsetHeight;
            if (offsetTop <= scrollTop + halfView && offsetBottom > scrollTop + halfView) {
                activeIndex = i;
            }
        });

        navLinks.forEach(function (link, i) {
            link.classList.toggle('active', i === activeIndex);
        });
    }

    /* ─── Page Flip ─── */

    function applyPageFlip() {
        if (editMode) return;

        var vh = container.clientHeight;

        sections.forEach(function (sec, i) {
            var page = pages[i];
            var rect = sec.getBoundingClientRect();
            var secTop = rect.top;
            var secBottom = rect.bottom;

            var visibleTop = Math.max(0, -secTop);
            var visibleBottom = Math.min(vh, secBottom);
            var visibleHeight = Math.max(0, visibleBottom - visibleTop);
            var ratio = visibleHeight / sec.offsetHeight;

            if (ratio > 0.97 || ratio < 0.03) {
                page.style.transform = '';
                page.style.opacity = '';
                page.style.transformOrigin = '';
                return;
            }

            var center = (secTop + secBottom) / 2;
            var isOutgoing = center < vh / 2;
            var progress = 1 - ratio;

            var rotate, translateY, opacity, scale, origin;

            if (isOutgoing) {
                origin = 'center bottom';
                rotate = progress * (-35);
                translateY = progress * (-100);
                opacity = 1 - progress * 0.85;
                scale = 1 - progress * 0.035;
            } else {
                origin = 'center bottom';
                rotate = progress * 28;
                translateY = progress * 90;
                opacity = 0.2 + ratio * 0.8;
                scale = 0.965 + progress * 0.035;
            }

            page.style.transformOrigin = origin;
            page.style.transform = 'rotateX(' + rotate + 'deg) translateY(' + translateY + 'px) scale(' + scale + ')';
            page.style.opacity = opacity;
        });
    }

    container.addEventListener('scroll', function () {
        if (!ticking) {
            requestAnimationFrame(function () {
                updateActive();
                applyPageFlip();
                ticking = false;
            });
            ticking = true;
        }
    });

    updateActive();
    applyPageFlip();

    navLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            if (editMode) return;
            var targetId = link.getAttribute('href').substring(1);
            var target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    /* ─── Konami Code → Edit Mode ─── */

    var konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var keyBuffer = [];

    document.addEventListener('keydown', function (e) {
        if (editMode) return;

        keyBuffer.push(e.key);
        if (keyBuffer.length > konamiCode.length) {
            keyBuffer.shift();
        }

        if (keyBuffer.length === konamiCode.length && keyBuffer.every(function (k, i) { return k === konamiCode[i]; })) {
            activateEditMode();
        }
    });

    function activateEditMode() {
        editMode = true;
        document.body.classList.add('edit-mode');

        var contents = document.querySelectorAll('.section-content');
        contents.forEach(function (el) {
            el.contentEditable = 'true';
            el.classList.add('editable');
        });

        var bar = document.createElement('div');
        bar.id = 'edit-bar';
        bar.innerHTML = '<span class="edit-label">\u270F\uFE0F Edit Mode</span>';

        var exportBtn = document.createElement('button');
        exportBtn.id = 'export-btn';
        exportBtn.textContent = 'Export';
        bar.appendChild(exportBtn);

        document.body.appendChild(bar);

        exportBtn.addEventListener('click', exportContent);
    }

    /* ─── Export ─── */

    function exportContent() {
        var data = {};
        document.querySelectorAll('.section').forEach(function (sec) {
            var id = sec.id;
            var contentEl = sec.querySelector('.section-content');
            if (contentEl) {
                data[id] = contentEl.innerHTML;
            }
        });

        data['_meta'] = { exportedAt: new Date().toISOString() };

        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'page-content.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /* ─── Publications: clickable cards ─── */

    document.querySelectorAll('.pub-text[data-href]').forEach(function (el) {
        el.addEventListener('click', function () {
            window.open(el.getAttribute('data-href'), '_blank');
        });
    });

    /* ─── Publications see more / see less ─── */

    function initSeeMore() {
        document.querySelectorAll('.pub-list li').forEach(function (li) {
            var desc = li.querySelector('.pub-desc');
            if (!desc) return;

            var lh = Math.round(parseFloat(getComputedStyle(desc).lineHeight));
            if (!lh || lh <= 0) {
                lh = Math.round(parseFloat(getComputedStyle(desc).fontSize) * 1.5);
            }
            lh = Math.max(lh, 15);
            var twoLines = lh * 2;

            desc.style.overflow = 'hidden';
            desc.style.maxHeight = twoLines + 'px';
            desc.style.transition = 'max-height 0.3s ease';
            void desc.offsetHeight;

            if (desc.scrollHeight > desc.clientHeight + 1) {
                var btn = document.createElement('button');
                btn.className = 'see-more-btn visible';
                btn.textContent = '... see more';
                li.appendChild(btn);

                btn.addEventListener('click', function () {
                    if (desc.style.maxHeight !== 'none') {
                        desc.style.maxHeight = 'none';
                        btn.textContent = 'see less';
                    } else {
                        desc.style.maxHeight = twoLines + 'px';
                        btn.textContent = '... see more';
                    }
                });
            } else {
                desc.style.maxHeight = '';
                desc.style.overflow = '';
                desc.style.transition = '';
            }
        });
    }

    initSeeMore();

})();
