let questions = [];
let userEmail = "";
let timerInterval = null;
let timeRemaining = 0;

// Load questions and adjust UI ranges/modes
async function loadQuestions() {
  const res = await fetch("questions.json");
  questions = await res.json();

  const total = questions.length;
  const startRange = document.getElementById("startRange");
  const endRange = document.getElementById("endRange");
  const startLabel = document.getElementById("startLabel");
  const endLabel = document.getElementById("endLabel");
  const modeSelect = document.getElementById("modeSelect");

  startRange.max = total;
  endRange.max = total;
  startRange.value = 1;
  endRange.value = total;
  startLabel.textContent = 1;
  endLabel.textContent = total;

  const first100 = modeSelect.querySelector('option[value="first100"]');
  const second100 = modeSelect.querySelector('option[value="second100"]');
  const timed = modeSelect.querySelector('option[value="timed"]');

  if (total < 100) {
    first100.disabled = true;
    second100.disabled = true;
  } else if (total >= 100 && total < 200) {
    first100.disabled = false;
    second100.disabled = true;
  } else {
    first100.disabled = false;
    second100.disabled = false;
  }

  timed.disabled = total < 20;

  const info = document.getElementById("questionCountInfo");
  if (info) info.textContent = `📘 Total questions available: ${total}`;
}

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

document.getElementById("startRange").oninput = e => {
  document.getElementById("startLabel").textContent = e.target.value;
};
document.getElementById("endRange").oninput = e => {
  document.getElementById("endLabel").textContent = e.target.value;
};

document.getElementById("modeSelect").onchange = e => {
  const mode = e.target.value;
  document.getElementById("customRange").style.display =
    (mode === "custom") ? "block" : "none";
};

// ---- QUIZ START ----
function startQuiz() {
  const mode = document.getElementById("modeSelect").value;
  const shuffle = document.getElementById("shuffle").checked;
  userEmail = document.getElementById("email").value.trim();

  if (!userEmail) {
    alert("Please enter your email.");
    return;
  }

  let selectedQuestions = [];

  if (mode === "first100") {
    if (questions.length < 100) return alert("Not enough questions for this mode.");
    selectedQuestions = questions.slice(0, 100);
  } else if (mode === "second100") {
    if (questions.length < 200) return alert("Not enough questions for this mode.");
    selectedQuestions = questions.slice(100, 200);
  } else if (mode === "timed") {
    if (questions.length < 20) return alert("Not enough questions for timed mode.");
    selectedQuestions = shuffleArray(questions).slice(0, 20);
    startTimer(120);
  } else {
    const startRange = parseInt(document.getElementById("startRange").value);
    const endRange = parseInt(document.getElementById("endRange").value);

    if (startRange < 1 || startRange >= endRange) {
      alert("Please select a valid range.");
      return;
    }
    if (endRange > questions.length) {
      alert(`Only ${questions.length} questions are available.`);
      return;
    }

    selectedQuestions = questions.slice(startRange - 1, endRange);
  }

  if (shuffle && mode !== "timed") selectedQuestions = shuffleArray(selectedQuestions);

  window.quizState = {
    selectedQuestions,
    currentIndex: 0,
    score: 0,
    startTime: new Date(),
    timed: (mode === "timed")
  };

  document.getElementById("registration").classList.add("hidden");
  document.getElementById("quiz").classList.remove("hidden");
  document.getElementById("timer").classList.toggle("hidden", mode !== "timed");

  showQuestion();
}

