const favoriteSites = [
  {
    type: "single",
    name: "YouTube",
    url: "https://youtube.com",
    description: "Watch and discover videos"
  },
  {
    type: "single",
    name: "GitHub",
    url: "https://github.com",
    description: "Host and review code"
  },
  {
    type: "group",
    name: "Developer Tools 🛠️",
    description: "Handy tools for coding and debugging",
    links: [
      {
        name: "CodePen",
        url: "https://codepen.io",
        description: "Front-end playground for HTML, CSS, JS."
      },
      {
        name: "JSFiddle",
        url: "https://jsfiddle.net",
        description: "Live editor for JavaScript snippets."
      },
      {
        name: "StackBlitz",
        url: "https://stackblitz.com",
        description: "Instant web-based IDE for web apps."
      }
    ]
  },
  {
    type: "group",
    name: "News & Learning 📚",
    description: "Stay updated and keep learning",
    links: [
      {
        name: "Hacker News",
        url: "https://news.ycombinator.com",
        description: "Tech news from the startup world."
      },
      {
        name: "freeCodeCamp",
        url: "https://www.freecodecamp.org",
        description: "Learn to code for free with projects."
      }
    ]
  }
];


const siteList = document.getElementById("site-list");

favoriteSites.forEach(site => {
  const col = document.createElement("div");
  col.className = "col-md-6 col-lg-3 mb-4";

  if (site.type === "single") {
    col.innerHTML = `
      <div class="card h-100">
        <div class="card-body">
          <h5 class="card-title">${site.name}</h5>
          <p class="card-text">${site.description}</p>
          <a href="${site.url}" target="_blank" class="btn btn-outline-primary">Visit</a>
        </div>
      </div>
    `;
  } else if (site.type === "group") {
  let linksHTML = site.links.map(link => `
    <div class="mb-3">
      <h6 class="mb-1">
        <a href="${link.url}" target="_blank" class="text-decoration-none fw-semibold">
          🔗 ${link.name}
        </a>
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
