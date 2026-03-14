document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        if (!href || href === '#') return;

        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Optimized Intersection Observer pro plynulejší animace
const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            requestAnimationFrame(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            });
        }
    });
}, observerOptions);

// Observe elements for scroll animations
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll(
        '.feature-card, .testimonial-card, .support-card, .why-card, .stat-card, .about-modern-story, .about-modern-timeline, .support-modern-card, .support-modern-faq'
    );

    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        el.style.transitionDelay = `${index * 0.08}s`;
        observer.observe(el);
    });

    const faqButtons = document.querySelectorAll('.support-faq-item');
    faqButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const alreadyActive = btn.classList.contains('active');

            faqButtons.forEach((otherBtn) => {
                otherBtn.classList.remove('active');
                const answer = otherBtn.nextElementSibling;
                if (answer && answer.classList.contains('support-faq-answer')) {
                    answer.classList.remove('open');
                }
            });

            if (!alreadyActive) {
                btn.classList.add('active');
                const answer = btn.nextElementSibling;
                if (answer && answer.classList.contains('support-faq-answer')) {
                    answer.classList.add('open');
                }
            }
        });
    });
});

// CTA button functionality s plynulejší animací
document.querySelectorAll('.btn-primary').forEach(button => {
    button.addEventListener('click', function () {
        requestAnimationFrame(() => {
            this.style.transform = 'scale(0.95)';
        });

        setTimeout(() => {
            requestAnimationFrame(() => {
                this.style.transform = '';
            });
        }, 150);

        console.log('CTA button clicked');
    });
});

// Smooth page load animation - OPTIMALIZOVÁNO
window.addEventListener('load', () => {
    requestAnimationFrame(() => {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.6s ease-in';

        requestAnimationFrame(() => {
            document.body.style.opacity = '1';
        });
    });
});

// Hamburger menu toggle
const hamburger = document.querySelector(".hamburger-menu");
const navMenu = document.querySelector(".nav-menu");

hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navMenu.classList.toggle("mobile-active");
    document.body.style.overflow = navMenu.classList.contains("mobile-active") ? "hidden" : "";
});

// Zavřít menu při kliknutí na odkaz
document.querySelectorAll(".nav-menu a").forEach(link => {
    link.addEventListener("click", () => {
        hamburger.classList.remove("active");
        navMenu.classList.remove("mobile-active");
        document.body.style.overflow = "";
    });
});

// Performance optimization - throttle scroll events
let ticking = false;

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            ticking = false;
        });
        ticking = true;
    }
}, { passive: true });