// ---- QUESTION RENDER ----
function showQuestion() {
  const { selectedQuestions, currentIndex } = window.quizState;
  const q = selectedQuestions[currentIndex];

  document.getElementById("progress").textContent =
    `Question ${currentIndex + 1} of ${selectedQuestions.length}`;

  const questionContainer = document.getElementById("question-container");
  const optionsContainer = document.getElementById("options");
  const nextBtn = document.getElementById("nextBtn");
  const feedbackEl = document.getElementById("feedback");

  questionContainer.innerHTML = `<p>${q.question}</p>`;

  if (Array.isArray(q.question_images) && q.question_images.length > 0) {
    q.question_images.forEach(imgPath => {
      const img = document.createElement("img");
      img.src = "images/" + imgPath;
      img.alt = "question image";
      img.className = "inline-img";
      questionContainer.appendChild(img);
    });
  }

  optionsContainer.innerHTML = "";
  feedbackEl.innerHTML = "";
  nextBtn.classList.add("hidden");

  if (q.question_type === "radio" || q.question_type === "checkbox") {
    q.options.forEach(opt => {
      const label = document.createElement("label");
      label.classList.add("option-item");

      const input = document.createElement("input");
      input.type = q.question_type;
      input.name = "questionOption";
      input.id = opt.id;
      input.value = opt.text;

      const span = document.createElement("span");
      span.textContent = `${opt.id}. ${opt.text}`;

      label.appendChild(input);
      label.appendChild(span);

      if (opt.answer_image) {
        const img = document.createElement("img");
        img.src = opt.answer_image;
        img.alt = opt.text;
        img.className = "option-img";
        label.appendChild(img);
      }

      optionsContainer.appendChild(label);
    });

    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Submit Answer";
    submitBtn.onclick = () => checkAnswer(q);
    optionsContainer.appendChild(submitBtn);
  } else if (q.question_type === "input") {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Type your answer...";
    input.id = "inputAnswer";
    optionsContainer.appendChild(input);

    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Submit Answer";
    submitBtn.onclick = () => checkAnswer(q);
    optionsContainer.appendChild(submitBtn);
  }
}

// ---- ANSWER CHECK ----
function checkAnswer(q) {
  const feedbackEl = document.getElementById("feedback");
  const nextBtn = document.getElementById("nextBtn");

  let correctAnswers = [];
  if (Array.isArray(q.answer)) {
    correctAnswers = q.answer.map(a => a.toString().toLowerCase().trim());
  } else if (typeof q.answer === "string") {
    if (q.question_type === "checkbox") {
      correctAnswers = q.answer.split(",").map(a => a.toLowerCase().trim());
    } else {
      correctAnswers = [q.answer.toLowerCase().trim()];
    }
  }

  let userAnswers = [];

  if (q.question_type === "radio") {
    const selected = document.querySelector('input[name="questionOption"]:checked');
    if (selected) userAnswers.push(selected.id.toLowerCase().trim());
  } else if (q.question_type === "checkbox") {
    document.querySelectorAll('input[name="questionOption"]:checked').forEach(input => {
      userAnswers.push(input.id.toLowerCase().trim());
    });
  } else if (q.question_type === "input") {
    const val = document.getElementById("inputAnswer").value.trim().toLowerCase();
    if (val) {
      const validOptions = (q.options || []).map(o => o.text.toLowerCase().trim());
      if (validOptions.includes(val) || correctAnswers.includes(val)) {
        userAnswers.push(val);
      }
    }
  }

  const isCorrect =
    correctAnswers.length === userAnswers.length &&
    userAnswers.every(ans => correctAnswers.includes(ans));

  if (isCorrect) {
    window.quizState.score++;
    feedbackEl.innerHTML = `<span class="correct">✅ Correct!</span> ${q.answer_feedback}`;
  } else {
    feedbackEl.innerHTML = `<span class="incorrect">❌ Incorrect.</span> ${q.answer_feedback}`;
  }

  document.querySelectorAll("#options input").forEach(inp => inp.disabled = true);
  nextBtn.classList.remove("hidden");
}

// ---- QUIZ FLOW ----
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
  clearInterval(timerInterval);

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
  clearInterval(timerInterval);
  document.getElementById("results").classList.add("hidden");
  document.getElementById("registration").classList.remove("hidden");
  document.getElementById("timer").classList.add("hidden");
}

// ---- TIMER ----
function startTimer(seconds) {
  timeRemaining = seconds;
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      alert("⏱ Time’s up!");
      endQuiz();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  document.getElementById("timeRemaining").textContent =
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

document.getElementById("startBtn").onclick = startQuiz;
document.getElementById("nextBtn").onclick = nextQuestion;
document.getElementById("restartBtn").onclick = restartQuiz;

loadQuestions();
