document.addEventListener("DOMContentLoaded", () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canUsePointerParallax = window.matchMedia("(pointer: fine)").matches && window.matchMedia("(min-width: 981px)").matches;

    const header = document.querySelector(".site-header");
    const menuToggle = document.querySelector(".menu-toggle");
    const mobileNav = document.querySelector(".mobile-nav");

    if (menuToggle && mobileNav) {
        menuToggle.addEventListener("click", () => {
            const isOpen = menuToggle.classList.toggle("open");
            mobileNav.classList.toggle("open", isOpen);
            menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
            document.body.style.overflow = isOpen ? "hidden" : "";
        });

        mobileNav.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                menuToggle.classList.remove("open");
                mobileNav.classList.remove("open");
                menuToggle.setAttribute("aria-expanded", "false");
                document.body.style.overflow = "";
            });
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", (event) => {
            const href = anchor.getAttribute("href");
            if (!href || href === "#") return;

            const target = document.querySelector(href);
            if (!target) return;

            event.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    const showcaseData = {
        dashboard: {
            image: "/img/web-dashboard.png",
            route: "/app/dashboard",
            alt: "Dashboard TeamPulse"
        },
        clenove: {
            image: "/img/clenove.png",
            route: "/app/clenove",
            alt: "Správa členů"
        },
        profil: {
            image: "/img/profil.png",
            route: "/app/profil",
            alt: "Uživatelský profil"
        },
        nastaveni: {
            image: "/img/nastaveni.png",
            route: "/app/nastaveni",
            alt: "Nastavení klubu"
        }
    };

    const showcaseImage = document.getElementById("showcaseImage");
    const showcaseRoute = document.getElementById("showcaseRoute");
    const tabs = Array.from(document.querySelectorAll(".story-tab"));

    const switchShowcase = (key) => {
        const payload = showcaseData[key];
        if (!payload || !showcaseImage || !showcaseRoute) return;

        tabs.forEach((tab) => {
            const active = tab.dataset.key === key;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", active ? "true" : "false");
        });

        if (!prefersReducedMotion && window.gsap) {
            gsap.to(".showcase-window", { y: 10, opacity: 0.6, duration: 0.16, ease: "power2.out" });
        }

        const applyData = () => {
            showcaseImage.src = payload.image;
            showcaseImage.alt = payload.alt;
            showcaseRoute.textContent = payload.route;

            if (!prefersReducedMotion && window.gsap) {
                gsap.to(".showcase-window", { y: 0, opacity: 1, duration: 0.26, ease: "power2.out" });
            }
        };

        if (showcaseImage.complete) {
            applyData();
        } else {
            showcaseImage.addEventListener("load", applyData, { once: true });
            showcaseImage.src = payload.image;
        }
    };

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const key = tab.dataset.key;
            if (key) switchShowcase(key);
        });
    });

    const counters = Array.from(document.querySelectorAll("[data-counter]"));

    const compactNumber = (value) => {
        if (value >= 100000) {
            return `${Math.round(value / 1000)}k+`;
        }

        if (value >= 1000) {
            return `${Math.round(value / 100) / 10}k`;
        }

        return Number.isInteger(value) ? String(value) : value.toFixed(1);
    };

    if (header) {
        const updateHeader = () => {
            header.classList.toggle("scrolled", window.scrollY > 12);
        };
        updateHeader();
        window.addEventListener("scroll", updateHeader, { passive: true });
    }

    if (prefersReducedMotion || !window.gsap || !window.ScrollTrigger) {
        document.querySelectorAll("[data-reveal]").forEach((el) => {
            el.style.opacity = "1";
            el.style.transform = "none";
        });

        counters.forEach((counter) => {
            const end = Number(counter.getAttribute("data-counter"));
            if (Number.isNaN(end)) return;
            counter.textContent = end === 99.9 ? "99.9" : compactNumber(end);
            if (end === 99.9) counter.textContent += "%";
        });

        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const heroIntro = gsap.timeline({ defaults: { ease: "power3.out" } });

    heroIntro
        .from(".site-header", { y: -22, opacity: 0, duration: 0.45 })
        .from(".hero-content .eyebrow", { y: 18, opacity: 0, duration: 0.45 }, "<0.06")
        .from(".hero-content h1", { y: 24, opacity: 0, duration: 0.58 }, "<0.04")
        .from(".hero-lead, .hero-ctas, .hero-metrics", { y: 16, opacity: 0, duration: 0.5, stagger: 0.09 }, "<0.05")
        .from(".red-shape", { scale: 0.9, opacity: 0, duration: 0.62 }, "<0.06")
        .from(".laptop-mockup", { y: 24, opacity: 0, rotate: -8, duration: 0.72 }, "<0.08")
        .from(".phone-mockup", { y: 30, opacity: 0, rotate: -2, duration: 0.72 }, "<0.1")
        .to("[data-reveal]", {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            delay: 0.08
        }, "<");

    gsap.to(".bg-ribbon", {
        x: 48,
        duration: 8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true
    });

    gsap.to(".bg-orb-c", {
        y: -36,
        duration: 7,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true
    });

    document.querySelectorAll("[data-reveal]").forEach((element) => {
        if (element.closest(".hero")) return;

        const delay = Number(element.getAttribute("data-delay") || 0);

        gsap.fromTo(
            element,
            { opacity: 0, y: 28 },
            {
                opacity: 1,
                y: 0,
                duration: 0.65,
                delay,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: element,
                    start: "top 84%",
                    once: true
                }
            }
        );
    });

    document.querySelectorAll("[data-parallax]").forEach((element) => {
        const speed = Number(element.getAttribute("data-parallax") || 0.15);

        gsap.to(element, {
            yPercent: speed * -45,
            ease: "none",
            scrollTrigger: {
                trigger: element,
                start: "top bottom",
                end: "bottom top",
                scrub: true
            }
        });
    });

    gsap.fromTo(
        ".contact-panel",
        { opacity: 0, y: 18 },
        {
            opacity: 1,
            y: 0,
            duration: 0.55,
            stagger: 0.1,
            ease: "power2.out",
            scrollTrigger: {
                trigger: ".contact-cards",
                start: "top 84%",
                once: true
            }
        }
    );

    const hero = document.querySelector(".hero");
    if (hero && canUsePointerParallax) {
        const mouseTargets = Array.from(hero.querySelectorAll("[data-mouse-parallax]"));

        const updaters = mouseTargets.map((target) => {
            const amount = Number(target.getAttribute("data-mouse-parallax") || 12);
            return {
                xTo: gsap.quickTo(target, "x", { duration: 0.7, ease: "power3.out" }),
                yTo: gsap.quickTo(target, "y", { duration: 0.7, ease: "power3.out" }),
                amount
            };
        });

        hero.addEventListener("mousemove", (event) => {
            const bounds = hero.getBoundingClientRect();
            const xRatio = (event.clientX - bounds.left) / bounds.width - 0.5;
            const yRatio = (event.clientY - bounds.top) / bounds.height - 0.5;

            updaters.forEach((item) => {
                item.xTo(xRatio * item.amount * 2);
                item.yTo(yRatio * item.amount * 2);
            });
        });

        hero.addEventListener("mouseleave", () => {
            updaters.forEach((item) => {
                item.xTo(0);
                item.yTo(0);
            });
        });
    }

    counters.forEach((counter) => {
        const end = Number(counter.getAttribute("data-counter"));
        if (Number.isNaN(end)) return;

        const value = { number: 0 };

        gsap.to(value, {
            number: end,
            duration: 1.4,
            ease: "power2.out",
            scrollTrigger: {
                trigger: counter,
                start: "top 86%",
                once: true
            },
            onUpdate: () => {
                const current = end === 99.9 ? Number(value.number.toFixed(1)) : Math.round(value.number);
                counter.textContent = end === 99.9 ? `${current}%` : compactNumber(current);
            }
        });
    });
});
