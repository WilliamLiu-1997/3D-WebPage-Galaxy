function show_loading() {
  if (typeof $ === "undefined") return;
  const loading = $("#loading");
  if (!loading.length) return;

  loading.show();
  loading.css({ display: "flex", opacity: 0 });
  loading.animate({ opacity: 1 }, 500);
}

function hide_loading() {
  if (typeof $ === "undefined") return;
  const loading = $("#loading");
  const background = $("#loading_background");
  if (!loading.length || !background.length) return;

  loading.fadeOut(800);
  background.fadeOut(800);
}

document.addEventListener("DOMContentLoaded", () => {
  // Automatically show the loading overlay if it exists on the page.
  if (document.getElementById("loading")) {
    show_loading();
  }
});

