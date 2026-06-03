import {
  initializeApp,
  getApps,
  getApp,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import BINAS_CONFIG from "../../config.js";
import { startCheckout } from "/app/js/billing.js";

// ─── Firebase ───
const firebaseConfig = {
  apiKey: "AIzaSyBgXo3zllXtFJZDn4elpY8DemEQG_ltMk0",
  authDomain: BINAS_CONFIG?.authDomain || "account.binas.app",
  projectId: "binas-91a32",
  storageBucket: "binas-91a32.firebasestorage.app",
  messagingSenderId: "971498903694",
  appId: "1:971498903694:web:5ab8b630b183f5204ed1df",
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// ─── State ───
const state = {
  step: 0,
  goal: null,
  activityLevel: null,
  gender: null,
  age: 25,
  weight: 75,
  height: 178,
  workoutFrequency: null,
  workoutTime: null,
  workoutDuration: null,
  workoutSplit: null,
  skipLegs: null,
  dietaryPreference: null,
  currentDiet: "",
  extraInfo: "",
  user: null,
  subStep: 0, // for step 3 sub-steps
};

// ─── Elements ───
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const progressBar = $("#ob-progress");

function setProgress(pct) {
  progressBar.style.width = Math.min(100, pct) + "%";
}

// ─── Step Navigation ───
function goToStep(n) {
  const currentEl = $(`#ob-step-${state.step}`);
  const nextEl = $(`#ob-step-${n}`);
  if (!currentEl || !nextEl) return;

  currentEl.classList.add("ob-exit");
  setTimeout(() => {
    currentEl.classList.remove("active", "ob-exit");
    nextEl.classList.add("active");
    state.step = n;
    // Progress: 0=0%, 1=20%, 2=40%, 3=60%, 4=80%, 5=100%
    setProgress(n * 20);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 300);
}

// ─── Typewriter Effect ───
function typeWriter(el, text, speed = 35) {
  return new Promise((resolve) => {
    let i = 0;
    el.textContent = "";
    const cursor = el.parentElement?.querySelector(".ob-cursor");
    if (cursor) cursor.classList.remove("hidden");

    function type() {
      if (i < text.length) {
        el.textContent += text[i];
        i++;
        setTimeout(type, speed);
      } else {
        if (cursor) cursor.classList.add("hidden");
        resolve();
      }
    }
    type();
  });
}

// ─── Show Element with Animation ───
function showEl(el, delay = 0) {
  setTimeout(() => {
    el.classList.remove("hidden");
  }, delay);
}

// ─── Animated Counter ───
function animateCounter(el, target, duration = 1200, suffix = "") {
  const start = 0;
  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * ease);
    el.textContent = current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ─── Create Sparkles ───
function createSparkles() {
  const container = $("#ob-sparkles");
  if (!container) return;
  const colors = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#8b5cf6", "#f97316"];

  for (let i = 0; i < 30; i++) {
    const sparkle = document.createElement("div");
    sparkle.className = "ob-sparkle";
    sparkle.style.left = Math.random() * 100 + "%";
    sparkle.style.top = Math.random() * 60 + 20 + "%";
    sparkle.style.background = colors[Math.floor(Math.random() * colors.length)];
    sparkle.style.animationDelay = Math.random() * 0.8 + "s";
    sparkle.style.width = sparkle.style.height = (3 + Math.random() * 5) + "px";
    container.appendChild(sparkle);
  }
  // Clean up after animation
  setTimeout(() => { container.innerHTML = ""; }, 2500);
}

// ════════════════════════════════════════════
// STEP 0: Coach Intro
// ════════════════════════════════════════════
async function initIntro() {
  const textEl = $("#ob-intro-text");
  const btnEl = $("#ob-start-btn");
  const proofEl = $("#ob-social-proof");

  await typeWriter(textEl, "Hey! 👋 I'm your AI fitness coach. Let's build your perfect plan together.", 30);

  showEl(btnEl, 300);
  showEl(proofEl, 600);
}

$("#ob-start-btn")?.addEventListener("click", () => goToStep(1));

// Start intro on load
setTimeout(initIntro, 400);

// ════════════════════════════════════════════
// STEP 1: Goal Selection
// ════════════════════════════════════════════
const goalReplies = {
  "lose-weight": "Great choice! 🔥 I'll build a plan focused on burning fat while keeping your energy up.",
  "build-muscle": "Let's get strong! 💪 Your plan will focus on progressive overload and muscle growth.",
  "get-fitter": "Love it! ❤️ We'll create a balanced plan to boost your overall fitness.",
  "boost-endurance": "Time to level up! ⚡ Your plan will focus on building stamina and endurance.",
};

// Mobile swipe dot tracking
const goalTrack = $("#ob-goal-track");
const goalDots = $$("#ob-goal-dots .ob-dot");

if (goalTrack) {
  goalTrack.addEventListener("scroll", () => {
    const scrollLeft = goalTrack.scrollLeft;
    const cardWidth = goalTrack.querySelector(".ob-goal-card")?.offsetWidth || 260;
    const gap = 12;
    const index = Math.round(scrollLeft / (cardWidth + gap));
    goalDots.forEach((d, i) => d.classList.toggle("active", i === index));
  });
}

$$("#ob-goals .ob-goal-card").forEach((card) => {
  card.addEventListener("click", () => {
    $$("#ob-goals .ob-goal-card").forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    state.goal = card.dataset.value;

    // Show coach response
    const responseEl = $("#ob-goal-response");
    const replyEl = $("#ob-goal-reply");
    replyEl.textContent = goalReplies[state.goal] || "Great choice!";
    responseEl.classList.remove("hidden");

    // Auto-advance after delay
    setTimeout(() => goToStep(2), 1200);
  });
});

// ════════════════════════════════════════════
// STEP 2: Activity Level
// ════════════════════════════════════════════
const activityLabels = {
  sedentary: "Sedentary",
  "lightly-active": "Lightly Active",
  "moderately-active": "Moderately Active",
  "very-active": "Very Active",
  athlete: "Athlete",
};

const activityReplies = {
  sedentary: "No worries — everyone starts somewhere! We'll ease you in gently. 🌱",
  "lightly-active": "Good foundation! We'll gradually build on your current activity. 🚶",
  "moderately-active": "Nice! You're already doing well. Let's take it up a notch. 🏃",
  "very-active": "Impressive! Your plan will match your high energy level. 💥",
  athlete: "Beast mode! We'll create an advanced program for peak performance. 🏆",
};

// SVG figures for each activity level
const activityFigures = {
  sedentary: `<circle cx="50" cy="22" r="14" stroke="var(--accent)" stroke-width="2.5"/>
    <path d="M50 36 L50 65" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M50 65 L35 75 L32 110" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M50 65 L65 75 L68 110" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M30 52 L50 50 L70 52" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" fill="none"/>`,
  "lightly-active": `<circle cx="50" cy="22" r="14" stroke="var(--accent)" stroke-width="2.5"/>
    <path d="M50 36 L50 72" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M50 72 L38 108" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M50 72 L62 108" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M32 55 L50 48 L68 55" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" fill="none"/>`,
  "moderately-active": `<circle cx="50" cy="20" r="14" stroke="var(--accent)" stroke-width="2.5"/>
    <path d="M50 34 L48 68" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M48 68 L32 105" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M48 68 L65 100" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M30 50 L48 42 L70 48" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <line x1="72" y1="38" x2="82" y2="38" stroke="var(--accent)" stroke-width="1.5" opacity="0.3"/>`,
  "very-active": `<circle cx="52" cy="16" r="14" stroke="var(--accent)" stroke-width="2.5"/>
    <path d="M52 30 L48 60" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M48 60 L30 95" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M48 60 L70 90" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M25 42 L48 34 L75 40" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <line x1="78" y1="30" x2="92" y2="30" stroke="var(--accent)" stroke-width="1.5" opacity="0.4"/>
    <line x1="80" y1="38" x2="95" y2="38" stroke="var(--accent)" stroke-width="1.5" opacity="0.25"/>`,
  athlete: `<circle cx="55" cy="14" r="14" stroke="var(--accent)" stroke-width="2.5"/>
    <path d="M55 28 L48 58" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
    <path d="M48 58 L25 92" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
    <path d="M48 58 L72 85" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
    <path d="M22 38 L48 28 L78 35" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" fill="none"/>
    <line x1="80" y1="24" x2="98" y2="24" stroke="var(--accent)" stroke-width="2" opacity="0.5"/>
    <line x1="82" y1="32" x2="100" y2="32" stroke="var(--accent)" stroke-width="2" opacity="0.35"/>
    <line x1="78" y1="40" x2="95" y2="40" stroke="var(--accent)" stroke-width="2" opacity="0.2"/>`,
};

$$(".ob-slider-stop").forEach((stop) => {
  stop.addEventListener("click", () => {
    const value = stop.dataset.value;
    const index = parseInt(stop.dataset.index);
    state.activityLevel = value;

    // Update slider UI
    $$(".ob-slider-stop").forEach((s, i) => {
      s.classList.toggle("active", i === index);
      s.classList.toggle("passed", i < index);
    });

    // Fill track
    const fillPct = (index / 4) * 100;
    const fillEl = $("#ob-slider-fill");
    if (fillEl) {
      fillEl.style.width = `calc(${fillPct}% - ${fillPct > 0 ? 0 : 20}px)`;
    }

    // Update figure SVG
    const figureSvg = $("#ob-figure-svg");
    if (figureSvg && activityFigures[value]) {
      figureSvg.innerHTML = activityFigures[value];
      figureSvg.style.transform = `scale(${1 + index * 0.05})`;
    }

    // Update label
    const label = $("#ob-activity-label");
    if (label) label.textContent = activityLabels[value] || value;

    // Show coach response
    const responseEl = $("#ob-activity-response");
    const replyEl = $("#ob-activity-reply");
    replyEl.textContent = activityReplies[value] || "Got it!";
    responseEl.classList.remove("hidden");

    // Auto-advance
    setTimeout(() => goToStep(3), 1200);
  });
});

$("#ob-back-2")?.addEventListener("click", () => goToStep(1));

// ════════════════════════════════════════════
// STEP 3: Personal Stats (sub-steps)
// ════════════════════════════════════════════
const subSteps = [
  "ob-sub-gender", "ob-sub-age", "ob-sub-weight", "ob-sub-height",
  "ob-sub-workout-prefs", "ob-sub-workout-split", "ob-sub-skip-legs",
  "ob-sub-diet-prefs", "ob-sub-current-diet", "ob-sub-extra-info",
];
const statsDots = $$("#ob-stats-dots .ob-mini-dot");

function goToSubStep(n) {
  const currentEl = $(`#${subSteps[state.subStep]}`);
  const nextEl = $(`#${subSteps[n]}`);
  if (!currentEl || !nextEl) return;

  currentEl.classList.remove("active");
  nextEl.classList.add("active");
  state.subStep = n;

  // Update dots
  statsDots.forEach((d, i) => {
    d.classList.toggle("active", i === n);
    d.classList.toggle("done", i < n);
  });

  // Update coach message
  const coachMsg = $("#ob-stats-coach");
  const msgs = [
    "Let me get to know you a bit...",
    "How old are you?",
    "What do you weigh?",
    "One more measurement!",
    "Let's set up your workout schedule.",
    "Pick the training style you like best.",
    "Quick question about leg day...",
    "Now let's talk nutrition.",
    "Tell me what you currently eat.",
    "Last one — anything else I should know?",
  ];
  if (coachMsg) coachMsg.textContent = msgs[n] || "";

  // Show response confirming what the user JUST entered (previous sub-step)
  showCoachResponse(n);
}

function showCoachResponse(toSubIndex) {
  const responseEl = $("#ob-stats-response");
  const replyEl = $("#ob-stats-reply");
  if (!responseEl || !replyEl) return;

  // Messages confirm the completed step based on where we're navigating TO
  const responses = {
    1: null, // coming from gender → no text response
    2: `Perfect, ${state.age} years. We'll factor that in. ✓`,
    3: `Noted! Your plan will be calibrated for ${state.weight} kg. ✓`,
    4: `${state.height} cm — got it! ✓`,
    5: state.workoutFrequency ? `${state.workoutFrequency}x/week, ${state.workoutDuration || "??"} min — locked in! ✓` : null,
    6: state.workoutSplit ? `Great pick! I'll design your program around that. ✓` : null,
    7: state.skipLegs !== null ? (state.skipLegs ? "No leg day — you've got it covered elsewhere. ✓" : "Leg day included — never skip it! ✓") : null,
    8: state.dietaryPreference ? `${state.dietaryPreference === "no-preference" ? "No restrictions" : state.dietaryPreference.charAt(0).toUpperCase() + state.dietaryPreference.slice(1)} — noted! ✓` : null,
    9: state.currentDiet ? "Thanks! I'll work with your current eating habits. ✓" : null,
  };

  const msg = responses[toSubIndex];
  if (msg) {
    replyEl.textContent = msg;
    responseEl.classList.remove("hidden");
  } else {
    responseEl.classList.add("hidden");
  }
}

// Gender selection
$$("#ob-gender .ob-gender-card").forEach((card) => {
  card.addEventListener("click", () => {
    $$("#ob-gender .ob-gender-card").forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    state.gender = card.dataset.value;

    // Auto advance to age
    setTimeout(() => goToSubStep(1), 400);
  });
});

// Number inputs (direct typing)
function setupNumInput(inputId, stateKey, min, max) {
  const input = $(`#${inputId}`);
  if (!input) return;
  input.addEventListener("input", () => {
    const val = parseInt(input.value);
    if (!isNaN(val)) state[stateKey] = Math.max(min, Math.min(max, val));
  });
  input.addEventListener("change", () => {
    let val = parseInt(input.value) || min;
    val = Math.max(min, Math.min(max, val));
    input.value = val;
    state[stateKey] = val;
  });
}

setupNumInput("ob-age", "age", 14, 99);
setupNumInput("ob-weight", "weight", 30, 300);
setupNumInput("ob-height", "height", 120, 250);

// Sub-step continue buttons
$("#ob-age-next")?.addEventListener("click", () => {
  state.age = parseInt($("#ob-age")?.value) || 25;
  goToSubStep(2);
});
$("#ob-weight-next")?.addEventListener("click", () => {
  state.weight = parseInt($("#ob-weight")?.value) || 75;
  goToSubStep(3);
});

// Back button
$("#ob-back-3")?.addEventListener("click", () => {
  if (state.subStep > 0) {
    goToSubStep(state.subStep - 1);
  } else {
    goToStep(2);
  }
});

// Height continue → workout prefs substep
$("#ob-height-next")?.addEventListener("click", () => {
  state.height = parseInt($("#ob-height")?.value) || 178;
  goToSubStep(4);
});

// ─── Chip Selection Helper ───
function setupChipRow(containerId, stateKey) {
  $$("#" + containerId + " .ob-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$("#" + containerId + " .ob-chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      state[stateKey] = chip.dataset.value;
    });
  });
}

