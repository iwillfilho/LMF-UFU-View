document.addEventListener('DOMContentLoaded', () => {
    initCarousel();
    initMobileMenu();
    initNavigation();
});

/* ==========================================
   ROTEAMENTO SPA (Navegação de "páginas" sem recarregar)
========================================== */
function navigateTo(pageId, tabId = null) {
    const pages = document.querySelectorAll('.page-view');
    pages.forEach(page => page.classList.remove('active'));

    const targetPage = document.getElementById(pageId);
    if (!targetPage) {
        console.warn(`[navegação] página "${pageId}" não encontrada.`);
        return;
    }
    targetPage.classList.add('active');

    if (pageId === 'equipe' && tabId) {
        // Navegação para uma aba específica da Equipe
        activateTab(tabId);
    } else if (tabId) {
        // Navegação para um card específico dentro da página (ex.: núcleo -> tese)
        highlightTarget(tabId);
    }

    setActiveNavLink(pageId);
    closeMobileMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* Marca visualmente o link do menu correspondente à página atual */
function setActiveNavLink(pageId) {
    document.querySelectorAll('.nav-link').forEach(link => {
        const isActive = link.dataset.page === pageId;
        link.classList.toggle('active-link', isActive);
        if (isActive) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

/* Rola até um card específico (ex.: tese de um núcleo) e aplica um destaque temporário */
function highlightTarget(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('highlight-flash');
        setTimeout(() => target.classList.remove('highlight-flash'), 1500);
    }, 150);
}

/* ==========================================
   NAVEGAÇÃO: liga cliques/teclado em qualquer elemento com data-page
   (substitui os antigos onclick="" inline no HTML)
========================================== */
function initNavigation() {
    document.querySelectorAll('[data-page]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(el.dataset.page, el.dataset.tab || null);
        });
        // Acessibilidade: permite ativar via teclado (Enter/Espaço) elementos
        // que não são nativamente focáveis (div, etc.)
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigateTo(el.dataset.page, el.dataset.tab || null);
            }
        });
    });

    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => activateTab(btn.dataset.tab));
    });
}

/* ==========================================
   SISTEMA DE ABAS (Equipe: Diretores / Membros)
========================================== */
function activateTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const targetPane = document.getElementById(tabId);

    if (targetBtn && targetPane) {
        targetBtn.classList.add('active');
        targetBtn.setAttribute('aria-selected', 'true');
        targetPane.classList.add('active');
    }
}

/* ==========================================
   MENU MOBILE (hambúrguer) — antes não tinha nenhum listener
========================================== */
function initMobileMenu() {
    const toggle = document.getElementById('mobile-menu');
    const navLinks = document.getElementById('nav-links');
    if (!toggle || !navLinks) return;

    toggle.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('open');
        toggle.classList.toggle('active', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
    });
}

function closeMobileMenu() {
    const toggle = document.getElementById('mobile-menu');
    const navLinks = document.getElementById('nav-links');
    if (navLinks && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
    }
}

/* ==========================================
   CARROSSEL DINÂMICO AUTOMÁTICO
========================================== */
function initCarousel() {
    const track = document.getElementById('carousel-track');
    const slides = Array.from(document.querySelectorAll('.carousel-slide'));
    const indicatorsContainer = document.getElementById('carousel-indicators');

    if (!track || slides.length === 0) return;

    let currentIndex = 0;
    const slideCount = slides.length;
    let autoplayTimer = null;

    // Cria indicadores (bolinhas), agora acessíveis por teclado
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('indicator');
        dot.setAttribute('role', 'button');
        dot.setAttribute('tabindex', '0');
        dot.setAttribute('aria-label', `Ir para slide ${index + 1} de ${slideCount}`);
        if (index === 0) dot.classList.add('active');

        dot.addEventListener('click', () => { goToSlide(index); restartAutoplay(); });
        dot.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goToSlide(index);
                restartAutoplay();
            }
        });
        indicatorsContainer.appendChild(dot);
    });

    const indicators = Array.from(document.querySelectorAll('.indicator'));

    function goToSlide(index) {
        currentIndex = index;
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        indicators.forEach(ind => ind.classList.remove('active'));
        indicators[currentIndex].classList.add('active');
    }

    function restartAutoplay() {
        clearInterval(autoplayTimer);
        autoplayTimer = setInterval(() => {
            goToSlide((currentIndex + 1) % slideCount);
        }, 5000);
    }

    restartAutoplay();
}
