$(document).ready(function () {
  // Smooth animations for buttons
  $(".btn").on("click", function () {
    $(this).addClass("animated bounce");
    setTimeout(() => {
      $(this).removeClass("animated bounce");
    }, 1000);
  });
});
