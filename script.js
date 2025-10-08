let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let startTime;
let userEmail = "";

async function loadQuestions() {
  const res = await fetch("./questions.json");
  questions = await res.json();
}

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function startQuiz() {
  const startRange = parseInt(document.getElementById("startRange").value) || 1;
  const endRange = parseInt(document.getElementById("endRange").value) || questions.length;
  const shuffle = document.getElementById("shuffle").checked;

  userEmail = document.getElementById("email").value.trim();
  if (!userEmail) {
    alert("Please enter your email.");
    return;
  }

  let selectedQuestions = questions.slice(startRange - 1, endRange);
  if (shuffle) selectedQuestions = shuffleArray(selectedQuestions);

  window.quizState = {
    selectedQuestions,
    currentIndex: 0,
    score: 0,
    startTime: new Date(),
  };

  document.getElementById("registration").classList.add("hidden");
  document.getElementById("quiz").classList.remove("hidden");

  showQuestion();
}

function showQuestion() {
  const { selectedQuestions, currentIndex } = window.quizState;
  const questionData = selectedQuestions[currentIndex];

  const questionContainer = document.getElementById("question-container");
  const optionsContainer = document.getElementById("options");
  const nextBtn = document.getElementById("nextBtn");

  questionContainer.textContent = questionData.question;
  optionsContainer.innerHTML = "";
  nextBtn.classList.add("hidden");

  questionData.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.onclick = () => selectAnswer(opt, btn, questionData.answer);
    optionsContainer.appendChild(btn);
  });
}

function selectAnswer(selected, btn, correctAnswer) {
  const buttons = document.querySelectorAll("#options button");
  buttons.forEach((b) => (b.disabled = true));

  if (selected === correctAnswer) {
    btn.classList.add("selected");
    window.quizState.score++;
  } else {
    btn.style.background = "#e74c3c";
  }

  document.getElementById("nextBtn").classList.remove("hidden");
}

function nextQuestion() {
  const { selectedQuestions } = window.quizState;
  window.quizState.currentIndex++;

  if (window.quizState.currentIndex < selectedQuestions.length) {
    showQuestion();
  } else {
    endQuiz();
  }
}

function endQuiz() {
  const endTime = new Date();
  const duration = ((endTime - window.quizState.startTime) / 1000).toFixed(2);

  document.getElementById("quiz").classList.add("hidden");
  document.getElementById("results").classList.remove("hidden");

  const scoreText = `${userEmail} scored ${window.quizState.score} / ${window.quizState.selectedQuestions.length}`;
  document.getElementById("score").textContent = scoreText;
  document.getElementById("time").textContent = `Time: ${duration}s`;

  const leaderboard = JSON.parse(localStorage.getItem("leaderboard") || "[]");
  leaderboard.push({ email: userEmail, score: window.quizState.score, time: parseFloat(duration) });
  leaderboard.sort((a, b) => b.score - a.score || a.time - b.time);
  localStorage.setItem("leaderboard", JSON.stringify(leaderboard));

  const leaderboardEl = document.getElementById("leaderboard");
  leaderboardEl.innerHTML = leaderboard
    .slice(0, 10)
    .map((e, i) => `<li>${i + 1}. ${e.email} - ${e.score} pts - ${e.time}s</li>`)
    .join("");
}

function restartQuiz() {
  document.getElementById("results").classList.add("hidden");
  document.getElementById("registration").classList.remove("hidden");
}

document.getElementById("startBtn").onclick = startQuiz;
document.getElementById("nextBtn").onclick = nextQuestion;
document.getElementById("restartBtn").onclick = restartQuiz;

loadQuestions();
