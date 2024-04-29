const faqItems = document.querySelectorAll(".faq li");
faqItems.forEach((faqItem) => {
  const questionButton = faqItem.querySelector(".question");
  const answer = faqItem.querySelector(".answer");
  const arrowImage = questionButton.querySelector("img");
  questionButton.addEventListener("click", () => {
    answer.classList.toggle("show-answer");
    arrowImage.classList.toggle("rotate");
  });
});
