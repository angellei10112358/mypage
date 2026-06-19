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

            var translateY, opacity, scale;

            if (isOutgoing) {
                translateY = progress * (-180);
                opacity = 1 - progress;
                scale = 1 - progress * 0.04;
            } else {
                translateY = (1 - ratio) * 120;
                opacity = 0.15 + ratio * 0.85;
                scale = 0.96 + progress * 0.04;
            }

            page.style.transformOrigin = 'center';
            page.style.transform = 'translateY(' + translateY + 'px) scale(' + scale + ')';
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

        document.querySelectorAll('.skill-list li, .pub-list li, .tel-list li, .proj-list li, .award-list li, .timeline-item').forEach(function (el) {
            addReorderButtons(el);
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

    function addReorderButtons(el) {
        var wrap = document.createElement('span');
        wrap.className = 'edit-move-wrap';
        wrap.style.cssText = 'display:block;margin-bottom:4px;';

        var upBtn = document.createElement('button');
        upBtn.className = 'edit-move-btn';
        upBtn.innerHTML = '&#9650;';
        upBtn.title = 'Move up';
        upBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var prev = el.previousElementSibling;
            if (prev && prev.closest) {
                el.parentNode.insertBefore(el, prev);
            }
        });

        var downBtn = document.createElement('button');
        downBtn.className = 'edit-move-btn';
        downBtn.innerHTML = '&#9660;';
        downBtn.title = 'Move down';
        downBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var next = el.nextElementSibling;
            if (next && next.closest) {
                el.parentNode.insertBefore(next, el);
            }
        });

        wrap.appendChild(upBtn);
        wrap.appendChild(downBtn);
        el.insertBefore(wrap, el.firstChild);
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

    /* ─── Bubble Physics ─── */

    function initBubblePhysics(container) {
        var items = container.querySelectorAll('.tag');
        if (items.length < 2) return;

        var W, H, bubbles = [], highlighted = [];
        var paused = false, animId = null;

        items.forEach(function (el) {
            var hl = el.classList.contains('highlighted');
            var b = {
                el: el, x: 0, y: 0, vx: 0, vy: 0,
                w: el.offsetWidth, h: el.offsetHeight,
                r: Math.max(el.offsetWidth, el.offsetHeight) / 2,
                highlighted: hl
            };
            bubbles.push(b);
            if (hl) highlighted.push(b);
        });

        function getSize() { W = container.clientWidth; H = container.clientHeight; }

        function clamp(b) {
            b.x = Math.max(0, Math.min(W - b.w, b.x || 0));
            b.y = Math.max(0, Math.min(H - b.h, b.y || 0));
        }

        function dist(a, b) {
            var ax = a.x + a.w / 2, ay = a.y + a.h / 2;
            var bx = b.x + b.w / 2, by = b.y + b.h / 2;
            return Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));
        }

        function initPositions() {
            getSize();
            if (W === 0 || H === 0) return;
            var cx = W / 2, cy = H / 2;

            highlighted.forEach(function (b, i) {
                var a = (i / highlighted.length) * 2 * Math.PI;
                var d = 5 + Math.random() * 15;
                b.x = cx + Math.cos(a) * d - b.w / 2;
                b.y = cy + Math.sin(a) * d - b.h / 2;
                clamp(b);
                b.vx = (Math.random() - 0.5) * 0.2;
                b.vy = (Math.random() - 0.5) * 0.2;
            });

            var normal = bubbles.filter(function (b) { return !b.highlighted; });
            var ringR = Math.min(W, H) * 0.2;
            normal.forEach(function (b, i) {
                var a = (i / normal.length) * 2 * Math.PI + Math.random() * 0.3;
                var d = 50 + Math.random() * ringR;
                b.x = cx + Math.cos(a) * d - b.w / 2;
                b.y = cy + Math.sin(a) * d - b.h / 2;
                clamp(b);
                b.vx = (Math.random() - 0.5) * 0.35;
                b.vy = (Math.random() - 0.5) * 0.35;
            });
        }

        function update() {
            if (paused) return;
            getSize();
            if (W === 0 || H === 0) return;

            bubbles.forEach(function (b) {
                b.vx += (Math.random() - 0.5) * 0.04;
                b.vy += (Math.random() - 0.5) * 0.04;
                b.vx *= 0.985;
                b.vy *= 0.985;

                var limit = b.highlighted ? 0.25 : 0.45;
                var spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                if (spd > limit) { b.vx = (b.vx / spd) * limit; b.vy = (b.vy / spd) * limit; }

                if (b.highlighted) {
                    b.vx += ((W / 2) - (b.x + b.w / 2)) * 0.003;
                    b.vy += ((H / 2) - (b.y + b.h / 2)) * 0.003;
                }

                b.x += b.vx;
                b.y += b.vy;
                clamp(b);
            });

            for (var i = 0; i < bubbles.length; i++) {
                for (var j = i + 1; j < bubbles.length; j++) {
                    var a = bubbles[i], b = bubbles[j];
                    var d = dist(a, b);
                    var minD = (a.r + b.r) * 0.8;
                    if (d < minD && d > 0.1) {
                        var ov = minD - d;
                        var ax = a.x + a.w / 2, ay = a.y + a.h / 2;
                        var bx = b.x + b.w / 2, by = b.y + b.h / 2;
                        var nx = (bx - ax) / d, ny = (by - ay) / d;
                        a.x -= nx * ov * 0.5; a.y -= ny * ov * 0.5;
                        b.x += nx * ov * 0.5; b.y += ny * ov * 0.5;
                        var dvx = a.vx - b.vx, dvy = a.vy - b.vy;
                        var dot = dvx * nx + dvy * ny;
                        if (dot > 0) {
                            a.vx -= dot * nx * 0.4; a.vy -= dot * ny * 0.4;
                            b.vx += dot * nx * 0.4; b.vy += dot * ny * 0.4;
                        }
                        clamp(a); clamp(b);
                    }
                }
            }

            bubbles.forEach(function (b) {
                b.el.style.left = Math.round(b.x) + 'px';
                b.el.style.top = Math.round(b.y) + 'px';
            });
        }

        function loop() { update(); animId = requestAnimationFrame(loop); }

        items.forEach(function (el) { el.style.position = 'absolute'; });
        initPositions();
        container.style.opacity = '1';
        loop();

        container.addEventListener('mouseenter', function () { paused = true; });
        container.addEventListener('mouseleave', function () { paused = false; });
        container.addEventListener('touchstart', function () { paused = true; });
        container.addEventListener('touchend', function () { paused = false; });

        var rt;
        window.addEventListener('resize', function () {
            clearTimeout(rt);
            rt = setTimeout(function () {
                getSize();
                bubbles.forEach(function (b) {
                    b.x = Math.max(0, Math.min(W - b.w, b.x));
                    b.y = Math.max(0, Math.min(H - b.h, b.y));
                });
            }, 200);
        });
    }

    var hc = document.querySelector('.hobby-tags');
    var sc = document.querySelector('.skill-tags');
    if (hc) initBubblePhysics(hc);
    if (sc) initBubblePhysics(sc);

})();
