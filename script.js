// =========================
// QUIZ CONFIGURATION
// =========================
let questions = [];

// =========================
// GLOBAL STATE
// =========================
const quizState = {
  email: "",
  mode: "",
  startTime: null,
  currentIndex: 0,
  score: 0,
  selectedQuestions: [],
  timer: null,
  timeLimit: 0
};

// =========================
// UI HANDLERS
// =========================
const regDiv = document.getElementById("registration");
const modeDiv = document.getElementById("modeSelection");
const quizDiv = document.getElementById("quizContainer");

// Load questions and adjust UI ranges/modes
async function loadQuestions() {
  const res = await fetch("questions.json");
  questions = await res.json();

  const total = questions.length;

  generateModeButtons();

  const info = document.getElementById("questionCountInfo");
  if (info) info.textContent = `📘 Total questions available: ${total}`;
}

// Registration handling
document.addEventListener("DOMContentLoaded", () => {
  const storedEmail = localStorage.getItem("quizUserEmail");
  const regDiv = document.getElementById("registration");
  const modeDiv = document.getElementById("modeSelection");
  const changeUserBtn = document.getElementById("changeUserBtn");

  if (storedEmail) {
    // Skip registration
    regDiv.classList.add("hidden");
    modeDiv.classList.remove("hidden");
    changeUserBtn.classList.remove("hidden");
    quizState.email = storedEmail;
  } else {
    regDiv.classList.remove("hidden");
    modeDiv.classList.add("hidden");
  }

  // When user registers
  document.getElementById("registerBtn").onclick = () => {
    const email = document.getElementById("emailInput").value.trim();
    if (!email) return alert("Please enter your email.");
    localStorage.setItem("quizUserEmail", email);
    quizState.email = email;
    regDiv.classList.add("hidden");
    modeDiv.classList.remove("hidden");
    changeUserBtn.classList.remove("hidden");
  };

  // Allow changing user manually
  changeUserBtn.addEventListener("click", () => {
    localStorage.removeItem("quizUserEmail");
    location.reload();
  });
});


