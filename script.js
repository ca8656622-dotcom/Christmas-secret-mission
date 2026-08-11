// Christmas Secret Mission — shared client-side logic.
// Handles login, per-participant reveal of character/mission, organizer
// access control, and the falling-snow decoration. No backend: session
// state lives in sessionStorage for the duration of the browser tab.

const SESSION_KEY = "xmasMission.nickname";

document.addEventListener("DOMContentLoaded", () => {
  initSnowfall();
  updateAuthNav();

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    initLoginForm(loginForm);
  }

  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", (event) => {
      event.preventDefault();
      logout();
    });
  }

  if (document.body.dataset.page === "character") {
    initCharacterPage();
  }

  if (document.body.dataset.page === "mission") {
    initMissionPage();
  }

  if (document.body.dataset.page === "organizer") {
    initOrganizerPage();
  }
});

// ---------- session helpers ----------

function getCurrentNickname() {
  return sessionStorage.getItem(SESSION_KEY);
}

function setCurrentNickname(nickname) {
  sessionStorage.setItem(SESSION_KEY, nickname);
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "login.html";
}

function updateAuthNav() {
  const logoutLink = document.getElementById("logout-link");
  const nickname = getCurrentNickname();
  if (logoutLink) {
    logoutLink.classList.toggle("is-hidden", !nickname);
  }
}

function fetchParticipants() {
  return fetch("participants.json").then((response) => {
    if (!response.ok) {
      throw new Error("Could not load participants.json");
    }
    return response.json();
  });
}

function requireLogin(redirectTo) {
  const nickname = getCurrentNickname();
  if (!nickname) {
    window.location.href = `login.html?next=${encodeURIComponent(redirectTo)}`;
    return null;
  }
  return nickname;
}

// ---------- login page ----------

function initLoginForm(form) {
  const errorBox = document.getElementById("login-error");
  const nicknameInput = document.getElementById("nickname");
  const codeInput = document.getElementById("code");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (errorBox) {
      errorBox.textContent = "";
    }

    const nickname = (nicknameInput.value || "").trim();
    const code = (codeInput.value || "").trim();

    if (!nickname || !code) {
      showLoginError(errorBox, "Enter your nickname and 3-digit mission code.");
      return;
    }

    fetchParticipants()
      .then((participants) => {
        const match = participants.find(
          (participant) =>
            participant.nickname.toLowerCase() === nickname.toLowerCase() &&
            participant.code === code,
        );

        if (!match) {
          showLoginError(
            errorBox,
            "That nickname and code do not match. Try again, agent.",
          );
          return;
        }

        setCurrentNickname(match.nickname);

        const params = new URLSearchParams(window.location.search);
        const next = params.get("next");
        window.location.href = next || "character.html";
      })
      .catch(() => {
        showLoginError(
          errorBox,
          "Something went wrong loading the mission roster. Try again.",
        );
      });
  });
}

function showLoginError(errorBox, message) {
  if (errorBox) {
    errorBox.textContent = message;
  }
}

// ---------- character page ----------

function initCharacterPage() {
  const nickname = requireLogin("character.html");
  if (!nickname) {
    return;
  }

  fetchParticipants()
    .then((participants) => {
      const me = participants.find(
        (participant) => participant.nickname === nickname,
      );
      if (!me) {
        logout();
        return;
      }

      setText("greeting-name", me.nickname);
      setText("character-name", me.character.name);
      setText("character-description", me.character.description);
    })
    .catch(() => {
      setText("character-name", "Unable to load your character.");
    });
}

// ---------- mission page ----------

function initMissionPage() {
  const nickname = requireLogin("mission.html");
  if (!nickname) {
    return;
  }

  fetchParticipants()
    .then((participants) => {
      const me = participants.find(
        (participant) => participant.nickname === nickname,
      );
      if (!me) {
        logout();
        return;
      }

      setText("mission-greeting-name", me.nickname);
      setText("mission-title", me.mission.title);
      setText("mission-details", me.mission.details);
    })
    .catch(() => {
      setText("mission-title", "Unable to load your mission.");
    });
}

// ---------- organizer page ----------

function initOrganizerPage() {
  const nickname = requireLogin("organizer.html");
  if (!nickname) {
    return;
  }

  const deniedBox = document.getElementById("organizer-denied");
  const contentBox = document.getElementById("organizer-content");
  const tableBody = document.getElementById("participants-table-body");

  fetchParticipants()
    .then((participants) => {
      const me = participants.find(
        (participant) => participant.nickname === nickname,
      );

      if (!me || !me.isOrganizer) {
        if (deniedBox) deniedBox.classList.remove("is-hidden");
        if (contentBox) contentBox.classList.add("is-hidden");
        return;
      }

      if (deniedBox) deniedBox.classList.add("is-hidden");
      if (contentBox) contentBox.classList.remove("is-hidden");

      if (!tableBody) {
        return;
      }

      tableBody.innerHTML = "";

      participants.forEach((participant) => {
        const row = document.createElement("tr");

        row.appendChild(makeCell(participant.nickname));
        row.appendChild(makeCell(participant.code));
        row.appendChild(makeCell(participant.character.name));
        row.appendChild(makeCell(participant.mission.title));

        tableBody.appendChild(row);
      });
    })
    .catch(() => {
      if (deniedBox) {
        deniedBox.classList.remove("is-hidden");
        deniedBox.textContent = "Unable to load the mission roster.";
      }
    });
}

function makeCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function setText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  }
}

// ---------- snowfall decoration ----------

function initSnowfall() {
  if (document.querySelector(".snowfall")) {
    return;
  }

  const container = document.createElement("div");
  container.className = "snowfall";
  container.setAttribute("aria-hidden", "true");

  const flakeCount = 28;
  for (let i = 0; i < flakeCount; i += 1) {
    const flake = document.createElement("span");
    flake.className = "snowflake";
    flake.textContent = "❄";

    const left = Math.random() * 100;
    const duration = 8 + Math.random() * 10;
    const delay = Math.random() * 10;
    const size = 0.6 + Math.random() * 1.2;
    const drift = Math.random() * 2 - 1;

    flake.style.left = `${left}vw`;
    flake.style.animationDuration = `${duration}s, ${duration}s`;
    flake.style.animationDelay = `${delay}s, ${delay}s`;
    flake.style.fontSize = `${size}rem`;
    flake.style.setProperty("--drift", `${drift * 40}px`);

    container.appendChild(flake);
  }

  document.body.prepend(container);
}