setupChipRow("ob-freq-chips", "workoutFrequency");
setupChipRow("ob-time-chips", "workoutTime");
setupChipRow("ob-duration-chips", "workoutDuration");
setupChipRow("ob-diet-chips", "dietaryPreference");

// Workout prefs continue
$("#ob-workout-prefs-next")?.addEventListener("click", () => {
  goToSubStep(5);
});

// Workout split selection (auto-advance)
$$("#ob-split-cards .ob-split-card").forEach((card) => {
  card.addEventListener("click", () => {
    $$("#ob-split-cards .ob-split-card").forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    state.workoutSplit = card.dataset.value;
    setTimeout(() => goToSubStep(6), 400);
  });
});

// Skip legs selection (auto-advance)
$$("#ob-skip-legs .ob-yesno-card").forEach((card) => {
  card.addEventListener("click", () => {
    $$("#ob-skip-legs .ob-yesno-card").forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    state.skipLegs = card.dataset.value === "yes";
    setTimeout(() => goToSubStep(7), 400);
  });
});

// Dietary prefs continue
$("#ob-diet-prefs-next")?.addEventListener("click", () => {
  goToSubStep(8);
});

// Current diet continue
$("#ob-current-diet-next")?.addEventListener("click", () => {
  state.currentDiet = $("#ob-current-diet")?.value?.trim() || "";
  goToSubStep(9);
});

