/**
 * Finatura marketing SPA — landing + login/register placeholders
 */

const app = document.getElementById("app");

function pathOf() {
  const p = window.location.pathname.replace(/\/+$/, "") || "/";
  return p;
}

function navigate(to, { replace = false } = {}) {
  if (replace) history.replaceState({}, "", to);
  else history.pushState({}, "", to);
  render();
  window.scrollTo(0, 0);
}

function bindNavClicks(root) {
  root.querySelectorAll("[data-link]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(el.getAttribute("href"));
    });
  });
}

function navMarkup({ auth = false } = {}) {
  return `
    <header class="site-nav${auth ? " auth-nav" : ""}" id="site-nav">
      <a class="nav-logo" href="/" data-link>Finatura<span>.</span></a>
      <div class="nav-actions">
        <a class="btn btn-ghost" href="/login" data-link>Giriş</a>
        <a class="btn btn-solid" href="/register" data-link>Kayıt Ol</a>
      </div>
    </header>
  `;
}

function heroVisualSvg() {
  return `
    <div class="hero-visual" aria-hidden="true">
      <svg viewBox="0 0 480 500" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sheet" x1="80" y1="40" x2="400" y2="420" gradientUnits="userSpaceOnUse">
            <stop stop-color="#E8F2EE" stop-opacity="0.95"/>
            <stop offset="1" stop-color="#C5D9CF" stop-opacity="0.55"/>
          </linearGradient>
          <linearGradient id="goldLine" x1="120" y1="100" x2="360" y2="360" gradientUnits="userSpaceOnUse">
            <stop stop-color="#D4B56A"/>
            <stop offset="1" stop-color="#D4B56A" stop-opacity="0.2"/>
          </linearGradient>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <!-- Back sheet: paper / contract -->
        <g opacity="0.9" transform="translate(48 70) rotate(-8 180 200)">
          <rect x="40" y="20" width="280" height="360" rx="8" fill="url(#sheet)" stroke="rgba(212,181,106,0.35)" stroke-width="1.5"/>
          <rect x="72" y="70" width="160" height="10" rx="2" fill="#0B1F1A" opacity="0.15"/>
          <rect x="72" y="100" width="200" height="7" rx="2" fill="#0B1F1A" opacity="0.1"/>
          <rect x="72" y="124" width="180" height="7" rx="2" fill="#0B1F1A" opacity="0.1"/>
          <rect x="72" y="148" width="140" height="7" rx="2" fill="#0B1F1A" opacity="0.1"/>
          <rect x="72" y="200" width="190" height="7" rx="2" fill="#0B1F1A" opacity="0.08"/>
          <rect x="72" y="224" width="170" height="7" rx="2" fill="#0B1F1A" opacity="0.08"/>
          <rect x="72" y="280" width="90" height="48" rx="4" fill="#D4B56A" opacity="0.35"/>
        </g>
        <!-- Mid: invoice panel -->
        <g transform="translate(110 110) rotate(6 150 160)">
          <rect x="0" y="0" width="260" height="300" rx="10" fill="#0F2A23" stroke="#D4B56A" stroke-opacity="0.55" stroke-width="1.5"/>
          <text x="28" y="48" fill="#D4B56A" font-family="Bricolage Grotesque, sans-serif" font-size="18" font-weight="600">e-Fatura</text>
          <rect x="28" y="68" width="80" height="4" rx="2" fill="#2D8A6E"/>
          <rect x="28" y="100" width="140" height="8" rx="2" fill="#DCE8E2" opacity="0.35"/>
          <rect x="28" y="122" width="180" height="8" rx="2" fill="#DCE8E2" opacity="0.22"/>
          <rect x="28" y="144" width="120" height="8" rx="2" fill="#DCE8E2" opacity="0.22"/>
          <rect x="28" y="190" width="204" height="1" fill="#D4B56A" opacity="0.3"/>
          <text x="28" y="220" fill="#DCE8E2" font-family="Figtree, sans-serif" font-size="13" opacity="0.7">Toplam</text>
          <text x="28" y="252" fill="#D4B56A" font-family="Bricolage Grotesque, sans-serif" font-size="28" font-weight="700">₺ 248.500</text>
        </g>
        <!-- Scan beam -->
        <g filter="url(#soft)">
          <path d="M90 180 L390 120" stroke="url(#goldLine)" stroke-width="3" stroke-linecap="round" opacity="0.85">
            <animate attributeName="opacity" values="0.35;0.95;0.35" dur="3.2s" repeatCount="indefinite"/>
          </path>
          <circle cx="240" cy="150" r="6" fill="#D4B56A">
            <animate attributeName="r" values="4;8;4" dur="3.2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.5;1;0.5" dur="3.2s" repeatCount="indefinite"/>
          </circle>
        </g>
        <!-- Accent marks: plate / jewel / key suggestion -->
        <circle cx="78" cy="380" r="28" stroke="#D4B56A" stroke-width="1.5" fill="none" opacity="0.5"/>
        <circle cx="78" cy="380" r="12" fill="#D4B56A" opacity="0.35"/>
        <path d="M400 360 L430 390 L400 420 L370 390 Z" stroke="#2D8A6E" stroke-width="1.5" fill="rgba(45,138,110,0.25)"/>
      </svg>
    </div>
  `;
}

