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

        document.querySelectorAll('.hobby-tags, .skill-tags').forEach(function (container) {
            container.querySelectorAll('.tag').forEach(function (el) {
                makeBubbleDraggable(el, container);
            });
        });

        var exportPosBtn = document.createElement('button');
        exportPosBtn.id = 'export-pos-btn';
        exportPosBtn.textContent = 'Export Bubble Positions';
        bar.appendChild(exportPosBtn);
        exportPosBtn.addEventListener('click', exportBubblePositions);
    }

    function makeBubbleDraggable(el, container) {
        var startX, startY, origX, origY;
        el.addEventListener('mousedown', function (e) {
            if (!editMode) return;
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            origX = parseFloat(el.style.left) || 0;
            origY = parseFloat(el.style.top) || 0;

            function onMove(e) {
                var dx = e.clientX - startX;
                var dy = e.clientY - startY;
                var newX = Math.max(0, Math.min(container.clientWidth - el.offsetWidth, origX + dx));
                var newY = Math.max(0, Math.min(container.clientHeight - el.offsetHeight, origY + dy));
                el.style.left = newX + 'px';
                el.style.top = newY + 'px';
            }

            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                if (container._bubbles) {
                    for (var i = 0; i < container._bubbles.length; i++) {
                        var b = container._bubbles[i];
                        if (b.el === el) {
                            b.homeX = parseFloat(el.style.left) || 0;
                            b.homeY = parseFloat(el.style.top) || 0;
                            break;
                        }
                    }
                }
            }

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    function exportBubblePositions() {
        var data = {};
        document.querySelectorAll('.hobby-tags, .skill-tags').forEach(function (container) {
            var key = container.classList.contains('hobby-tags') ? 'hobbies' : 'other-skills';
            var positions = [];
            container.querySelectorAll('.tag').forEach(function (el) {
                var full = el.getAttribute('data-full');
                positions.push({
                    text: el.textContent.trim(),
                    full: full || null,
                    left: parseInt(el.style.left) || 0,
                    top: parseInt(el.style.top) || 0,
                    width: el.offsetWidth,
                    height: el.offsetHeight
                });
            });
            data[key] = {
                containerWidth: container.clientWidth,
                containerHeight: container.clientHeight,
                bubbles: positions
            };
        });
        data._meta = { exportedAt: new Date().toISOString() };

        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'bubble-positions.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
        if (items.length < 1) return;

        var W, H, bubbles = [];

        items.forEach(function (el) {
            el.style.position = 'absolute';
            void el.offsetHeight;
            var w = el.offsetWidth, h = el.offsetHeight;
            var b = { el: el, homeX: 0, homeY: 0, w: w, h: h, r: Math.max(w, h) / 2, highlighted: el.classList.contains('highlighted') };
            bubbles.push(b);
        });

        function getSize() { W = container.clientWidth; H = container.clientHeight; }

        function overlaps(x, y, r, placed) {
            for (var p = 0; p < placed.length; p++) {
                var pb = placed[p];
                var dx = (x + r) - (pb.homeX + pb.r);
                var dy = (y + r) - (pb.homeY + pb.r);
                if (Math.sqrt(dx * dx + dy * dy) < r + pb.r + gap) return true;
            }
            return false;
        }

        function placeAt(b, minRadius, placed) {
            var localMaxR = isMobile ? H * 0.55 : Math.min(W, H) * 0.55;
            for (var ring = 0; ring < 500; ring++) {
                var radius = minRadius + ring * 2;
                if (radius > localMaxR) break;
                var steps = Math.max(12, Math.ceil(2 * Math.PI * radius / (b.r + gap)));
                for (var s = 0; s < steps; s++) {
                    var a = (s / steps) * 2 * Math.PI + ring * 0.01;
                    var x = cx + Math.cos(a) * radius - b.r;
                    var y = cy + Math.sin(a) * radius - b.r;
                    if (x < 0 || x > W - b.w || y < 0 || y > H - b.h) continue;
                    if (!overlaps(x, y, b.r, placed)) {
                        b.homeX = x; b.homeY = y;
                        placed.push(b);
                        return true;
                    }
                }
            }
            return false;
        }

        getSize();
        if (W === 0 || H === 0) return;
        var cx = W / 2, cy = H / 2;

        var isMobile = window.innerWidth < 768;
        var gap = isMobile ? 10 : 14;

        var highlighted = bubbles.filter(function (b) { return b.highlighted; });
        var normal = bubbles.filter(function (b) { return !b.highlighted; });
        var placed = [];

        highlighted.forEach(function (b) {
            if (placed.length === 0) {
                b.homeX = cx - b.r; b.homeY = cy - b.r;
                placed.push(b);
            } else {
                placeAt(b, 0, placed);
            }
        });

        var clusterR = 0;
        highlighted.forEach(function (b) {
            var dcx = b.homeX + b.r - cx;
            var dcy = b.homeY + b.r - cy;
            var edge = Math.sqrt(dcx * dcx + dcy * dcy) + b.r;
            if (edge > clusterR) clusterR = edge;
        });

        var n = normal.length;
        var itemsPerRing = isMobile ? 5 : 6;
        var rings = Math.max(1, Math.ceil(n / itemsPerRing));
        var maxRadius = isMobile ? H * 0.50 : Math.min(W, H) * 0.50;
        normal.forEach(function (b, idx) {
            var ring = Math.min(rings - 1, Math.floor(idx / Math.ceil(n / rings)));
            var countInRing = Math.ceil(n / rings);
            var posInRing = idx % countInRing;
            var ringR = clusterR + gap + b.r + ring * (gap + b.r * 2);
            if (ringR > maxRadius - gap) {
                placeAt(b, maxRadius * 0.4, placed);
                return;
            }
            var angle = (posInRing / countInRing) * 2 * Math.PI + ring * 0.3;
            var x = cx + Math.cos(angle) * ringR - b.r;
            var y = cy + Math.sin(angle) * ringR - b.r;
            x = Math.max(0, Math.min(W - b.w, x));
            y = Math.max(0, Math.min(H - b.h, y));
            if (!overlaps(x, y, b.r, placed)) {
                b.homeX = x; b.homeY = y;
                placed.push(b);
            } else {
                placeAt(b, ringR, placed);
            }
        });

        bubbles.forEach(function (b) {
            var t = b.el.textContent.trim();
            if (t === 'Vim') {
                b.homeY += 15;
                b.homeX -= 25;
                b.homeX = Math.max(0, b.homeX);
                b.homeY = Math.min(H - b.h, b.homeY);
            } else if (t === 'AIPS') {
                b.homeY += 30;
                b.homeY = Math.min(H - b.h, b.homeY);
            }
        });

        bubbles.forEach(function (b) {
            b.el.style.left = Math.round(b.homeX) + 'px';
            b.el.style.top = Math.round(b.homeY) + 'px';
        });

        container.style.opacity = '1';
        container._bubbles = bubbles;

        var rt;
        window.addEventListener('resize', function () {
            clearTimeout(rt);
            rt = setTimeout(function () {
                getSize();
                bubbles.forEach(function (b) {
                    b.homeX = Math.max(0, Math.min(W - b.w, b.homeX));
                    b.homeY = Math.max(0, Math.min(H - b.h, b.homeY));
                    b.el.style.left = Math.round(b.homeX) + 'px';
                    b.el.style.top = Math.round(b.homeY) + 'px';
                });
            }, 200);
        });
    }

    var hc = document.querySelector('.hobby-tags');
    var sc = document.querySelector('.skill-tags');
    if (hc) initBubblePhysics(hc);
    if (sc) initBubblePhysics(sc);

})();
