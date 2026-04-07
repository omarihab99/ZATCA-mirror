(() => {
  const lang = document.documentElement.lang.toLowerCase().includes("en") ? "en" : "ar";
  const isEn = lang === "en";
  const data = window.ZATCA_MIRROR_DATA?.[lang];

  if (!data) {
    return;
  }

  const assetPrefix = isEn ? "../assets/" : "assets/";
  const UI = {
    ar: {
      searchPlaceholder: "كلمات البحث",
      searchButton: "بحث",
      emptySearch: "الرجاء إدخال كلمات البحث",
      voiceTitle: "الأوامر الصوتية",
      voiceDesc:
        "تم تحويل هذه النسخة إلى موقع ثابت، لذلك تم الإبقاء على تعليمات الأوامر الصوتية كمرجع فقط دون تشغيل التعرف الصوتي.",
      voiceListTitle: "قائمة الأوامر الصوتية:",
      voiceItems: [
        "انتقل إلى الأخبار",
        "انتقل إلى مركز المعرفة",
        "انتقل إلى المساعدة والدعم",
        "ابحث عن: ما تريد البحث عنه في البوابة",
      ],
      ok: "موافق",
      noData: "لا يوجد بيانات",
      surveyEnded: "الاستبيان المعروض من النسخة الأصلية قد يكون منتهي الصلاحية.",
      results: "النتائج الحالية",
    },
    en: {
      searchPlaceholder: "Search keyword",
      searchButton: "Search",
      emptySearch: "Please type the search keywords",
      voiceTitle: "Voice Commands",
      voiceDesc:
        "This static mirror keeps the voice command help content, but live speech recognition is not enabled.",
      voiceListTitle: "Voice Commands List:",
      voiceItems: [
        "Go to news",
        "Go to knowledge center",
        "Go to help and support",
        "Search for anything in the portal",
      ],
      ok: "OK",
      noData: "No data found",
      surveyEnded: "The survey shown from the original site may no longer be active.",
      results: "Current results",
    },
  }[lang];

  const rootFontBase = 16;
  const maxFontStep = 3;

  function $(selector, scope = document) {
    return scope.querySelector(selector);
  }

  function $all(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
  }

  function setHtml(id, value) {
    const node = document.getElementById(id);
    if (node) {
      node.innerHTML = value || "";
    }
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = value || "";
    }
  }

  function mediaSrc(path) {
    if (!path) {
      return "";
    }
    if (/^(https?:)?\/\//i.test(path)) {
      return path;
    }
    if (/^(?:\.\.\/|\.\/)/.test(path)) {
      return path;
    }
    if (/^(?:Style(?:%20| )Library|ar\/|en\/)/i.test(path)) {
      return isEn ? `../${path}` : path;
    }
    return `${assetPrefix}${path}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatToday() {
    try {
      if (isEn) {
        return new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(new Date());
      }

      return new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date());
    } catch {
      return new Date().toLocaleDateString(isEn ? "en-US" : "ar-SA");
    }
  }

  function renderMenu() {
    const nav = $("#Master_NavMenu");
    if (!nav) {
      return;
    }

    nav.innerHTML = data.menu
      .map((entry) => {
        const item = entry.Item;
        const subItems = Array.isArray(entry.SubItem) ? entry.SubItem : [];
        const dropdown = subItems.length > 0;

        return `
          <li class="nav-item ${dropdown ? "dropdown" : ""}">
            <a class="nav-link ${dropdown ? "dropdown-toggle" : ""}" href="${escapeHtml(item.URL)}">
              ${item.Title}
            </a>
            ${
              dropdown
                ? `<ul class="dropdown-menu">
                    ${subItems
                      .map(
                        (subItem) => `
                          <li>
                            <a class="dropdown-item" href="${escapeHtml(subItem.URL)}">${subItem.Title}</a>
                          </li>
                        `,
                      )
                      .join("")}
                  </ul>`
                : ""
            }
          </li>
        `;
      })
      .join("");
  }

  function renderHeaderSocial() {
    const list = $("#Master_HeaderSocial");
    if (!list) {
      return;
    }

    list.innerHTML = data.headerSocial
      .map(
        (item) => `
          <li>
            <a href="${escapeHtml(item.URL)}" title="${escapeHtml(item.Title)}" target="_blank" rel="noreferrer">
              <i class="${escapeHtml(item.Class)}"></i>
            </a>
          </li>
        `,
      )
      .join("");
    list.style.visibility = "visible";
  }

  function renderHero() {
    const root = $("#Home_Slider");
    if (!root) {
      return;
    }

    const slides = data.banners;

    if (!slides.length) {
      root.innerHTML = `<div class="mirror-empty">${UI.noData}</div>`;
      return;
    }

    root.innerHTML = `
      <div class="mirror-hero">
        ${slides
          .map(
            (item, index) => `
              <a class="mirror-hero-slide ${index === 0 ? "is-active" : ""}" href="${escapeHtml(item.URL)}" target="_blank" rel="noreferrer">
                <img src="${escapeHtml(mediaSrc(item.image))}" alt="${escapeHtml(item.Title || "")}">
                <div class="slider_caption">
                  <h2>${item.Title || "&nbsp;"}</h2>
                  <p>${item._Comments || ""}</p>
                </div>
              </a>
            `,
          )
          .join("")}
        <div class="mirror-hero-dots">
          ${slides
            .map(
              (_, index) => `
                <button class="mirror-dot ${index === 0 ? "is-active" : ""}" type="button" aria-label="Slide ${index + 1}" data-slide-index="${index}"></button>
              `,
            )
            .join("")}
        </div>
      </div>
    `;

    const slideNodes = $all(".mirror-hero-slide", root);
    const dotNodes = $all(".mirror-dot", root);
    let activeIndex = 0;
    let timerId = null;

    function activate(index) {
      activeIndex = index;
      slideNodes.forEach((node, nodeIndex) => node.classList.toggle("is-active", nodeIndex === index));
      dotNodes.forEach((node, nodeIndex) => node.classList.toggle("is-active", nodeIndex === index));
    }

    function startAutoRotate() {
      clearInterval(timerId);
      timerId = window.setInterval(() => {
        activate((activeIndex + 1) % slideNodes.length);
      }, 4000);
    }

    dotNodes.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        activate(index);
        startAutoRotate();
      });
    });

    startAutoRotate();
  }

  function renderSteps() {
    setHtml("Home_LawsuitTitle", isEn ? "<h4><span>Lawsuit</span>Submission process</h4>" : "<h4><span>مراحل </span>رحلة المتعامل</h4>");

    const root = $("#Home_LawsuitSteps");
    if (!root) {
      return;
    }

    root.innerHTML = data.steps
      .map(
        (item) => `
          <a href="${escapeHtml(item.URL)}" class="items_steps" target="_blank" rel="noreferrer">
            <div class="icon_steps">
              <img src="${escapeHtml(mediaSrc(item.image))}" alt="${escapeHtml(item.Title)}">
            </div>
            <h6>${item.Title}</h6>
            <span>${item._Comments || ""}</span>
          </a>
        `,
      )
      .join("");
  }

  function renderStatistics() {
    const stats = data.statistics || {};
    setHtml("Home_Statistics_Title", isEn ? "<span>General Secretariat </span>statistics" : "<span>إحصائيات </span>الأمانة العامة");
    setHtml("Home_CasesStatistics_Title", isEn ? "<span>Registered</span> cases" : "<span>الدعاوى</span> المقيدة");
    setHtml("Home_HearingStatistics_Title", isEn ? "<span>Hearing</span> sessions" : "<span>جلسات</span> النظر");
    setHtml("Home_DecisionsStatistics_Title", isEn ? "<span>Decisions</span>" : "<span>القرارات</span>");
    setHtml("Home_CallsStatistics_Title", isEn ? "<span>Call </span>center" : "<span>مركز</span> الاتصال");

    function statMarkup(entry, labels) {
      if (!entry) {
        return `<div class="mirror-empty">${UI.noData}</div>`;
      }

      return `
        <div class="item_statistic total">
          <div class="number_statistic">${entry.Total ?? entry.Initial ?? 0}</div>
          <span>${labels.total}</span>
        </div>
        ${entry.Total != null
          ? `
              <div class="item_statistic item_total">
                <div class="number_statistic">${entry.Initial ?? 0}</div>
                <span>${labels.initial}</span>
              </div>
              <div class="item_statistic item_records">
                <div class="number_statistic">${entry.Appeal ?? 0}</div>
                <span>${labels.appeal}</span>
              </div>
              <div class="item_statistic item_total">
                <div class="number_statistic">${entry.CasesReconsider ?? 0}</div>
                <span>${labels.reconsider}</span>
              </div>
            `
          : `
              <div class="item_statistic item_records">
                <div class="number_statistic">${entry.Appeal ?? 0}</div>
                <span>${labels.received}</span>
              </div>
            `}
      `;
    }

    setHtml(
      "Home_CasesStatistics",
      statMarkup(stats.RegisteredCases, {
        total: isEn ? "Total" : "الإجمالي",
        initial: isEn ? "Initial" : "دعوى الفصل",
        appeal: isEn ? "Appeal" : "دعوى الإستئناف",
        reconsider: isEn ? "Reconsideration" : "دعوى الالتماس",
      }),
    );

    setHtml(
      "Home_HearingStatistics",
      statMarkup(stats.HearingSessions, {
        total: isEn ? "Total" : "الإجمالي",
        initial: isEn ? "Initial" : "دعوى الفصل",
        appeal: isEn ? "Appeal" : "دعوى الإستئناف",
        reconsider: isEn ? "Reconsideration" : "دعوى الالتماس",
      }),
    );

    setHtml(
      "Home_DecisionsStatistics",
      statMarkup(stats.Decisions, {
        total: isEn ? "Total" : "الإجمالي",
        initial: isEn ? "Initial" : "دعوى الفصل",
        appeal: isEn ? "Appeal" : "دعوى الإستئناف",
        reconsider: isEn ? "Reconsideration" : "دعوى الالتماس",
      }),
    );

    setHtml(
      "Home_CallsStatistics",
      statMarkup(stats.callCenter, {
        total: isEn ? "Incoming calls" : "عدد المكالمات الواردة",
        received: isEn ? "Received calls" : "عدد المكالمات المستلمة",
      }),
    );
  }

  function renderNews() {
    setHtml("media_center", isEn ? "<span>Media </span>Center" : "<span>المركز  </span>الإعلامي");
    setText("Home_News_Title", isEn ? "News" : "الأخبار");

    const allLink = $("#news_all_lnk");
    if (allLink) {
      allLink.textContent = isEn ? "All" : "الكل";
      allLink.href = data.newsLandingUrl;
    }

    const root = $("#Home_News");
    if (!root) {
      return;
    }

    root.innerHTML = data.news
      .map(
        (item) => `
          <a href="${escapeHtml(item.URL)}" class="item_news" target="_blank" rel="noreferrer">
            <div class="img_news">
              <img src="${escapeHtml(mediaSrc(item.image))}" alt="${escapeHtml(item.Title)}">
            </div>
            <div class="details_news">
              <span class="date">${escapeHtml(item.ArticleStartDate || "")}</span>
              <p>${item.Title}</p>
            </div>
          </a>
        `,
      )
      .join("");
  }

  function renderMediaTabs() {
    setHtml("media_gallary", isEn ? "<span>Multimedia </span>Gallery" : "<span>معرض  </span>الوسائط المتعددة");

    const imagesTab = $("#Home_Images_Title");
    const videosTab = $("#Home_Videos_Title");
    const allLink = $("#gallarey_all");

    if (imagesTab) {
      imagesTab.textContent = isEn ? "Images" : "الصور";
      imagesTab.dataset.url = data.imagesLandingUrl;
    }

    if (videosTab) {
      videosTab.textContent = isEn ? "Videos" : "الفيديو";
      videosTab.dataset.url = data.videosLandingUrl;
    }

    if (allLink) {
      allLink.textContent = isEn ? "All" : "الكل";
      allLink.href = data.imagesLandingUrl;
    }

    const imagesRoot = $("#Home_Images");
    const videosRoot = $("#Home_Videos");

    if (imagesRoot) {
      imagesRoot.innerHTML = data.images
        .map(
          (item) => `
            <a href="${escapeHtml(item.fullImageUrl)}" class="item_media col-12" target="_blank" rel="noreferrer">
              <img src="${escapeHtml(mediaSrc(item.image))}" alt="${escapeHtml(item.Title || "")}">
            </a>
          `,
        )
        .join("");
    }

    if (videosRoot) {
      videosRoot.innerHTML = data.videos
        .map(
          (item) => `
            <a href="${escapeHtml(item.URL)}" class="item_media col-12" target="_blank" rel="noreferrer">
              <img src="${escapeHtml(mediaSrc(item.image))}" alt="${escapeHtml(item.Title || "")}">
            </a>
          `,
        )
        .join("");
    }

    const tabLinks = $all(".multimedia_tabs .nav-link");
    const panes = {
      "#images": $("#images"),
      "#videos": $("#videos"),
    };

    tabLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        tabLinks.forEach((node) => node.classList.remove("active"));
        Object.values(panes).forEach((pane) => pane?.classList.remove("is-active"));
        link.classList.add("active");
        const pane = panes[link.getAttribute("href")];
        pane?.classList.add("is-active");
        if (allLink) {
          allLink.href = link.dataset.url || data.imagesLandingUrl;
        }
      });
    });

    // Keep compatibility with inline onclick handlers preserved from the source HTML.
    window.ToggleLink = (item) => {
      const url = item?.dataset?.url || data.imagesLandingUrl;
      if (allLink) {
        allLink.href = url;
      }
    };

    panes["#images"]?.classList.add("is-active");
  }

  function renderSurvey() {
    setHtml("latest_surveys", isEn ? "<span>Latest </span>Surveys" : "<span>أحدث</span>الاستبيانات");

    const root = $("#survey_container");
    if (!root) {
      return;
    }

    const survey = data.survey;
    if (!survey) {
      root.innerHTML = `<div class="mirror-empty">${UI.noData}</div>`;
      return;
    }

    root.innerHTML = `
      <div class="detaisl_share">
        <p>${escapeHtml(survey.title)}</p>
        <p class="mirror-note">${UI.surveyEnded}</p>
        <a href="${escapeHtml(survey.URL)}" class="btn_style" target="_blank" rel="noreferrer">
          ${isEn ? "Participate in Survey" : "شارك في الاستبيان"}
        </a>
      </div>
      <div class="img_share">
        <img src="${assetPrefix}Style Library/GSTC/images/bg_questionnaires.png" alt="">
      </div>
    `;
  }

  function renderVoting() {
    const root = $("#votingContent");
    if (!root) {
      return;
    }

    const voting = data.voting;
    if (!voting || !Array.isArray(voting.answers) || !voting.answers.length) {
      root.innerHTML = `<div class="mirror-empty">${UI.noData}</div>`;
      return;
    }

    root.innerHTML = `
      <h5>${escapeHtml(voting.question)}</h5>
      <div class="content_poll">
        ${voting.answers
          .map(
            (answer) => `
              <span class="answer_rate">${escapeHtml(answer.title)} - ${answer.percent}%</span>
              <div class="mirror-vote-bar">
                <span style="width:${answer.percent}%"></span>
              </div>
            `,
          )
          .join("")}
      </div>
      <div class="footer_poll">
        <span class="btn_style light mirror-static-badge">${UI.results}</span>
      </div>
    `;
  }

  function renderImportantLinks() {
    setHtml("Home_ImpLinks_Title", isEn ? "<span>Important</span> links" : "شركاء التكامل");

    const root = $("#Home_ImpLinks");
    if (!root) {
      return;
    }

    root.innerHTML = data.importantLinks
      .map(
        (item) => `
          <a href="${escapeHtml(item.URL)}" title="${escapeHtml(item.Title)}" class="col-12 item_links" target="_blank" rel="noreferrer">
            <img src="${escapeHtml(mediaSrc(item.image))}" alt="${escapeHtml(item.Title)}">
          </a>
        `,
      )
      .join("");
  }

  function renderFooter() {
    const overall = $("#OverallFooter");
    const support = $("#supportFooter");
    const copyright = $("#Master_copyrights");

    if (overall) {
      overall.innerHTML = data.footer
        .filter((item) => item.footer_location === "overall_section")
        .map(
          (item) => `
            <li class="links-item">
              <a href="${escapeHtml(item.URL)}" target="_blank" rel="noreferrer">${item.Title}</a>
            </li>
          `,
        )
        .join("");
    }

    if (support) {
      support.innerHTML = data.footer
        .filter((item) => item.footer_location === "support_section")
        .map(
          (item) => `
            <li class="links-item">
              <a href="${escapeHtml(item.URL)}" target="_blank" rel="noreferrer">${item.Title}</a>
            </li>
          `,
        )
        .join("");
    }

    if (copyright) {
      copyright.textContent = isEn
        ? `All rights reserved - GSTC © ${new Date().getFullYear()}`
        : `جميع الحقوق محفوظة - الأمانة العامة للجان الزكوية والضريبية والجمركية © ${new Date().getFullYear()}`;
    }
  }

  function setupSearch() {
    const searchToggle = $(".search > a");
    const field = $(".search_field");
    const input = $(".box_search");
    const button = $(".btn_search");

    if (input) {
      input.placeholder = UI.searchPlaceholder;
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          doSearch();
        }
      });
    }

    if (button) {
      button.textContent = UI.searchButton;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        doSearch();
      });
    }

    searchToggle?.addEventListener("click", (event) => {
      event.preventDefault();
      field?.classList.toggle("showSrchBar");
    });

    document.addEventListener("click", (event) => {
      const container = $(".search");
      if (container && !container.contains(event.target)) {
        field?.classList.remove("showSrchBar");
      }
    });

    function doSearch() {
      const value = input?.value?.trim();
      if (!value) {
        alert(UI.emptySearch);
        return;
      }

      const target = isEn
        ? `https://gstc.gov.sa/en/PortalServices/Search/Pages/default.aspx#k=${encodeURIComponent(value)}`
        : `https://gstc.gov.sa/ar/PortalServices/Search/Pages/default.aspx#k=${encodeURIComponent(value)}`;
      window.open(target, "_blank", "noopener,noreferrer");
    }

    // Keep compatibility with inline onclick handlers preserved from the source HTML.
    window.searchSite = doSearch;
  }

  function setupLanguageSwitch() {
    const switcher = $(".changeLang");
    if (!switcher) {
      return;
    }
    switcher.href = isEn ? "../index.html" : "en/index.html";
  }

  function setupThemeAndZoom() {
    const zoomLink = $(".zoom_in_link");
    const increaseLink = $("#increasetext");
    const decreaseLink = $("#decreasetext");

    const savedTheme = localStorage.getItem("mirror-theme");
    const savedStep = Number(localStorage.getItem("mirror-font-step") || 0);
    const zoomOn = localStorage.getItem("mirror-zoom") === "1";

    applyTheme(savedTheme || "primary");
    applyFontStep(savedStep);
    document.documentElement.classList.toggle("mirror-zoom", zoomOn);

    $all("ul.list_color li").forEach((item) => {
      item.addEventListener("click", (event) => {
        event.preventDefault();
        if (item.classList.contains("color_grey")) {
          applyTheme("grey");
        } else {
          applyTheme("primary");
        }
      });
    });

    zoomLink?.addEventListener("click", (event) => {
      event.preventDefault();
      const next = !document.documentElement.classList.contains("mirror-zoom");
      document.documentElement.classList.toggle("mirror-zoom", next);
      localStorage.setItem("mirror-zoom", next ? "1" : "0");
    });

    increaseLink?.addEventListener("click", (event) => {
      event.preventDefault();
      applyFontStep(Math.min(maxFontStep, currentFontStep() + 1));
    });

    decreaseLink?.addEventListener("click", (event) => {
      event.preventDefault();
      applyFontStep(Math.max(0, currentFontStep() - 1));
    });

    function currentFontStep() {
      return Number(localStorage.getItem("mirror-font-step") || 0);
    }

    function applyTheme(theme) {
      document.body.classList.toggle("mirror-grey-theme", theme === "grey");
      localStorage.setItem("mirror-theme", theme);
    }

    function applyFontStep(step) {
      document.documentElement.style.fontSize = `${rootFontBase + step}px`;
      localStorage.setItem("mirror-font-step", String(step));
      increaseLink?.classList.toggle("disabled", step >= maxFontStep);
      decreaseLink?.classList.toggle("disabled", step <= 0);
    }
  }

  function setupNavbar() {
    const toggler = $(".navbar-toggler");
    const navbar = $("#navbar");

    toggler?.addEventListener("click", () => {
      navbar?.classList.toggle("is-open");
    });

    $all(".nav-item.dropdown > .nav-link", navbar || document).forEach((link) => {
      link.addEventListener("click", (event) => {
        if (window.innerWidth > 992) {
          return;
        }
        const parent = link.closest(".dropdown");
        if (parent) {
          event.preventDefault();
          parent.classList.toggle("is-open");
        }
      });
    });
  }

  function setupHeaderBehavior() {
    window.addEventListener("scroll", () => {
      document.querySelector("header")?.classList.toggle("headerfixed", window.scrollY >= 50);
    });
  }

  function setupVoiceModal() {
    const wrapper = $(".remodal-wrapper");
    const modal = $('[data-remodal-id="voiceCmdsModal"]');
    if (!wrapper || !modal) {
      return;
    }

    modal.innerHTML = `
      <button class="remodal-close mirror-close-modal" aria-label="Close"></button>
      <div>
        <h2>${UI.voiceTitle}</h2>
        <div>
          <p>${UI.voiceDesc}</p>
          <h3>${UI.voiceListTitle}</h3>
          <ul>${UI.voiceItems.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
      </div>
      <br>
      <button class="remodal-confirm mirror-close-modal">${UI.ok}</button>
    `;

    function closeModal() {
      wrapper.style.display = "none";
    }

    function openModal(event) {
      event.preventDefault();
      wrapper.style.display = "block";
    }

    $all('a[href$="#voiceCmdsModal"]').forEach((link) => link.addEventListener("click", openModal));
    $all(".mirror-close-modal", modal).forEach((button) => button.addEventListener("click", closeModal));
    wrapper.addEventListener("click", (event) => {
      if (event.target === wrapper) {
        closeModal();
      }
    });
  }

  function setupMisc() {
    const logo = $("#btn_logo");
    if (logo) {
      logo.href = isEn ? "index.html" : "index.html";
      logo.title = isEn ? "Home" : "الرئيسية";
    }

    setText("Master_Today", formatToday());
  }

  renderMenu();
  renderHeaderSocial();
  renderHero();
  renderSteps();
  renderStatistics();
  renderNews();
  renderMediaTabs();
  renderSurvey();
  renderVoting();
  renderImportantLinks();
  renderFooter();
  setupSearch();
  setupLanguageSwitch();
  setupThemeAndZoom();
  setupNavbar();
  setupHeaderBehavior();
  setupVoiceModal();
  setupMisc();
})();