function landingPage() {
  return `
    <div class="noise" aria-hidden="true"></div>
    ${navMarkup()}
    <main>
      <section class="hero" id="hero">
        <div class="hero-atmosphere" aria-hidden="true">
          <div class="hero-orb hero-orb--a"></div>
          <div class="hero-orb hero-orb--b"></div>
        </div>
        ${heroVisualSvg()}
        <div class="hero-copy">
          <p class="hero-brand">Finatur<em>a</em></p>
          <h1 class="hero-headline">Muhasebe yükünü kameraya bırak.</h1>
          <p class="hero-lead">
            Galeri, kuyumcu ve emlak esnafı için: belgeyi tara, e-Fatura’yı hazırla, bankayı eşleştir, Luca’ya aktar.
          </p>
          <div class="hero-cta">
            <a class="btn btn-solid btn-lg" href="/register" data-link>Kayıt Ol</a>
            <a class="btn btn-ghost btn-lg" href="/login" data-link>Giriş</a>
          </div>
        </div>
      </section>

      <section class="section how" id="nasil">
        <div class="section-inner">
          <p class="section-label reveal">Nasıl çalışır</p>
          <h2 class="section-title reveal">OCR’dan Luca’ya tek akış</h2>
          <p class="section-lead reveal">
            Kağıt torbaları ve ajanda karmaşası yerine dört adımlık otomatik zincir.
          </p>
          <div class="flow">
            <article class="flow-step reveal">
              <div class="flow-num">01</div>
              <h3>OCR</h3>
              <p>Noter sözleşmesi, tapu veya kimliği kamerayla okut; alanlar saniyeler içinde yapılsın.</p>
            </article>
            <article class="flow-step reveal">
              <div class="flow-num">02</div>
              <h3>e-Fatura</h3>
              <p>Gider pusulası veya e-Fatura taslağı hazır; onayla, entegratöre gönder.</p>
            </article>
            <article class="flow-step reveal">
              <div class="flow-num">03</div>
              <h3>Banka</h3>
              <p>Havale ve EFT’ler carilerle eşleşsin; giren–çıkan para net görünsün.</p>
            </article>
            <article class="flow-step reveal">
              <div class="flow-num">04</div>
              <h3>Luca</h3>
              <p>Dönemsel paketler mali müşavirinize Luca uyumlu aktarıma hazır olsun.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="section sectors" id="sektorler">
        <div class="section-inner">
          <p class="section-label reveal">Sektörler</p>
          <h2 class="section-title reveal">Esnafa özel, karmaşık değil</h2>
          <p class="section-lead reveal">
            Genel muhasebe labirentinden uzak; günlük işinize dokunan üç dikey.
          </p>
          <ul class="sector-list">
            <li class="reveal">
              <h3>Oto galeri</h3>
              <p>Noter sözleşmesi, plaka ve araç envanteri — torba dolusu evrak yerine tek tarama.</p>
            </li>
            <li class="reveal">
              <h3>Kuyumculuk</h3>
              <p>Has hesap ve alış–satış belgelerini düzenli tutun; ajanda kaybolmasın.</p>
            </li>
            <li class="reveal">
              <h3>Emlak</h3>
              <p>Tapu fotokopileri ve komisyon işlemleri dijital akışta birleşsin.</p>
            </li>
          </ul>
        </div>
      </section>

      <section class="section integrations" id="entegrasyonlar">
        <div class="section-inner">
          <p class="section-label reveal">Entegrasyonlar</p>
          <h2 class="section-title reveal">Bildiğiniz altyapılarla uyum</h2>
          <p class="section-lead reveal">
            e-Fatura ve banka tarafında yaygın entegratörlere bağlanacak şekilde tasarlandı.
          </p>
          <ul class="integ-row reveal">
            <li>EDM</li>
            <li>Uyumsoft</li>
            <li>FIT</li>
            <li>eLogo</li>
            <li>QNB</li>
            <li>NES</li>
            <li>Nilvera</li>
            <li>İzibiz</li>
          </ul>
          <p class="integ-note reveal">
            Entegrasyonlar aşamalı açılır; hesabınızda aktif kanal, firmanızın tercihine göre bağlanır.
          </p>
        </div>
      </section>

      <section class="cta-band" id="basla">
        <div class="section-inner reveal">
          <h2>Finatura ile defteri kapatmayı bırakın.</h2>
          <p>Kamerayı çevirin; gerisini platforma bırakın.</p>
          <div class="cta-actions">
            <a class="btn btn-solid btn-lg" href="/register" data-link>Kayıt Ol</a>
            <a class="btn btn-ghost btn-lg" href="/login" data-link>Giriş Yap</a>
          </div>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <span><strong>Finatura</strong> · finatura.app</span>
      <span>© ${new Date().getFullYear()}</span>
    </footer>
  `;
}