// Generate button (in extra-info substep)
$("#ob-generate")?.addEventListener("click", () => {
  state.extraInfo = $("#ob-extra-info")?.value?.trim() || "";
  goToStep(4);
  generatePlan();
});

// ════════════════════════════════════════════
// STEP 4: Plan Generation
// ════════════════════════════════════════════
const genMessages = [
  "Analyzing your profile...",
  "Calculating your calorie targets...",
  "Building your training schedule...",
  "Designing your nutrition plan...",
  "Adding personal tips...",
  "Almost ready! ✨",
];

function startGenerationAnimation() {
  const ringProgress = $("#ob-ring-progress");
  const pctEl = $("#ob-gen-pct");
  const stepsEls = [$("#ob-gstep-1"), $("#ob-gstep-2"), $("#ob-gstep-3"), $("#ob-gstep-4")];
  const circumference = 339.29;
  let currentStep = 0;
  let progress = 0;

  // Animate progress ring
  const progressInterval = setInterval(() => {
    progress = Math.min(progress + 1.2, 95); // Stop at 95% until done
    const offset = circumference - (progress / 100) * circumference;
    if (ringProgress) ringProgress.style.strokeDashoffset = offset;
    if (pctEl) pctEl.textContent = Math.round(progress) + "%";
  }, 80);

  // Cycle through loading steps
  function activateStep(i) {
    stepsEls.forEach((s, idx) => {
      if (!s) return;
      s.classList.remove("active", "done");
      if (idx < i) s.classList.add("done");
      else if (idx === i) s.classList.add("active");
    });
  }

  activateStep(0);
  const stepInterval = setInterval(() => {
    currentStep++;
    if (currentStep < stepsEls.length) {
      activateStep(currentStep);
    }
  }, 2000);

  // Cycle coach messages
  let msgIdx = 0;
  const msgEl = $("#ob-gen-msg-1");
  const msgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % genMessages.length;
    if (msgEl) msgEl.textContent = genMessages[msgIdx];
  }, 2200);

  return () => {
    clearInterval(progressInterval);
    clearInterval(stepInterval);
    clearInterval(msgInterval);
    // Complete to 100%
    if (ringProgress) ringProgress.style.strokeDashoffset = "0";
    if (pctEl) pctEl.textContent = "100%";
    stepsEls.forEach((s) => {
      s?.classList.add("done");
      s?.classList.remove("active");
    });
  };
}

