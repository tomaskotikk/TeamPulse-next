/* Landing sections below the hero: app showcase (phone), features bento,
   web admin, references and FAQ. */
document.addEventListener("DOMContentLoaded", () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const G = !reduced && window.gsap && window.ScrollTrigger ? window.gsap : null;
    if (G) G.registerPlugin(ScrollTrigger);

    const $  = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    /** Runs `onChange(visible)` whenever `el` enters or leaves the viewport. */
    const watchVisible = (el, onChange) => {
        if (!el || !("IntersectionObserver" in window)) return onChange(true);
        new IntersectionObserver(([e]) => onChange(e.isIntersecting), { threshold: 0.25 }).observe(el);
    };

    initPhone();
    initBento();
    initWeb();
    initRefs();
    initFaq();
    if (G) initReveals();

    /* ══════════════════════════ PHONE / APP ══════════════════════════ */
    function initPhone() {
        const screen = $(".phone-screen");
        if (!screen) return;

        const views = $$(".ps-view", screen);
        const items = $$(".app-item");
        const tabs  = $$(".ps-tabs button", screen);
        const push  = $(".ps-push", screen);
        if (G && push) G.set(push, { yPercent: -120 });

        // seconds each demo stays on screen when auto-playing
        const DURATIONS = [6, 6, 8.5, 7.5, 7];
        // push banner shown inside the phone for each demo (the create demo has its own toast)
        const PUSHES = [
            "Trénink U15 začíná za 2 hodiny. Potvrďte účast.",
            "Nová událost: Turnaj o pohár, sobota 28. 11.",
            null,
            "Ondřej P. se omluvil ze zápasu · nemoc",
            "Petr T. napsal na zeď U15",
        ];

        let current = -1;
        let running = [];     // timelines / calls of the active scene
        let timer = null;     // autoplay progress tween
        let inView = false;
        let holds = 0;        // >0 while the visitor interacts with the phone

        const track = (t) => { running.push(t); return t; };
        const later = (sec, fn) => (G ? track(G.delayedCall(sec, fn)) : fn());
        const scenes = [enterHome, enterCalendar, enterCreate, enterAttendance, enterWall];

        function setView(i, user) {
            i = (i + views.length) % views.length;
            if (i === current) { if (user) restartTimer(); return; }
            const prev = views[current];
            const next = views[i];
            const dir = i > current ? 1 : -1;
            current = i;

            running.forEach((t) => t.kill());
            running = [];

            items.forEach((it, k) => {
                it.classList.toggle("is-active", k === i);
                it.setAttribute("aria-selected", String(k === i));
            });
            const tabFor = i === 0 ? "0" : i === 4 ? "4" : "1";
            tabs.forEach((t) => t.classList.toggle("is-on", t.dataset.tab === tabFor));

            if (G && prev) {
                G.killTweensOf([prev, next]);
                G.to(prev, { opacity: 0, x: -24 * dir, duration: 0.3, ease: "power2.in", onComplete: () => {
                    prev.classList.remove("is-active");
                    G.set(prev, { clearProps: "opacity,x,visibility" });
                } });
                next.classList.add("is-active");
                G.fromTo(next, { opacity: 0, x: 30 * dir, visibility: "visible" }, { opacity: 1, x: 0, duration: 0.5, delay: 0.1, ease: "power3.out" });
            } else {
                views.forEach((v) => v.classList.toggle("is-active", v === next));
            }
            scenes[i](next);
            showPush(i);
            restartTimer();
        }

        /* ── push banner sliding in from the top of the screen ── */
        function showPush(i) {
            if (!push || !G) return;
            G.killTweensOf(push);
            G.to(push, { yPercent: -120, opacity: 0, duration: 0.25, ease: "power2.in" });
            if (!PUSHES[i]) return;
            $("[data-push]", push).textContent = PUSHES[i];
            track(G.timeline({ delay: 1.6 })
                .fromTo(push, { yPercent: -120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: "back.out(1.3)" })
                .to(push, { yPercent: -120, opacity: 0, duration: 0.4, ease: "power2.in" }, "+=2.8"));
        }

        /* ── autoplay with a progress bar under the active item ── */
        function restartTimer() {
            if (!G) return;
            timer?.kill();
            items.forEach((it) => G.set($(".ai-bar i", it), { scaleX: 0 }));
            const bar = $(".ai-bar i", items[current]);
            timer = G.to(bar, { scaleX: 1, duration: DURATIONS[current], ease: "none", paused: true, onComplete: () => setView(current + 1) });
            syncTimer();
        }
        function syncTimer() {
            if (!timer) return;
            inView && holds === 0 ? timer.play() : timer.pause();
        }
        const hold = () => { holds++; syncTimer(); };
        const release = () => { holds = Math.max(0, holds - 1); syncTimer(); };

        // replay the first demo when the section actually scrolls into view
        let seen = false;
        watchVisible($(".app-stage"), (v) => {
            inView = v;
            if (v && !seen) {
                seen = true;
                running.forEach((t) => t.kill());
                running = [];
                scenes[current](views[current]);
                showPush(current);
            }
            syncTimer();
        });
        const stage = $(".app-stage");
        stage.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && hold());
        stage.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && release());
        stage.addEventListener("focusin", hold);
        stage.addEventListener("focusout", release);

        items.forEach((it) => it.addEventListener("click", () => setView(Number(it.dataset.go), true)));
        tabs.forEach((t) => t.addEventListener("click", () => {
            if (t.dataset.tab === "profile") {
                if (G) G.fromTo(t, { y: 0 }, { y: -4, duration: 0.12, yoyo: true, repeat: 1 });
                return;
            }
            setView(Number(t.dataset.tab), true);
        }));

        /* subtle 3D tilt that follows the pointer */
        const frame = $(".phone-frame");
        if (G && frame && window.matchMedia("(pointer: fine)").matches) {
            const section = $(".app");
            const rx = G.quickTo(frame, "rotationX", { duration: 0.9, ease: "power3.out" });
            const ry = G.quickTo(frame, "rotationY", { duration: 0.9, ease: "power3.out" });
            G.set(frame, { transformPerspective: 1400 });
            section.addEventListener("mousemove", (e) => {
                const b = frame.getBoundingClientRect();
                ry(((e.clientX - (b.left + b.width / 2)) / window.innerWidth) * 12);
                rx(-((e.clientY - (b.top + b.height / 2)) / window.innerHeight) * 8);
            });
            section.addEventListener("mouseleave", () => { rx(0); ry(0); });
            G.to($(".phone"), { y: -10, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
        }

        /* ── 0 · home ── */
        const rsvpState = $("[data-rsvp-state]", screen);
        $$("[data-rsvp]", screen).forEach((btn) => btn.addEventListener("click", () => {
            const yes = btn.dataset.rsvp === "yes";
            $$("[data-rsvp]", screen).forEach((b) => b.classList.toggle("is-on", b === btn));
            rsvpState.textContent = yes ? "✓ Potvrzeno · trenér to vidí hned" : "Omluveno · trenér dostal vaši odpověď";
            rsvpState.style.color = yes ? "#3ec27b" : "#ef6a6a";
            if (G) G.fromTo(btn, { scale: 0.92 }, { scale: 1, duration: 0.5, ease: "back.out(3)" });
        }));

        const countdown = $("[data-countdown]", screen);
        function enterHome(view) {
            if (countdown) {
                const now = new Date();
                const start = new Date(now);
                start.setHours(17, 0, 0, 0);
                if (start <= now) start.setDate(start.getDate() + 1);
                const mins = Math.round((start - now) / 60000);
                countdown.textContent = mins >= 60 * 20 ? "Zítra" : `za ${Math.floor(mins / 60)} h ${mins % 60} min`;
            }
            if (G) track(G.from($$(".ph-next, .ph-section, .ev-card", view), { y: 18, opacity: 0, duration: 0.5, stagger: 0.06, delay: 0.2, ease: "power3.out" }));
        }

        /* ── 1 · calendar (demo month: November 2026, starts on Sunday) ── */
        const calEvents = {};
        const addEv = (day, type, time, title, place) => (calEvents[day] ||= []).push({ type, time, title, place });
        [3, 5, 10, 12, 17, 19, 24, 26].forEach((d) => addEv(d, "training", "17:00", "Trénink U15", "Hala Sever"));
        addEv(7, "match", "10:00", "FK Ukázkov – SK Lípa", "Stadion Jih");
        addEv(21, "match", "14:00", "TJ Brod – FK Ukázkov", "Brod, hřiště 2");
        addEv(12, "meeting", "18:30", "Schůzka rodičů", "Klubovna");
        addEv(28, "event", "celý den", "Turnaj o pohár", "Sportovní areál");
        const typeLabel = { training: "Trénink", match: "Zápas", meeting: "Schůzka", event: "Akce" };
        const weekday = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
        const TODAY = 3;

        const grid = $("[data-cal]", screen);
        const dayBox = $("[data-cal-day]", screen);
        if (grid) {
            // Nov 1 2026 is a Sunday → 6 leading days from October (Monday-first grid)
            const cells = [];
            for (let i = 26; i <= 31; i++) cells.push({ d: i, out: true });
            for (let i = 1; i <= 30; i++) cells.push({ d: i });
            while (cells.length % 7) cells.push({ d: cells.length - 35, out: true });
            cells.forEach((c, idx) => {
                const el = document.createElement("button");
                el.type = "button";
                el.className = "cal-cell" + (c.out ? " is-out" : "") + (idx % 7 >= 5 ? " is-weekend" : "") + (!c.out && c.d === TODAY ? " is-today" : "");
                el.innerHTML = `<span>${c.d}</span>`;
                if (!c.out) {
                    el.setAttribute("aria-label", `${c.d}. listopadu`);
                    (calEvents[c.d] || []).slice(0, 2).forEach((e) => {
                        el.insertAdjacentHTML("beforeend", `<i class="cal-pill" style="--c:var(--t-${e.type})">${e.time === "celý den" ? "den" : e.time}</i>`);
                    });
                    el.addEventListener("click", () => { running.forEach((t) => t.kill()); pickDay(c.d, el); });
                } else {
                    el.tabIndex = -1;
                }
                grid.appendChild(el);
            });
        }

        function pickDay(d, cell) {
            $$(".cal-cell", grid).forEach((c) => c.classList.toggle("is-sel", c === cell));
            const date = new Date(2026, 10, d);
            $(".cal-day-label", dayBox).textContent = `${weekday[date.getDay()]} ${d}. listopadu`;
            const list = $(".cal-day-list", dayBox);
            const evs = calEvents[d] || [];
            list.innerHTML = evs.length
                ? evs.map((e) => `<div class="ev-card"><div class="ev-date" style="--c:var(--t-${e.type})"><small>${weekday[date.getDay()].slice(0, 2).toUpperCase()}</small><b>${d}</b><small>lis</small></div><div class="ev-body"><span class="ev-type" style="--c:var(--t-${e.type})">${typeLabel[e.type]}</span><b>${e.title}</b><small>${e.time} · ${e.place}</small></div></div>`).join("")
                : `<p style="font-size:12px;color:var(--app-dim);text-align:center;padding:14px 0">V tento den nic není.</p>`;
            if (G) G.from($$(".ev-card", list), { y: 10, opacity: 0, duration: 0.35, stagger: 0.05, ease: "power2.out" });
        }

        function enterCalendar(view) {
            const days = $$(".cal-cell:not(.is-out)", grid);
            pickDay(TODAY, days[TODAY - 1]);
            if (!G) return;
            track(G.from($$(".cal-pill", view), { scale: 0, opacity: 0, duration: 0.35, stagger: 0.025, delay: 0.25, ease: "back.out(2.5)" }));
            // the demo "taps" through a few days on its own
            [[2.4, 7], [4.2, 28]].forEach(([t, d]) => later(t, () => pickDay(d, days[d - 1])));
        }

        /* ── 2 · create event (auto-played) ── */
        function enterCreate(view) {
            const typed  = $("[data-typed]", view);
            const sw     = $("[data-switch]", view);
            const days   = $$("[data-day]", view);
            const cat    = $("[data-cat]", view);
            const hint   = $("[data-hint]", view);
            const submit = $("[data-submit]", view);
            const toast  = $("[data-toast]", view);
            const title  = "Trénink U15";

            const finish = () => {
                typed.textContent = title;
                sw.classList.add("is-on");
                days.forEach((d) => d.classList.add("is-on"));
                cat.classList.add("is-on");
                hint.textContent = "Vytvoří se 16 termínů.";
                submit.classList.add("is-ready");
                submit.textContent = "Vytvořit 16 událostí";
            };
            if (!G) { finish(); toast.style.opacity = "1"; toast.style.transform = "none"; return; }

            typed.textContent = "";
            sw.classList.remove("is-on");
            days.forEach((d) => d.classList.remove("is-on"));
            cat.classList.remove("is-on");
            hint.textContent = "Vytvoří se 1 termín.";
            submit.classList.remove("is-ready", "is-pressed");
            submit.textContent = "Vytvořit událost";
            G.set(toast, { opacity: 0, y: -20 });

            const tl = track(G.timeline({ delay: 0.6 }));
            const typing = { n: 0 };
            tl.to(typing, { n: title.length, duration: 1.1, ease: "none", onUpdate: () => { typed.textContent = title.slice(0, Math.round(typing.n)); } })
              .add(() => submit.classList.add("is-ready"), "-=0.3")
              .add(() => sw.classList.add("is-on"), "+=0.45")
              .add(() => { days[0].classList.add("is-on"); hint.textContent = "Vytvoří se 8 termínů."; }, "+=0.45")
              .add(() => { days[1].classList.add("is-on"); hint.textContent = "Vytvoří se 16 termínů."; submit.textContent = "Vytvořit 16 událostí"; }, "+=0.35")
              .add(() => cat.classList.add("is-on"), "+=0.45")
              .add(() => submit.classList.add("is-pressed"), "+=0.6")
              .add(() => submit.classList.remove("is-pressed"), "+=0.16")
              .to(toast, { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.8)" }, "+=0.1")
              .from($(".toast-check", toast), { scale: 0, duration: 0.4, ease: "back.out(3)" }, "<0.1");
        }

        /* ── 3 · live attendance ── */
        const players = [
            ["MK", "Matěj Kovář"], ["TS", "Tadeáš Svoboda"], ["OP", "Ondřej Procházka"], ["DV", "David Veselý"],
            ["JN", "Jakub Novák"], ["FD", "Filip Dvořák"], ["AH", "Adam Horák"],
        ];
        // order in which answers arrive: [listIndex | null, response, reason]
        const replies = [
            [1, "yes"], [null, "yes"], [4, "yes"], [2, "no", "nemoc"], [null, "yes"], [0, "yes"], [null, "yes"],
            [6, "yes"], [null, "yes"], [null, "no"], [5, "yes"], [null, "yes"], [null, "yes"], [null, "yes"], [null, "yes"], [null, "yes"],
        ];
        const INVITED = 18;
        function enterAttendance(view) {
            const list = $("[data-at-list]", view);
            const out = { yes: $('[data-at="yes"]', view), no: $('[data-at="no"]', view), pending: $('[data-at="pending"]', view) };
            const bar = { yes: $('[data-bar="yes"]', view), no: $('[data-bar="no"]', view) };
            list.innerHTML = players.map(([ini, name]) =>
                `<li><span class="av">${ini}</span><span class="nm">${name}<small></small></span><span class="ev-badge"></span></li>`).join("");
            const rows = $$("li", list);
            const counts = { yes: 0, no: 0 };
            const paint = () => {
                out.yes.textContent = counts.yes;
                out.no.textContent = counts.no;
                out.pending.textContent = INVITED - counts.yes - counts.no;
                bar.yes.style.width = `${(counts.yes / INVITED) * 100}%`;
                bar.no.style.width = `${(counts.no / INVITED) * 100}%`;
            };
            const apply = ([row, resp, reason]) => {
                counts[resp]++;
                if (row !== null) {
                    const li = rows[row];
                    $(".ev-badge", li).className = `ev-badge is-${resp}`;
                    if (reason) $(".nm small", li).textContent = `Omluva: ${reason}`;
                    if (G) G.fromTo($(".ev-badge", li), { scale: 0.4 }, { scale: 1, duration: 0.45, ease: "back.out(3)" });
                }
                paint();
            };
            paint();
            if (!G) { replies.forEach(apply); return; }
            replies.forEach((r, i) => later(0.7 + i * 0.3 + (i % 3) * 0.08, () => apply(r)));
        }

        /* ── 4 · wall chat ── */
        const wall = $("[data-wall]", screen);
        const form = $("[data-wall-form]", screen);
        const seed = [
            { ini: "PT", who: "Petr T.", role: "trenér", text: "Zítra trénink v hale, ne venku. Vezměte si sálovky." },
            { ini: "LN", who: "Lucie N.", role: "rodič", text: "Díky za info! Ema dorazí o 10 minut později." },
            { ini: "PT", who: "Petr T.", role: "trenér", text: "V pohodě. V sobotu sraz 9:15 u stadionu." },
        ];
        const bubble = (m, me) => {
            const el = document.createElement("div");
            el.className = "msg" + (me ? " me" : "");
            el.innerHTML = me
                ? `<div class="bubble"></div>`
                : `<span class="av">${m.ini}</span><div class="bubble"><small>${m.who}<em>${m.role}</em></small></div>`;
            $(".bubble", el).append(document.createTextNode(m.text));
            wall.appendChild(el);
            // keep only the latest few bubbles so the screen never overflows
            const msgs = $$(".msg", wall);
            if (msgs.length > 5) msgs[0].remove();
            if (G) G.from(el, { y: 14, opacity: 0, scale: 0.96, duration: 0.4, ease: "back.out(1.6)", transformOrigin: me ? "100% 100%" : "0 100%" });
        };
        function enterWall() {
            $$(".msg", wall).forEach((m) => m.remove());
            seed.forEach((m, i) => later(0.5 + i * 0.9, () => bubble(m)));
        }
        form?.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = $("input", form);
            const text = input.value.trim();
            if (!text) return;
            input.value = "";
            bubble({ text }, true);
            const replyText = /\?$/.test(text) ? "Dobrá otázka, napíšu to sem večer." : "Díky, beru na vědomí 👍";
            setTimeout(() => bubble({ ini: "PT", who: "Petr T.", role: "trenér", text: replyText }), 1100);
        });

        setView(0);
    }

    /* ══════════════════════════ BENTO ══════════════════════════ */
    function initBento() {
        /* attendance matrix */
        const matrix = $("[data-matrix]");
        if (matrix) {
            const names = ["Matěj K.", "Tadeáš S.", "Ondřej P.", "David V.", "Jakub N.", "Filip D.", "Adam H.", "Šimon B."];
            const dates = ["3.9", "5.9", "10.9", "12.9", "17.9", "19.9", "24.9", "26.9", "1.10", "3.10", "8.10", "10.10"];
            // deterministic pattern: mostly present, a few excuses and gaps
            const state = (r, c) => ((r * 7 + c * 3) % 11 === 0 ? "n" : (r * 5 + c) % 13 === 0 ? "p" : "y");
            let html = "<span></span>" + dates.map((d, c) => `<span class="mx-date col-${c + 1}">${d}</span>`).join("");
            names.forEach((n, r) => {
                html += `<span class="mx-name">${n}</span>` + dates.map((_, c) => `<i class="mx-cell col-${c + 1} ${state(r, c)}"></i>`).join("");
            });
            matrix.innerHTML = html;
            if (G) {
                G.from($$(".mx-cell", matrix), {
                    scale: 0, opacity: 0, duration: 0.4, ease: "back.out(2)",
                    stagger: { each: 0.008, grid: [names.length, dates.length], from: "start" },
                    scrollTrigger: { trigger: matrix, start: "top 85%", once: true },
                });
            }
        }

        /* applications: approve in place */
        $$("[data-approve]").forEach((btn) => btn.addEventListener("click", () => {
            if (btn.classList.contains("is-done")) return;
            btn.classList.add("is-done");
            btn.textContent = "Schváleno ✓";
            btn.setAttribute("aria-disabled", "true");
            const row = btn.closest("li");
            if (G) G.fromTo(row, { backgroundColor: "rgba(31,157,85,0.10)" }, { backgroundColor: "rgba(31,157,85,0)", duration: 1.2, ease: "power2.out" });
        }));

        /* analytics bars grow in */
        if (G) {
            G.from(".chart-bars i", {
                scaleY: 0, duration: 0.8, stagger: 0.06, ease: "power3.out",
                scrollTrigger: { trigger: ".chart", start: "top 88%", once: true },
            });
            G.from(".roster li, .apps li, .member-rows div", {
                x: -12, opacity: 0, duration: 0.45, stagger: 0.04, ease: "power2.out",
                scrollTrigger: { trigger: ".bento", start: "top 75%", once: true },
            });
        }
    }

    /* ══════════════════════════ WEB ADMIN ══════════════════════════ */
    function initWeb() {
        const data = {
            dashboard: { image: "/img/web-dashboard.png", route: "teampulse.cfd/app/dashboard", alt: "Dashboard TeamPulse" },
            clenove:   { image: "/img/clenove.png",       route: "teampulse.cfd/app/clenove",   alt: "Správa členů v TeamPulse" },
            profil:    { image: "/img/profil.png",        route: "teampulse.cfd/app/profil",    alt: "Profil člena v TeamPulse" },
            nastaveni: { image: "/img/nastaveni.png",     route: "teampulse.cfd/app/nastaveni", alt: "Nastavení klubu v TeamPulse" },
        };
        const img   = $("#showcaseImage");
        const route = $("#showcaseRoute");
        const tabs  = $$(".stab");
        if (!img || !tabs.length) return;
        Object.values(data).forEach((d) => { const p = new Image(); p.src = d.image; });

        const DURATION = 6;
        let index = 0;
        let bar = null;
        let inView = false;

        const runBar = () => {
            if (!G) return;
            bar?.kill();
            $$(".stab-progress").forEach((p) => G.set(p, { scaleX: 0 }));
            bar = G.fromTo($(".stab-progress", tabs[index]), { scaleX: 0 }, { scaleX: 1, duration: DURATION, ease: "none", paused: !inView, onComplete: () => show(index + 1) });
        };

        const show = (i) => {
            index = (i + tabs.length) % tabs.length;
            const d = data[tabs[index].dataset.key];
            tabs.forEach((t, k) => {
                t.classList.toggle("active", k === index);
                t.setAttribute("aria-selected", String(k === index));
            });
            const apply = () => { img.src = d.image; img.alt = d.alt; route.textContent = d.route; };
            if (G) {
                G.to(img, { opacity: 0, duration: 0.18, ease: "power2.in", onComplete: () => {
                    apply();
                    G.fromTo(img, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" });
                } });
            } else {
                apply();
            }
            runBar();
        };

        tabs.forEach((t, i) => t.addEventListener("click", () => show(i)));
        watchVisible($(".web-stage"), (v) => { inView = v; v ? bar?.play() : bar?.pause(); });
        runBar();

        if (G) {
            G.fromTo(".web-window",
                { rotationX: 14, y: 50, scale: 0.95 },
                { rotationX: 0, y: 0, scale: 1, ease: "none", scrollTrigger: { trigger: ".web-stage", start: "top 95%", end: "top 40%", scrub: 0.6 } });
        }
    }

    /* ══════════════════════════ REFERENCES ══════════════════════════ */
    function initRefs() {
        const quotes = $$(".quote");
        const dots = $$(".quote-nav button");
        if (!quotes.length) return;
        const DURATION = 7;
        let index = 0;
        let bar = null;
        let inView = false;

        const show = (i, first) => {
            const prev = quotes[index];
            index = (i + quotes.length) % quotes.length;
            const next = quotes[index];
            dots.forEach((d, k) => {
                d.classList.toggle("is-on", k === index);
                d.setAttribute("aria-selected", String(k === index));
            });
            if (G && !first && prev !== next) {
                G.to(prev, { opacity: 0, y: -12, duration: 0.3, ease: "power2.in", onComplete: () => { prev.classList.remove("is-on"); G.set(prev, { clearProps: "all" }); } });
                next.classList.add("is-on");
                G.fromTo(next, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.25, ease: "power3.out" });
            } else {
                quotes.forEach((q) => q.classList.toggle("is-on", q === next));
            }
            if (G) {
                bar?.kill();
                dots.forEach((d, k) => G.set($("i", d), { scaleX: k < index ? 1 : 0 }));
                bar = G.fromTo($("i", dots[index]), { scaleX: 0 }, { scaleX: 1, duration: DURATION, ease: "none", paused: !inView, onComplete: () => show(index + 1) });
            }
        };
        dots.forEach((d, i) => d.addEventListener("click", () => show(i)));
        watchVisible($(".refs"), (v) => { inView = v; v ? bar?.play() : bar?.pause(); });
        show(0, true);

        /* counters */
        $$("[data-count]").forEach((el) => {
            const end = Number(el.dataset.count);
            const fmt = (n) => Math.round(n).toLocaleString("cs-CZ") + (el.dataset.suffix || "");
            if (!G) { el.textContent = fmt(end); return; }
            const v = { n: 0 };
            G.to(v, { n: end, duration: 1.6, ease: "power2.out", onUpdate: () => { el.textContent = fmt(v.n); },
                scrollTrigger: { trigger: el, start: "top 90%", once: true } });
        });
    }

    /* ══════════════════════════ FAQ ══════════════════════════ */
    function initFaq() {
        $$(".faq-item").forEach((item) => {
            const summary = $("summary", item);
            const body = $(".faq-a", item);
            summary.addEventListener("click", (e) => {
                if (!G) return;
                e.preventDefault();
                if (item.open) {
                    G.to(body, { height: 0, opacity: 0, duration: 0.3, ease: "power2.in", onComplete: () => { item.open = false; G.set(body, { clearProps: "all" }); } });
                } else {
                    item.open = true;
                    G.fromTo(body, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.4, ease: "power3.out" });
                }
            });
        });
    }

    /* ══════════════════════════ ENTRANCES ══════════════════════════ */
    function initReveals() {
        const up = (targets, trigger, extra = {}) => G.from(targets, {
            y: 32, opacity: 0, duration: 0.8, stagger: 0.08, ease: "power3.out",
            scrollTrigger: { trigger, start: "top 82%", once: true }, ...extra,
        });

        up([".app-copy .eyebrow", ".app-copy h2", ".app-lead", ".app-list li"], ".app");
        G.from(".phone-frame", { y: 80, opacity: 0, rotation: 4, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: ".app", start: "top 70%", once: true } });
        up(".bento-sec .sec-head > *", ".bento-sec");
        up(".tile", ".bento", { y: 40, stagger: 0.1 });
        up(".web .sec-head > *, .web-tabs", ".web");
        up(".refs-left > *:not(.quotes)", ".refs");
        up(".refs-stats > div", ".refs-stats");
        up(".faq .sec-head > *, .faq-item", ".faq", { stagger: 0.06 });
        up(".cta-top > *, .cta-steps li, .cta-contact > *", ".cta-band", { stagger: 0.07 });
    }
});
