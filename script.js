const favoriteSites = [
  {
    "type": "single",
    "name": "YouTube",
    "url": "https://youtube.com",
    "description": "Watch and discover videos"
  },
  {
    "type": "single",
    "name": "GitHub",
    "url": "https://github.com",
    "description": "Host and review code"
  },
  {
    "type": "group",
    "name": "Developer Tools 🛠️",
    "description": "Handy tools for coding and debugging",
    "links": [
      {
        "name": "CodePen",
        "url": "https://codepen.io",
        "description": "Front-end playground for HTML, CSS, JS."
      },
      {
        "name": "JSFiddle",
        "url": "https://jsfiddle.net",
        "description": "Live editor for JavaScript snippets."
      },
      {
        "name": "StackBlitz",
        "url": "https://stackblitz.com",
        "description": "Instant web-based IDE for web apps."
      }
    ]
  },
  {
    "type": "group",
    "name": "News & Learning 📚",
    "description": "Stay updated and keep learning",
    "links": [
      {
        "name": "Hacker News",
        "url": "https://news.ycombinator.com",
        "description": "Tech news from the startup world."
      },
      {
        "name": "freeCodeCamp",
        "url": "https://www.freecodecamp.org",
        "description": "Learn to code for free with projects."
      }
    ]
  },
  {
    "type": "group",
    "name": "Everyday Tools 🧰",
    "description": "Popular tools for daily tasks",
    "links": [
      {
        "name": "Google Docs",
        "url": "https://docs.google.com",
        "description": "Create and edit text documents online."
      },
      {
        "name": "Google Sheets",
        "url": "https://sheets.google.com",
        "description": "Spreadsheets for data analysis and reporting."
      },
      {
        "name": "Google Drive",
        "url": "https://drive.google.com",
        "description": "Cloud file storage and sharing by Google."
      },
      {
        "name": "Gmail",
        "url": "https://mail.google.com",
        "description": "Google's email service for personal and work use."
      },
      {
        "name": "Canva",
        "url": "https://www.canva.com",
        "description": "Graphic design tool for social media, posters, and more."
      },
      {
        "name": "Image Compressor",
        "url": "https://tinypng.com",
        "description": "Compress PNG and JPG images without losing quality."
      }
    ]
  },
  {
    "type": "group",
    "name": "Social & Entertainment 🎵",
    "description": "Fun and social media platforms",
    "links": [
      {
        "name": "Facebook",
        "url": "https://facebook.com",
        "description": "Connect with friends, groups, and communities."
      },
      {
        "name": "TikTok",
        "url": "https://tiktok.com",
        "description": "Watch and create short viral videos."
      },
      {
        "name": "Suno",
        "url": "https://suno.com",
        "description": "AI-powered music creation platform."
      }
    ]
  }
];


const siteList = document.getElementById("site-list");

favoriteSites.sort((a, b) => {
  const nameA = a.name.toLowerCase();
  const nameB = b.name.toLowerCase();
  return nameA.localeCompare(nameB);
});


favoriteSites.forEach(site => {
  const col = document.createElement("div");
  col.className = "col-md-6 col-lg-3 mb-4";

  if (site.type === "single") {
    col.innerHTML = `
      <div class="card h-100">
        <div class="card-body">
          <h5 class="card-title">${site.icon ? site.icon + " " : ""}${site.name}</h5>
          <p class="card-text">${site.description}</p>
          <a href="${site.url}" target="_blank" class="btn btn-outline-primary">Visit</a>
        </div>
      </div>
    `;
  } else if (site.type === "group") {
  let linksHTML = site.links.map(link => `
    <div class="mb-3">
		<h6 class="mb-1 d-flex justify-content-between align-items-center">
		  <a href="${link.url}" target="_blank" class="text-decoration-none fw-semibold">
			🔗 ${link.name}
		  </a>
		  <span class="favorite-toggle" data-url="${link.url}" role="button" style="cursor:pointer;">☆</span>
		</h6>
      <p class="small text-muted ms-3">${link.description}</p>
    </div>
  `).join("");

  col.innerHTML = `
    <div class="card h-100 border-info bg-white shadow-sm">
      <div class="card-body">
        <h5 class="card-title">${site.name}</h5>
        <p class="card-text">${site.description}</p>
        ${linksHTML}
      </div>
    </div>
  `;
}

  siteList.appendChild(col);
});


// Handle Google Search
document.getElementById("search-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const query = document.getElementById("search-input").value.trim();
  if (query !== "") {
    const googleURL = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(googleURL, "_blank");
  }
});


// Handle favoriting
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("favorite-toggle")) {
    const url = e.target.getAttribute("data-url");
    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");

    const index = favorites.indexOf(url);
    if (index >= 0) {
      favorites.splice(index, 1); // remove
    } else {
      favorites.push(url); // add
    }

    localStorage.setItem("favorites", JSON.stringify(favorites));
    updateFavoritesUI();
  }
});

function updateFavoritesUI() {
  const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  document.querySelectorAll(".favorite-toggle").forEach(el => {
    const url = el.getAttribute("data-url");
    el.textContent = favorites.includes(url) ? "⭐" : "☆";
  });
}

// Call once on page load
updateFavoritesUI();

// --- Dark Mode Toggle ---
const darkBtn = document.getElementById("darkToggle");
const body = document.body;

// Load saved theme on startup
if (localStorage.getItem("theme") === "dark") {
  body.classList.add("dark-mode");
  darkBtn.textContent = "☀️ Light Mode";
}

// Toggle on click
darkBtn.addEventListener("click", () => {
  body.classList.toggle("dark-mode");

  const isDark = body.classList.contains("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  darkBtn.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
});