async function generatePlan() {
  const stopAnimation = startGenerationAnimation();

  try {
    const user = state.user;
    if (!user) throw new Error("Not authenticated. Please try again.");

    const token = await user.getIdToken();
    const res = await fetch("/api/generate-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        goal: state.goal,
        activityLevel: state.activityLevel,
        gender: state.gender,
        age: state.age,
        weight: state.weight,
        height: state.height,
        workoutFrequency: state.workoutFrequency,
        workoutTime: state.workoutTime,
        workoutDuration: state.workoutDuration,
        workoutSplit: state.workoutSplit,
        skipLegs: state.skipLegs,
        dietaryPreference: state.dietaryPreference,
        currentDiet: state.currentDiet,
        extraInfo: state.extraInfo,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Request failed");
    }

    const data = await res.json();
    stopAnimation();

    // Brief pause to show 100% completion
    setTimeout(() => {
      renderResults(data.plan);
      goToStep(5);
    }, 600);
  } catch (err) {
    stopAnimation();
    const step4 = $("#ob-step-4");
    if (step4) {
      step4.querySelector(".ob-step-inner").innerHTML = `
        <div style="text-align:center;padding:60px 20px;">
          <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">Something went wrong</h2>
          <p style="font-size:14px;color:var(--gray-500);margin-bottom:20px;">${err.message || "Could not generate your plan. Please try again."}</p>
          <button class="ob-cta-btn" onclick="location.reload()">Try again</button>
        </div>
      `;
    }
  }
}