function generateModeButtons() {
  const total = questions.length; // Available questions
  const totalExpected = 400;

  const sec20 = document.getElementById("sections20");
  const sec100 = document.getElementById("sections100");

  sec20.innerHTML = "";
  sec100.innerHTML = "";

  // 20-question sections
  for (let i = 1; i <= totalExpected / 20; i++) {
    const start = (i - 1) * 20 + 1;
    const end = i * 20;
    const btn = document.createElement("button");
    btn.textContent = `${start}-${end}`;
    if (end <= total) {
      btn.onclick = () => startSectionMode(20, start, end);
    } else {
      btn.classList.add("disabled");
      btn.disabled = true;
    }
    sec20.appendChild(btn);
  }

  // 100-question sections
  for (let i = 1; i <= totalExpected / 100; i++) {
    const start = (i - 1) * 100 + 1;
    const end = i * 100;
    const btn = document.createElement("button");
    btn.textContent = `${start}-${end}`;
    if (end <= total) {
      btn.onclick = () => startSectionMode(100, start, end);
    } else {
      btn.classList.add("disabled");
      btn.disabled = true;
    }
    sec100.appendChild(btn);
  }

  // Timed Modes
  document.querySelectorAll(".modeBtn").forEach(btn => {
    btn.onclick = () => {
        if (btn.dataset.mode === "random20") startRandomMode(20, 180);
        else if (btn.dataset.mode === "random50") startRandomMode(50, 360);
    };
  });
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

// --- START QUIZ MODE ---
function startSectionMode(count, start, end) {
  quizState.mode = `regular_${count}`;
  quizState.selectedQuestions = questions.filter(q => q.number >= start && q.number <= end);
  quizState.timeLimit = 0;
  startQuiz();
}

function startRandomMode(count, timeLimit) {
  quizState.mode = `random_${count}`;
  quizState.selectedQuestions = shuffle(questions).slice(0, count);
  quizState.timeLimit = timeLimit;
  startQuiz();
}

// ---- QUIZ START ----
function startQuiz() {
  modeDiv.classList.add("hidden");
  quizDiv.classList.remove("hidden");
  quizState.score = 0;
  quizState.currentIndex = 0;
  quizState.startTime = Date.now();
  if (quizState.timeLimit > 0) {
    startTimer(quizState.timeLimit);
  } else {
    startStopwatch();
  }
  showQuestion();
}

// ---- TIMER ----
function startTimer(seconds) {
  updateTimerDisplay(seconds);

  quizState.timer = setInterval(() => {
    seconds--;
    updateTimerDisplay(seconds);
    if (seconds <= 0) {
      clearInterval(quizState.timer);
      alert("⏱ Time’s up!");
      endQuiz();
    }
  }, 1000);
}

function startStopwatch(){
  let seconds = 0
  updateTimerDisplay(seconds);

  quizState.timer = setInterval(() => {
    seconds++;
    updateTimerDisplay(seconds);
    if (seconds >= 1000) {
      clearInterval(quizState.timer);
      alert("⏱ Time’s up! You took too long on that test! Focus man.");
      endQuiz();
    }
  }, 1000);
}

function updateTimerDisplay(time) {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  document.getElementById("timer").textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}


document.getElementById("backToMenu").onclick = () => {
  document.getElementById("results").classList.add("hidden");
  document.getElementById("questionCountInfo").classList.remove("hidden");
  modeDiv.classList.remove("hidden");
};

// ---- QUESTION RENDER ----
function showQuestion() {
  const q = quizState.selectedQuestions[quizState.currentIndex];
  const qContainer = document.getElementById("questionContainer");
  const optContainer = document.getElementById("options");
  const feedback = document.getElementById("feedback");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");
  const info = document.getElementById("questionCountInfo");

  qContainer.innerHTML = `<p>${q.number}. ${q.question}</p>`;
  if (q.question_images && q.question_images.length)
    q.question_images.forEach(img => {
      qContainer.innerHTML += `<img src="images/${img}" class="q-img" />`;
    });

  optContainer.innerHTML = "";
  feedback.innerHTML = "";

  info.classList.add("hidden");
  nextBtn.classList.add("hidden");
  feedback.classList.add("hidden")
  submitBtn.classList.remove("hidden");


  if (q.question_type === "input") {
    const inp = document.createElement("input");
    inp.id = "inputAnswer";
    inp.placeholder = "Type your answer...";
    optContainer.appendChild(inp);
  } else {
    q.options.forEach(opt => {
      const div = document.createElement("div");
      const input = document.createElement("input");
      input.type = q.question_type;
      input.name = "questionOption";
      input.id = opt.id;
      input.value = opt.id;
      div.appendChild(input);
      const label = document.createElement("label");
      label.htmlFor = opt.id;
      label.textContent = opt.text;
      div.appendChild(label);
      if (opt.answer_image)
        div.innerHTML += `<img src="images/${opt.answer_image}" class="opt-img" />`;
      optContainer.appendChild(div);
    });
  }

  submitBtn.onclick = () => checkAnswer(q);

  document.getElementById("progress").textContent = `Question ${quizState.currentIndex + 1} / ${quizState.selectedQuestions.length}`;

}


// ---- ANSWER CHECK ----
function checkAnswer(q) {
  const feedback = document.getElementById("feedback");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");

  feedback.classList.remove("hidden")
  submitBtn.classList.add("hidden");


  let correct = Array.isArray(q.answer)
    ? q.answer.map(a => a.toLowerCase().trim())
    : [q.answer.toLowerCase().trim()];
  let user = [];

  if (q.question_type === "radio") {
    const selected = document.querySelector('input[name="questionOption"]:checked');
    if (selected) user.push(selected.id.toLowerCase().trim());
  } else if (q.question_type === "checkbox") {
    document.querySelectorAll('input[name="questionOption"]:checked').forEach(i => user.push(i.id.toLowerCase().trim()));
  } else if (q.question_type === "input") {
    const val = document.getElementById("inputAnswer").value.trim().toLowerCase();
    if (val) user.push(val);
  }

  const isCorrect = correct.length === user.length && user.every(a => correct.includes(a));

  if (isCorrect) {
    quizState.score++;
    feedback.innerHTML = `<p><span class="correct">✅</span> ${q.answer_feedback}</p>`;
  } else {
    feedback.innerHTML = `<p><span class="incorrect">❌</span> ${q.answer_feedback}</p>`;
  }

  document.querySelectorAll("#options input").forEach(i => i.disabled = true);
  nextBtn.classList.remove("hidden");

  nextBtn.onclick = nextQuestion;
}

// ---- QUIZ FLOW ----
function nextQuestion() {
  quizState.currentIndex++;
  if (quizState.currentIndex < quizState.selectedQuestions.length) {
    showQuestion();
  } else {
    endQuiz();
  }
}

// --- QUIZ END ---
function endQuiz() {
  if (quizState.timer) clearInterval(quizState.timer);

  quizDiv.classList.add("hidden");
  document.getElementById("results").classList.remove("hidden");

  const elapsed = Math.floor((Date.now() - quizState.startTime) / 1000);

  const scoreText = `🏆 You scored ${quizState.score} / ${quizState.selectedQuestions.length}`;
  document.getElementById("score").textContent = scoreText;
  document.getElementById("time").textContent = `⏱️ Time: ${elapsed}s`;

}




loadQuestions();
