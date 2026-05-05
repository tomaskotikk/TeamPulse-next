document.addEventListener("DOMContentLoaded", () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canUsePointerParallax = window.matchMedia("(pointer: fine)").matches &&
                                   window.matchMedia("(min-width: 1000px)").matches;

    /* ── Header scroll class ── */
    const header = document.querySelector(".site-header");
    if (header) {
        const updateHeader = () => header.classList.toggle("scrolled", window.scrollY > 8);
        updateHeader();
        window.addEventListener("scroll", updateHeader, { passive: true });
    }

    /* ── Mobile menu ── */
    const menuToggle = document.querySelector(".menu-toggle");
    const mobileNav  = document.querySelector(".mobile-nav");
    if (menuToggle && mobileNav) {
        menuToggle.addEventListener("click", () => {
            const isOpen = menuToggle.classList.toggle("open");
            mobileNav.classList.toggle("open", isOpen);
            menuToggle.setAttribute("aria-expanded", String(isOpen));
            document.body.style.overflow = isOpen ? "hidden" : "";
        });
        mobileNav.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                menuToggle.classList.remove("open");
                mobileNav.classList.remove("open");
                menuToggle.setAttribute("aria-expanded", "false");
                document.body.style.overflow = "";
            });
        });
    }

    /* ── Smooth anchor scroll ── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", e => {
            const href = anchor.getAttribute("href");
            if (!href || href === "#") return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    /* ── Showcase tabs ── */
    const showcaseData = {
        dashboard: { image: "/img/web-dashboard.png", route: "/app/dashboard", alt: "Dashboard TeamPulse" },
        clenove:   { image: "/img/clenove.png",        route: "/app/clenove",   alt: "Správa členů" },
        profil:    { image: "/img/profil.png",          route: "/app/profil",    alt: "Uživatelský profil" },
        nastaveni: { image: "/img/nastaveni.png",       route: "/app/nastaveni", alt: "Nastavení klubu" }
    };
    const showcaseImg   = document.getElementById("showcaseImage");
    const showcaseRoute = document.getElementById("showcaseRoute");
    const stabs = Array.from(document.querySelectorAll(".stab"));

    const switchShowcase = key => {
        const payload = showcaseData[key];
        if (!payload || !showcaseImg || !showcaseRoute) return;
        stabs.forEach(t => {
            const active = t.dataset.key === key;
            t.classList.toggle("active", active);
            t.setAttribute("aria-selected", String(active));
        });
        if (!prefersReducedMotion && window.gsap) {
            gsap.to(".showcase-window", { opacity: 0.5, y: 8, duration: 0.14, ease: "power2.out", onComplete: applyData });
        } else {
            applyData();
        }
        function applyData() {
            showcaseImg.src   = payload.image;
            showcaseImg.alt   = payload.alt;
            showcaseRoute.textContent = payload.route;
            if (!prefersReducedMotion && window.gsap) {
                gsap.to(".showcase-window", { opacity: 1, y: 0, duration: 0.32, ease: "power3.out" });
            }
        }
    };
    stabs.forEach(tab => tab.addEventListener("click", () => tab.dataset.key && switchShowcase(tab.dataset.key)));

    /* ── Proof counter (simple, no GSAP dependency) ── */
    const proofCounters = Array.from(document.querySelectorAll("[data-counter]"));

    /* ── Early out: no GSAP ── */
    if (prefersReducedMotion || !window.gsap || !window.ScrollTrigger) {
        document.querySelectorAll("[data-reveal]").forEach(el => {
            el.style.opacity = "1";
            el.style.transform = "none";
        });
        document.querySelectorAll(".h1-line-inner").forEach(el => {
            el.style.transform = "none";
        });
        proofCounters.forEach(c => {
            c.textContent = c.getAttribute("data-counter");
        });
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    /* ── Split H1 lines into inner spans ── */
    document.querySelectorAll(".h1-line").forEach(line => {
        const text = line.textContent;
        line.textContent = "";
        const inner = document.createElement("span");
        inner.className = "h1-line-inner";
        inner.textContent = text;
        line.appendChild(inner);
    });

    /* ── HERO entrance ── */
    const heroTl = gsap.timeline({ defaults: { ease: "power4.out" } });
    heroTl
        .from(".site-header", { y: -28, opacity: 0, duration: 0.5 })
        .from(".hero-eyebrow", { y: 20, opacity: 0, duration: 0.5 }, "<0.1")
        .from(".h1-line-inner", {
            y: "110%",
            duration: 0.82,
            stagger: 0.1,
            ease: "power4.out"
        }, "<0.05")
        .from(".hero-lead", { y: 18, opacity: 0, duration: 0.6 }, "<0.18")
        .from(".hero-ctas", { y: 14, opacity: 0, duration: 0.55 }, "<0.08")
        .from(".hero-trust", { y: 10, opacity: 0, duration: 0.5 }, "<0.06")
        .from(".hero-red-form", {
            scale: 0.82,
            opacity: 0,
            duration: 1.1,
            ease: "power3.out"
        }, "<-0.6")
        .from(".laptop-mockup", {
            y: 36, opacity: 0, rotate: -7, duration: 0.92, ease: "power3.out"
        }, "<0.1")
        .from(".phone-mockup", {
            y: 48, opacity: 0, rotate: -4, duration: 0.92, ease: "power3.out"
        }, "<0.12")
        .from(".hero-scroll-hint", { opacity: 0, duration: 0.5 }, "<0.4");

    /* ── Orb float ── */
    gsap.to(".hero-orb-a", {
        y: -40, x: 20,
        duration: 9,
        ease: "sine.inOut",
        repeat: -1, yoyo: true
    });
    gsap.to(".hero-orb-b", {
        y: 30, x: -18,
        duration: 11,
        ease: "sine.inOut",
        repeat: -1, yoyo: true,
        delay: 1.5
    });

    /* ── Page-bg orb & ribbon float ── */
    gsap.to(".bg-orb-a", {
        y: -52, x: 28,
        duration: 10,
        ease: "sine.inOut",
        repeat: -1, yoyo: true,
        delay: 0.3
    });
    gsap.to(".bg-orb-b", {
        y: 38, x: -22,
        duration: 13,
        ease: "sine.inOut",
        repeat: -1, yoyo: true,
        delay: 2
    });
    gsap.to(".bg-orb-c", {
        y: -44,
        duration: 8,
        ease: "sine.inOut",
        repeat: -1, yoyo: true,
        delay: 1
    });
    gsap.to(".bg-ribbon", {
        x: 56, y: -18,
        duration: 10,
        ease: "sine.inOut",
        repeat: -1, yoyo: true,
        delay: 0.8
    });

    /* ── Page-bg parallax on scroll ── */
    document.querySelectorAll("[data-parallax]").forEach(el => {
        const speed = Number(el.getAttribute("data-parallax") || 0.15);
        gsap.to(el, {
            yPercent: speed * -50,
            ease: "none",
            scrollTrigger: {
                trigger: "body",
                start: "top top",
                end: "bottom bottom",
                scrub: true
            }
        });
    });

    /* ── Scroll reveals ── */
    document.querySelectorAll("[data-reveal]").forEach(el => {
        gsap.fromTo(el,
            { opacity: 0, y: 40 },
            {
                opacity: 1, y: 0,
                duration: 0.78,
                ease: "power3.out",
                delay: Number(el.getAttribute("data-delay") || 0),
                scrollTrigger: {
                    trigger: el,
                    start: "top 86%",
                    once: true
                }
            }
        );
    });

    /* ── Feature rows stagger ── */
    gsap.fromTo(".feature-row",
        { opacity: 0, x: -24 },
        {
            opacity: 1, x: 0,
            duration: 0.62,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
                trigger: ".feature-list",
                start: "top 80%",
                once: true
            }
        }
    );

    /* ── Proof stats counter ── */
    proofCounters.forEach(counter => {
        const end = Number(counter.getAttribute("data-counter"));
        if (Number.isNaN(end)) return;
        const val = { n: 0 };
        gsap.to(val, {
            n: end,
            duration: 1.6,
            ease: "power2.out",
            scrollTrigger: { trigger: counter, start: "top 84%", once: true },
            onUpdate: () => { counter.textContent = Math.round(val.n); }
        });
    });

    /* ── Testimonial rows stagger ── */
    gsap.fromTo(".testi-row",
        { opacity: 0, x: -20 },
        {
            opacity: 1, x: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: { trigger: ".testi-rows", start: "top 82%", once: true }
        }
    );

    /* ── Contact methods stagger ── */
    gsap.fromTo(".contact-method",
        { opacity: 0, y: 16 },
        {
            opacity: 1, y: 0,
            duration: 0.55,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: { trigger: ".cta-contact-band", start: "top 84%", once: true }
        }
    );

    /* ── CTA+contact band glow pulse ── */
    gsap.to(".cta-contact-band", {
        boxShadow: "0 0 0 1px oklch(47% 0.21 20 / 0.30), 0 32px 80px oklch(0% 0 0 / 0.16)",
        duration: 2.4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        scrollTrigger: { trigger: ".cta-contact-band", start: "top 80%" }
    });

    /* ── Mouse parallax on hero ── */
    if (canUsePointerParallax) {
        const heroEl  = document.querySelector(".hero");
        const targets = [
            { el: document.querySelector(".laptop-mockup"), amount: 10 },
            { el: document.querySelector(".phone-mockup"),  amount: 18 },
            { el: document.querySelector(".hero-red-form"), amount: 5  }
        ].filter(t => t.el).map(t => ({
            ...t,
            xTo: gsap.quickTo(t.el, "x", { duration: 0.8, ease: "power3.out" }),
            yTo: gsap.quickTo(t.el, "y", { duration: 0.8, ease: "power3.out" })
        }));

        if (heroEl) {
            heroEl.addEventListener("mousemove", e => {
                const b = heroEl.getBoundingClientRect();
                const rx = (e.clientX - b.left) / b.width  - 0.5;
                const ry = (e.clientY - b.top)  / b.height - 0.5;
                targets.forEach(t => {
                    t.xTo(rx * t.amount * 2);
                    t.yTo(ry * t.amount * 2);
                });
            });
            heroEl.addEventListener("mouseleave", () => {
                targets.forEach(t => { t.xTo(0); t.yTo(0); });
            });
        }
    }
});