// ============================================
// Platforma Tabs (switch content) + animace
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const FEATURES = [
        {
            id: 'profil',
            title: 'Uživatelský profil',
            desc: 'Přehledný profil člena s fotkou, kontakty, rolí v týmu, historií plateb, dokumenty a rychlými akcemi. Vše na jednom místě – bez hledání a bez papírů.',
            bullets: ['Fotka + základní údaje', 'Role, tým, kontakty', 'Dokumenty a historie', 'Rychlé akce pro správce'],
            img: '/img/profil.png'
        },
        {
            id: 'web',
            title: 'Web',
            desc: 'Moderní klubový web navázaný na data z platformy. Jednoduše udržíš informace aktuální a bez duplicit.',
            bullets: ['Aktuální informace bez práce navíc', 'Napojení na klubová data', 'Rychlé úpravy', 'Moderní design'],
            img: '/img/preview.png'
        },

        {
            id: 'dashboard',
            title: 'Dashboard',
            desc: 'Přehledný dashboard s klíčovými informacemi o týmu, členech, aktivitách a statistikami. Vše na jednom místě – bez hledání a bez papírů.',
            bullets: ['Přehledný přehled', 'Klíčové informace', 'Aktivity a statistiky', 'Rychlý přístup k akcím'],
            img: '/img/web-dashboard.png'
        },
        {
            id: 'clenove',
            title: 'Členové',
            desc: 'Kompletní databáze členů s filtrováním, rolemi a jasnou historií. Jednoduchá správa oddílů i více týmů.',
            bullets: ['Databáze členů a rodičů', 'Role a oprávnění', 'Štítky a filtrování', 'Historie změn'],
            img: '/img/clenove.png'
        },
        {
            id: 'nastaveni',
            title: 'Nastavení',
            desc: 'Uživatelské nastavení. Je možné si zde upravit barvy pro klub, nastavit notifikace a další možnosti přizpůsobení.',
            bullets: ['Změna barev pro klub, Zapnutí dvojfaktorového ověření', 'Nastavení notifikací','Další možnosti přizpůsobení'],
            img: '/img/nastaveni.png'
        },
        {
            id: 'komunikace',
            title: 'Komunikace',
            desc: 'Zprávy a oznámení pro tým i rodiče. Notifikace do mobilu i e-mailu, vše přehledně na jednom místě.',
            bullets: ['Týmová zeď / nástěnka', 'Notifikace (mobil + e-mail)', 'Skupiny a cílení', 'Připnuté informace'],
            img: '/img/preview.png'
        },
        {
            id: 'dochazka',
            title: 'Docházka',
            desc: 'Docházka na tréninky a zápasy bez chaosu. Přehledně vidíš potvrzení, omluvenky a kapacity.',
            bullets: ['Potvrzení / omluvenky', 'Kapacity a limity', 'Přehled za období', 'Rychlé exporty'],
            img: '/img/preview.png'
        },

        {
            id: 'prihlasky',
            title: 'Přihlášky',
            desc: 'Online přihlášky do klubu nebo na akce. Méně papírů, více pořádku – data jdou rovnou do systému.',
            bullets: ['Formuláře na míru', 'Automatické založení člena', 'Potvrzení e-mailem', 'Export a kontrola dat'],
            img: '/img/preview.png'
        }
    ];

    const tabs = Array.from(document.querySelectorAll('.platforma-tab'));
    const titleEl = document.getElementById('platformaTitle');
    const descEl = document.getElementById('platformaDesc');
    const bulletsEl = document.getElementById('platformaBullets');
    const imgEl = document.getElementById('platformaImage');
    const tagsEl = document.getElementById('platformaTags');
    const progressEl = document.getElementById('platformaProgress');
    const counterEl = document.getElementById('platformaCounter');
    const pathEl = document.getElementById('platformaWindowPath');

    const arrows = Array.from(document.querySelectorAll('.platforma-arrow'));

    const panelEl = document.querySelector('.platforma-panel');
    const mediaFrameEl = document.querySelector('.platforma-media-frame');

    if (!tabs.length || !titleEl || !descEl || !bulletsEl || !imgEl) return;

    let activeIndex = Math.max(0, FEATURES.findIndex(f => f.id === 'profil'));
    let animLock = false;

    const getLoopIndex = (idx) => (idx + FEATURES.length) % FEATURES.length;

    const routeByFeature = {
        profil: '/app/profil',
        web: '/app/web',
        dashboard: '/app/dashboard',
        clenove: '/app/clenove',
        nastaveni: '/app/nastaveni',
        komunikace: '/app/komunikace',
        dochazka: '/app/dochazka',
        prihlasky: '/app/prihlasky'
    };

    const tagsByFeature = {
        profil: ['Profil', 'Kontakty', 'Historie'],
        web: ['Web', 'Publikace', 'Branding'],
        dashboard: ['Přehled', 'KPI', 'Rychlý start'],
        clenove: ['Evidence', 'Role', 'Filtry'],
        nastaveni: ['Barvy', '2FA', 'Notifikace'],
        komunikace: ['Nástěnka', 'Notifikace', 'Skupiny'],
        dochazka: ['Docházka', 'Omluvenky', 'Kapacity'],
        prihlasky: ['Formuláře', 'Automatizace', 'Import']
    };

    const renderMeta = (featureId, idx) => {
        const total = FEATURES.length;
        const current = idx + 1;

        if (counterEl) {
            counterEl.textContent = `${String(current).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
        }

        if (progressEl) {
            progressEl.style.width = `${(current / total) * 100}%`;
        }

        if (pathEl) {
            pathEl.textContent = routeByFeature[featureId] || `/app/${featureId}`;
        }

        if (tagsEl) {
            const tags = tagsByFeature[featureId] || [];
            tagsEl.innerHTML = '';
            tags.forEach(tag => {
                const item = document.createElement('span');
                item.className = 'platforma-tag';
                item.textContent = tag;
                tagsEl.appendChild(item);
            });
        }
    };

    const setContentInstant = (idx) => {
        const f = FEATURES[idx];
        if (!f) return;

        activeIndex = idx;

        titleEl.textContent = f.title;
        descEl.textContent = f.desc;

        bulletsEl.innerHTML = '';
        f.bullets.forEach(b => {
            const li = document.createElement('li');
            li.textContent = b;
            bulletsEl.appendChild(li);
        });

        imgEl.src = f.img;
        imgEl.alt = `Ukázka: ${f.title}`;
        renderMeta(f.id, idx);
    };

    const setActiveTabUI = (featureId) => {
        tabs.forEach(t => {
            const isActive = t.dataset.feature === featureId;
            t.classList.toggle('active', isActive);
            t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    };

    const animateSwap = (nextIndex) => {
    if (animLock) return;

    const f = FEATURES[nextIndex];
    if (!f) return;

    const movingRight = getLoopIndex(nextIndex - activeIndex) === 1;

    setActiveTabUI(f.id);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canAnimate = panelEl && mediaFrameEl && !reduced;

    if (!canAnimate) {
        setContentInstant(nextIndex);
        return;
    }

    animLock = true;

    panelEl.classList.toggle('slide-right', movingRight);
    panelEl.classList.toggle('slide-left', !movingRight);
    mediaFrameEl.classList.toggle('slide-right', movingRight);
    mediaFrameEl.classList.toggle('slide-left', !movingRight);

    mediaFrameEl.classList.add('is-switching');

    // animace ven
    panelEl.classList.add('is-animating', 'fade-out');
    mediaFrameEl.classList.add('is-animating', 'fade-out');

    setTimeout(() => {
        activeIndex = nextIndex;

        titleEl.textContent = f.title;
        descEl.textContent = f.desc;

        bulletsEl.innerHTML = '';
        f.bullets.forEach(b => {
            const li = document.createElement('li');
            li.textContent = b;
            bulletsEl.appendChild(li);
        });

        const finishIn = () => {
            // animace dovnitř = odebrání fade-out (base state má transition)
            panelEl.classList.remove('fade-out');
            mediaFrameEl.classList.remove('fade-out');

            setTimeout(() => {
                panelEl.classList.remove('is-animating');
                mediaFrameEl.classList.remove('is-animating');
                animLock = false;
            }, 360);
        };

        // pokud se mění obrázek, počkej na load (ať se to necukne)
        let done = false;
        const onLoad = () => {
            if (done) return;
            done = true;
            imgEl.removeEventListener('load', onLoad);
            finishIn();
        };

        imgEl.addEventListener('load', onLoad);
        imgEl.src = f.img;
        imgEl.alt = `Ukázka: ${f.title}`;
        renderMeta(f.id, nextIndex);

        // fallback pro cache / rychlý load
        setTimeout(() => {
            if (!done) onLoad();
        }, 120);

    }, 160);

    setTimeout(() => {
        mediaFrameEl.classList.remove('is-switching');
        panelEl.classList.remove('slide-left', 'slide-right');
        mediaFrameEl.classList.remove('slide-left', 'slide-right');
    }, 460);
};


    const render = (idx) => animateSwap(idx);

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const idx = FEATURES.findIndex(f => f.id === tab.dataset.feature);
            if (idx >= 0) render(idx);
        });
    });

    arrows.forEach(btn => {
        btn.addEventListener('click', () => {
            const dir = Number(btn.dataset.dir || 0);
            const next = (activeIndex + dir + FEATURES.length) % FEATURES.length;
            render(next);
        });
    });

    // init
    setActiveTabUI(FEATURES[activeIndex]?.id || 'profil');
    setContentInstant(activeIndex);
});