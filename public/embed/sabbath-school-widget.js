/**
 * RCA SDA — current Sabbath School lesson widget.
 *
 * Drop this on any page:
 *   <div id="rca-sabbath-widget"></div>
 *   <script src="https://YOUR-SITE/embed/sabbath-school-widget.js" defer></script>
 *
 * The script asks this site's cached JSON proxy for data, then renders inside a
 * shadow root so the host CMS styles cannot leak in or out.
 */
(function () {
  "use strict";

  var currentScript = document.currentScript;
  var scriptUrl = currentScript && currentScript.src ? currentScript.src : "";
  var apiOrigin = scriptUrl ? new URL(scriptUrl).origin : window.location.origin;

  var css = `
    :host {
      all: initial;
      display: block;
      --sw-paper: #fffdf9;
      --sw-surface: #f7f4ee;
      --sw-ink: #282422;
      --sw-soft: #554d47;
      --sw-muted: #7d736b;
      --sw-rule: #e7e1d7;
      --sw-burgundy: #8b1e2d;
      --sw-tint: #f8eeef;
      --sw-gold: #c49a45;
      --sw-gold-tint: #faf4e7;
      color-scheme: light;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; }
    [hidden] { display: none !important; }
    .sw-shell {
      max-width: 100%;
      overflow: hidden;
      border: 1px solid var(--sw-rule);
      border-radius: 18px;
      background: var(--sw-paper);
      color: var(--sw-ink);
      box-shadow: 0 1px 2px rgba(37, 37, 37, .04), 0 18px 38px -32px rgba(37, 37, 37, .42);
    }
    .sw-state {
      display: flex;
      min-height: 260px;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 32px 22px;
      text-align: center;
    }
    .sw-message { margin: 0; max-width: 34rem; color: var(--sw-muted); font-size: 14px; line-height: 1.6; }
    .sw-spinner {
      width: 26px;
      height: 26px;
      border: 2px solid var(--sw-rule);
      border-top-color: var(--sw-burgundy);
      border-radius: 999px;
      animation: sw-spin .8s linear infinite;
    }
    .sw-spinner.small { width: 20px; height: 20px; }
    @keyframes sw-spin { to { transform: rotate(360deg); } }
    .sw-header {
      padding: 22px clamp(18px, 4vw, 28px);
      border-bottom: 1px solid var(--sw-rule);
      background: var(--sw-surface);
    }
    .sw-eyebrow {
      margin: 0;
      color: var(--sw-burgundy);
      font-size: 10.5px;
      font-weight: 650;
      letter-spacing: .12em;
      line-height: 1.4;
      text-transform: uppercase;
    }
    h2.sw-title {
      margin: 6px 0 0;
      color: var(--sw-ink);
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(24px, 4vw, 32px);
      font-weight: 600;
      line-height: 1.18;
      letter-spacing: -.012em;
    }
    .sw-meta { margin: 7px 0 0; color: var(--sw-muted); font-size: 13px; line-height: 1.55; }
    .sw-body { display: grid; }
    .sw-toolbar { padding: 16px clamp(18px, 4vw, 28px); border-bottom: 1px solid var(--sw-rule); }
    .sw-label { display: block; margin-bottom: 6px; color: var(--sw-muted); font-size: 10.5px; font-weight: 650; letter-spacing: .12em; text-transform: uppercase; }
    .sw-select {
      width: 100%;
      height: 42px;
      border: 1px solid var(--sw-rule);
      border-radius: 9px;
      background: var(--sw-paper);
      color: var(--sw-ink);
      padding: 0 12px;
      font: inherit;
      font-size: 14px;
    }
    .sw-select:focus { outline: 2px solid var(--sw-burgundy); outline-offset: 1px; }
    .sw-reading { min-width: 0; padding: clamp(20px, 4vw, 30px); }
    .sw-reading-head { margin-bottom: 18px; }
    .sw-day-meta { margin: 0; color: var(--sw-muted); font-size: 10.5px; font-weight: 650; letter-spacing: .12em; text-transform: uppercase; }
    h3.sw-day-title { margin: 5px 0 0; color: var(--sw-ink); font-family: Georgia, "Times New Roman", serif; font-size: clamp(21px, 3vw, 26px); font-weight: 600; line-height: 1.24; }
    .sw-content {
      color: var(--sw-ink);
      font-family: Georgia, "Times New Roman", serif;
      font-size: 17px;
      line-height: 1.78;
      overflow-wrap: break-word;
    }
    .sw-content > :first-child { margin-top: 0; }
    .sw-content p { margin: 0 0 1em; }
    .sw-content h2, .sw-content h3, .sw-content h4 { margin: 1.7em 0 .6em; color: var(--sw-ink); font-family: Georgia, "Times New Roman", serif; font-size: 1.14em; line-height: 1.3; }
    .sw-content blockquote { margin: 1.3em 0; padding: 14px 17px; border-left: 2px solid var(--sw-gold); border-radius: 0 8px 8px 0; background: var(--sw-gold-tint); color: var(--sw-soft); font-style: italic; }
    .sw-content blockquote p:last-child { margin-bottom: 0; }
    .sw-content a { color: var(--sw-burgundy); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px; }
    .sw-content a:not([href]) { color: inherit; text-decoration: none; }
    .sw-content ul, .sw-content ol { margin: 0 0 1em 1.25em; padding: 0; }
    .sw-content ul { list-style: disc; }
    .sw-content ol { list-style: decimal; }
    .sw-content li { margin-bottom: .4em; padding-left: .2em; }
    .sw-content hr { margin: 1.6em 0; border: 0; border-top: 1px solid var(--sw-rule); }
    .sw-content sup { color: var(--sw-muted); font-family: ui-sans-serif, system-ui, sans-serif; font-size: .68em; }
    .sw-reading-state { display: flex; min-height: 180px; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; }
    .sw-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 14px clamp(18px, 4vw, 28px); border-top: 1px solid var(--sw-rule); background: var(--sw-surface); color: var(--sw-muted); font-size: 11px; line-height: 1.55; }
    .sw-source { max-width: 38rem; margin: 0; }
    .sw-official { flex: 0 0 auto; color: var(--sw-burgundy); font-weight: 650; text-decoration: none; }
    .sw-official:hover { text-decoration: underline; }
    .sw-retry { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; border: 1px solid var(--sw-rule); border-radius: 8px; background: var(--sw-paper); color: var(--sw-ink); padding: 0 14px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .sw-retry:hover { border-color: var(--sw-burgundy); color: var(--sw-burgundy); }
    @media (min-width: 720px) {
      .sw-body { grid-template-columns: 178px minmax(0, 1fr); }
      .sw-toolbar { padding: 20px 18px; border-right: 1px solid var(--sw-rule); border-bottom: 0; }
      .sw-reading { padding: 28px 32px; }
    }
    @media (prefers-color-scheme: dark) {
      :host {
        --sw-paper: #161211;
        --sw-surface: #1d1816;
        --sw-ink: #eee8df;
        --sw-soft: #cec4b8;
        --sw-muted: #a99c90;
        --sw-rule: #342c27;
        --sw-burgundy: #dfa1a9;
        --sw-tint: #2a1d1f;
        --sw-gold: #d8b672;
        --sw-gold-tint: #282117;
        color-scheme: dark;
      }
      .sw-shell { box-shadow: 0 1px 2px rgba(0,0,0,.4), 0 18px 38px -32px rgba(0,0,0,.8); }
    }
  `;

  function mountWidget(host) {
    if (host.dataset.rcaSabbathWidgetReady) return;
    host.dataset.rcaSabbathWidgetReady = "true";

    var shadow = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    var uid = "rca-sabbath-day-" + Math.random().toString(36).slice(2, 9);

    shadow.innerHTML = `
      <style>${css}</style>
      <div class="sw-shell">
        <div class="sw-state" data-state role="status" aria-live="polite">
          <span class="sw-spinner" aria-hidden="true"></span>
          <p class="sw-message">Loading this week’s lesson…</p>
        </div>
        <article data-card hidden>
          <header class="sw-header">
            <p class="sw-eyebrow">Sabbath School · Current week</p>
            <h2 class="sw-title" data-title></h2>
            <p class="sw-meta" data-meta></p>
          </header>
          <div class="sw-body">
            <div class="sw-toolbar">
              <label class="sw-label" for="${uid}">Day</label>
              <select class="sw-select" id="${uid}" data-day-select aria-label="Choose a day of the lesson"></select>
            </div>
            <div class="sw-reading" data-reading aria-live="polite">
              <div class="sw-reading-head" data-reading-head hidden>
                <p class="sw-day-meta" data-day-meta></p>
                <h3 class="sw-day-title" data-day-title></h3>
              </div>
              <div class="sw-content" data-content></div>
              <div class="sw-reading-state" data-reading-state role="status"></div>
            </div>
          </div>
          <footer class="sw-footer">
            <p class="sw-source" data-source>Lesson text © General Conference of Seventh-day Adventists.</p>
            <a class="sw-official" data-official target="_blank" rel="noopener noreferrer">Official guide ↗</a>
          </footer>
        </article>
      </div>`;

    var state = shadow.querySelector("[data-state]");
    var card = shadow.querySelector("[data-card]");
    var title = shadow.querySelector("[data-title]");
    var meta = shadow.querySelector("[data-meta]");
    var select = shadow.querySelector("[data-day-select]");
    var reading = shadow.querySelector("[data-reading]");
    var readingHead = shadow.querySelector("[data-reading-head]");
    var dayMeta = shadow.querySelector("[data-day-meta]");
    var dayTitle = shadow.querySelector("[data-day-title]");
    var content = shadow.querySelector("[data-content]");
    var readingState = shadow.querySelector("[data-reading-state]");
    var source = shadow.querySelector("[data-source]");
    var official = shadow.querySelector("[data-official]");
    var week = null;
    var selectedDay = "";
    var dayToken = 0;

    function setStatus(message, retry) {
      card.hidden = true;
      state.hidden = false;
      state.innerHTML = '<span class="sw-spinner" aria-hidden="true"></span><p class="sw-message"></p>';
      state.querySelector(".sw-message").textContent = message;
      if (retry) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "sw-retry";
        button.textContent = "Try again";
        button.addEventListener("click", retry);
        state.appendChild(button);
      }
    }

    function setReadingState(message, retry) {
      readingState.hidden = false;
      readingState.innerHTML = '<span class="sw-spinner small" aria-hidden="true"></span><p class="sw-message"></p>';
      readingState.querySelector(".sw-message").textContent = message;
      if (retry) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "sw-retry";
        button.textContent = "Try again";
        button.addEventListener("click", retry);
        readingState.appendChild(button);
      }
    }

    function messageOf(error, fallback) {
      return error && error.message ? error.message : fallback;
    }

    async function getJson(path) {
      var response = await fetch(apiOrigin + path, {
        headers: { Accept: "application/json" },
        credentials: "omit",
        mode: "cors",
      });
      var payload = null;
      try { payload = await response.json(); } catch {}
      if (!response.ok) {
        throw new Error(payload && payload.error ? payload.error : "The lesson feed could not be reached.");
      }
      return payload;
    }

    async function loadDay(dayId) {
      if (!week) return;
      selectedDay = dayId;
      select.value = dayId;
      var token = ++dayToken;
      reading.setAttribute("aria-busy", "true");
      readingHead.hidden = true;
      content.hidden = true;
      content.innerHTML = "";
      setReadingState("Loading the reading…");

      try {
        var data = await getJson("/api/sabbath-school/day?day=" + encodeURIComponent(dayId));
        if (token !== dayToken) return;
        dayMeta.textContent = data.label + " · " + data.date;
        dayTitle.textContent = data.title;
        readingHead.hidden = false;
        content.innerHTML = data.contentHtml;
        content.hidden = false;
        readingState.hidden = true;
        reading.setAttribute("aria-busy", "false");
      } catch (error) {
        if (token !== dayToken) return;
        reading.setAttribute("aria-busy", "false");
        setReadingState(messageOf(error, "That day’s reading could not be loaded."), function () {
          loadDay(selectedDay);
        });
      }
    }

    function renderWeek(data) {
      week = data;
      title.textContent = data.lesson.title;
      meta.textContent = "Lesson " + data.lesson.number + " · " + data.quarter.title + " · " + data.lesson.dateRange;
      source.textContent = "Live from the official Adventech feed · not stored";
      source.title = data.source.note;
      official.href = data.lesson.officialUrl;

      select.innerHTML = "";
      data.days.forEach(function (day) {
        var option = document.createElement("option");
        option.value = day.id;
        option.textContent = day.label + " · " + day.date;
        select.appendChild(option);
      });

      state.hidden = true;
      card.hidden = false;
      loadDay(data.todayDayId);
    }

    async function loadWeek() {
      setStatus("Loading this week’s lesson…");
      try {
        var data = await getJson("/api/sabbath-school/current");
        renderWeek(data);
      } catch (error) {
        setStatus(messageOf(error, "This week’s lesson could not be loaded."), loadWeek);
      }
    }

    select.addEventListener("change", function () {
      loadDay(select.value);
    });

    loadWeek();
  }

  function init() {
    var selector = currentScript && currentScript.dataset.target;
    var targets = [];

    if (selector) {
      var chosen = document.querySelector(selector);
      if (chosen) targets = [chosen];
    }

    if (!targets.length) {
      targets = Array.prototype.slice.call(
        document.querySelectorAll("[data-rca-sabbath-widget], #rca-sabbath-widget"),
      );
    }

    if (!targets.length && currentScript && currentScript.parentNode) {
      var fallback = document.createElement("div");
      currentScript.parentNode.insertBefore(fallback, currentScript.nextSibling);
      targets = [fallback];
    }

    targets.forEach(mountWidget);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();