// ════════════════════════════════════════════
// STEP 5: Results
// ════════════════════════════════════════════
function getExerciseEmoji(name) {
  const n = name.toLowerCase();
  if (/squat|lunge|leg press|calf|deadlift|leg curl|leg ext/i.test(n)) return "🦵";
  if (/bench|push.?up|chest|fly|press/i.test(n)) return "🏋️";
  if (/pull.?up|row|lat|back|chin/i.test(n)) return "💪";
  if (/curl|bicep|tricep|arm/i.test(n)) return "💪";
  if (/run|jog|sprint|cardio|hiit|burpee|jump/i.test(n)) return "🏃";
  if (/plank|core|ab|crunch|sit.?up/i.test(n)) return "🔥";
  if (/stretch|yoga|mobility|cool/i.test(n)) return "🧘";
  if (/cycle|bike|spin/i.test(n)) return "🚴";
  if (/swim/i.test(n)) return "🏊";
  if (/shoulder|lateral|overhead/i.test(n)) return "🏋️";
  return "💪";
}

const mealEmojis = {
  breakfast: "🥚",
  lunch: "🥗",
  dinner: "🍽️",
  snacks: "🍎",
};

function renderResults(plan) {
  if (!plan) return;

  // Create sparkles
  createSparkles();

  // Summary
  const summaryEl = $("#ob-summary");
  if (summaryEl) summaryEl.textContent = plan.summary || "Your personalized plan is ready!";

  // Personal note (from user's extra info)
  if (plan.personalNote) {
    const noteEl = $("#ob-personal-note");
    const textEl = $("#ob-pn-text");
    const blurEl = $("#ob-pn-blur");
    const lockedEl = $("#ob-pn-locked");
    if (noteEl && textEl) {
      noteEl.classList.remove("hidden");
      const sentences = plan.personalNote.split(/(?<=\.)\s+/);
      if (sentences.length > 1) {
        textEl.textContent = sentences[0];
        if (lockedEl) lockedEl.textContent = sentences.slice(1).join(" ");
        if (blurEl) blurEl.classList.add("active");
      } else {
        textEl.textContent = plan.personalNote;
        if (blurEl) blurEl.style.display = "none";
      }
    }
  }

  // Animated stat counters
  const totalExercises = (plan.training || []).reduce((sum, d) => sum + (d.exercises?.length || 0), 0);
  setTimeout(() => {
    animateCounter($("#ob-r-calories"), plan.dailyCalories || 2000);
    animateCounter($("#ob-r-days"), 7);
    animateCounter($("#ob-r-exercises"), totalExercises);
  }, 300);

  // Tips
  const tipsContainer = $("#ob-tips");
  (plan.tips || []).forEach((tip) => {
    const el = document.createElement("div");
    el.className = "ob-tip-card";
    el.textContent = tip;
    tipsContainer.appendChild(el);
  });

  // Training Plan - horizontal scroll cards
  const trainingContainer = $("#ob-training-plan");
  (plan.training || []).forEach((day, i) => {
    const card = document.createElement("div");
    const isRest = !day.exercises || day.exercises.length === 0;
    card.className = "ob-day-card" + (i >= 2 ? " ob-blurred" : "") + (i < 2 ? " ob-preview" : "");

    const exercises = (day.exercises || []).map((ex) => `
      <div class="ob-ex-item">
        <span class="ob-ex-emoji">${getExerciseEmoji(ex.name)}</span>
        <div class="ob-ex-info">
          <div class="ob-ex-name">${ex.name}</div>
          <div class="ob-ex-detail">${ex.sets} &times; ${ex.reps} &bull; ${ex.rest}</div>
          ${ex.note ? `<div class="ob-ex-note">${ex.note}</div>` : ""}
        </div>
      </div>
    `).join("");

    card.innerHTML = `
      <div class="ob-day-head">
        <span>${day.day}</span>
        ${day.label ? `<span class="ob-day-label">${day.label}</span>` : ""}
        ${i < 2 ? '<span class="ob-day-badge">Preview</span>' : ""}
      </div>
      ${day.description ? `<p class="ob-day-desc">${day.description}</p>` : ""}
      <div class="ob-day-body">${isRest ? '<div class="ob-rest-msg">Rest & recover</div>' : exercises}</div>
    `;
    trainingContainer.appendChild(card);
  });

  // Nutrition Plan - horizontal scroll cards
  const nutritionContainer = $("#ob-nutrition-plan");
  (plan.nutrition || []).forEach((day, i) => {
    const meals = day.meals || {};
    const macros = day.macros || {};
    const card = document.createElement("div");
    card.className = "ob-day-card" + (i >= 1 ? " ob-blurred" : "") + (i < 1 ? " ob-preview" : "");

    const mealItems = ["breakfast", "lunch", "dinner", "snacks"].map((key) => `
      <div class="ob-meal-item">
        <div class="ob-meal-head">
          <span>${mealEmojis[key] || "🍽️"}</span>
          ${key}
        </div>
        <div class="ob-meal-text">${meals[key] || "—"}</div>
      </div>
    `).join("");

    const macroBar = macros.protein ? `
      <div class="ob-macro-bar">
        <span class="ob-macro-tag ob-macro-p">P: ${macros.protein}g</span>
        <span class="ob-macro-tag ob-macro-c">C: ${macros.carbs}g</span>
        <span class="ob-macro-tag ob-macro-f">F: ${macros.fat}g</span>
      </div>
    ` : "";

    card.innerHTML = `
      <div class="ob-day-head">
        <span>${day.day}</span>
        <span class="ob-day-kcal">${day.kcal || "—"} kcal</span>
      </div>
      ${day.description ? `<p class="ob-day-desc">${day.description}</p>` : ""}
      ${macroBar}
      <div class="ob-day-body">${mealItems}</div>
    `;
    nutritionContainer.appendChild(card);
  });

  // Store plan for transfer after account creation
  try {
    localStorage.setItem("ob_pending_plan", JSON.stringify(plan));
  } catch {}

  // Show paywall
  const paywall = $("#ob-paywall");
  if (paywall) paywall.classList.add("active");
}

// ─── Unlock Button → Stripe ───
$("#ob-unlock-btn")?.addEventListener("click", async () => {
  const priceId = BINAS_CONFIG?.plans?.[1]?.monthlyPriceId || BINAS_CONFIG?.stripePriceId;
  const btn = $("#ob-unlock-btn");
  await startCheckout(null, priceId, btn);
});

// ─── Auth Listener ───
setProgress(0);

onAuthStateChanged(auth, (user) => {
  if (user) {
    state.user = user;
  } else {
    signInAnonymously(auth).catch(() => {});
  }
});