function authPage({ mode }) {
  const isLogin = mode === "login";
  const title = isLogin ? "Giriş" : "Kayıt Ol";
  const submit = isLogin ? "Giriş Yap" : "Hesap Oluştur";
  const alt = isLogin
    ? `Hesabınız yok mu? <a href="/register" data-link>Kayıt Ol</a>`
    : `Zaten üye misiniz? <a href="/login" data-link>Giriş</a>`;

  const extraFields = isLogin
    ? ""
    : `
      <div class="field">
        <label for="name">Ad Soyad / Firma</label>
        <input id="name" name="name" type="text" autocomplete="organization" placeholder="Örn. Atlas Oto Galeri" required />
      </div>
    `;

  return `
    <div class="noise" aria-hidden="true"></div>
    ${navMarkup({ auth: true })}
    <main class="auth-page">
      <div class="auth-panel">
        <h1>${title}</h1>
        <p class="auth-sub">${
          isLogin
            ? "Finatura hesabınıza giriş yapın."
            : "Galeri, kuyumcu veya emlak işletmeniz için hesap açın."
        }</p>
        <form class="auth-form" id="auth-form" novalidate>
          ${extraFields}
          <div class="field">
            <label for="email">E-posta</label>
            <input id="email" name="email" type="email" autocomplete="email" placeholder="siz@firma.com" required />
          </div>
          <div class="field">
            <label for="password">Şifre</label>
            <input id="password" name="password" type="password" autocomplete="${
              isLogin ? "current-password" : "new-password"
            }" placeholder="••••••••" required minlength="6" />
          </div>
          <button class="btn btn-solid" type="submit">${submit}</button>
        </form>
        <p class="auth-alt">${alt}</p>
        <p class="auth-note">Şimdilik demo form — gerçek kimlik doğrulama yakında bağlanacak.</p>
      </div>
    </main>
  `;
}

function setupReveals() {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -40px 0px" }
  );

  els.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 80}ms`;
    io.observe(el);
  });
}

function setupNavScroll() {
  const nav = document.getElementById("site-nav");
  if (!nav || nav.classList.contains("auth-nav")) return;

  const onScroll = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 40);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function setupAuthForm() {
  const form = document.getElementById("auth-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const prev = btn.textContent;
    btn.textContent = "Kaydedildi (demo)";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = prev;
      btn.disabled = false;
      navigate("/");
    }, 900);
  });
}

function render() {
  const path = pathOf();
  document.title =
    path === "/login"
      ? "Giriş · Finatura"
      : path === "/register"
        ? "Kayıt Ol · Finatura"
        : "Finatura — Esnafın mali yükünü sıfırla";

  if (path === "/login") {
    app.innerHTML = authPage({ mode: "login" });
  } else if (path === "/register") {
    app.innerHTML = authPage({ mode: "register" });
  } else {
    app.innerHTML = landingPage();
  }

  bindNavClicks(app);
  setupReveals();
  setupNavScroll();
  setupAuthForm();
}

window.addEventListener("popstate", render);
render();
