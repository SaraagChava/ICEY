document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const vhsIntro = document.getElementById("vhs-intro");
    const app = document.getElementById("app");
    const enterBtn = document.getElementById("enter-archive");
    const loadingText = document.getElementById("loading-text");
    const loadingFill = document.querySelector(".loading-fill");
    const navBtns = document.querySelectorAll(".nav-btn");
    const views = document.querySelectorAll(".view");
    const tapeDamage = document.querySelector(".tape-damage");

    // --- Audio System (Web Audio API) ---
    let audioCtx;
    let masterGain;
    let humOscillator;
    let noiseNode;

    function initAudio() {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.15; // Kept tasteful, not overwhelming
        masterGain.connect(audioCtx.destination);

        // 1. Electrical CRT Hum (60Hz sine wave)
        humOscillator = audioCtx.createOscillator();
        humOscillator.type = 'sine';
        humOscillator.frequency.value = 60;
        let humGain = audioCtx.createGain();
        humGain.gain.value = 0.3;
        humOscillator.connect(humGain);
        humGain.connect(masterGain);
        humOscillator.start();

        // 2. Tape Hiss / Distant Rain (Brown noise approximation via filter)
        const bufferSize = audioCtx.sampleRate * 2; // 2 seconds of noise
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            // White noise
            output[i] = Math.random() * 2 - 1;
        }
        noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;

        // Filter to make it sound like tape hiss/rain
        let lowpass = audioCtx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = 1200;
        
        let noiseGain = audioCtx.createGain();
        noiseGain.gain.value = 0.8;

        noiseNode.connect(lowpass);
        lowpass.connect(noiseGain);
        noiseGain.connect(masterGain);
        noiseNode.start();
    }

    function playClickSound() {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    }

    // --- VHS Intro Sequence ---
    let progress = 0;
    const loadInterval = setInterval(() => {
        progress += Math.floor(Math.random() * 15) + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadInterval);
            loadingText.innerText = "CALIBRATION COMPLETE.";
            enterBtn.classList.remove("hidden");
        } else {
            loadingText.innerText = progress + "%";
        }
        loadingFill.style.width = progress + "%";
    }, 400);

    enterBtn.addEventListener("click", () => {
        initAudio();
        // Simulate VHS transition
        vhsIntro.style.backgroundColor = "black";
        vhsIntro.innerHTML = "";
        tapeDamage.style.display = "block";
        
        setTimeout(() => {
            vhsIntro.classList.add("hidden");
            app.classList.remove("hidden");
            tapeDamage.style.display = "none";
        }, 800);
    });

    // --- Navigation (SPA Logic) ---
    navBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            playClickSound();
            navBtns.forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");

            const targetId = e.target.getAttribute("data-target");
            views.forEach(view => {
                view.classList.remove("active");
                if (view.id === targetId) view.classList.add("active");
            });

            // Unreliable narrator effect: Sometimes scramble a date when navigating to timeline
            if (targetId === "timeline") {
                if (Math.random() > 0.6) {
                    const unstable = document.querySelector(".unstable-date");
                    if (unstable) unstable.innerText = "OCTOBER 14, 1984"; // Changed from 1974
                }
            }
        });
    });

    // --- Corkboard Drag & Drop ---
    const evidenceItems = document.querySelectorAll('.evidence-item');
    let activeItem = null;
    let offsetX = 0, offsetY = 0;

    evidenceItems.forEach(item => {
        item.addEventListener('mousedown', (e) => {
            activeItem = item;
            offsetX = e.clientX - item.getBoundingClientRect().left;
            offsetY = e.clientY - item.getBoundingClientRect().top;
        });
    });

    document.addEventListener('mousemove', (e) => {
        if (!activeItem) return;
        const corkboardRect = document.getElementById('corkboard').getBoundingClientRect();
        
        let newX = e.clientX - corkboardRect.left - offsetX;
        let newY = e.clientY - corkboardRect.top - offsetY;

        // Constrain to bounds
        newX = Math.max(0, Math.min(newX, corkboardRect.width - activeItem.offsetWidth));
        newY = Math.max(0, Math.min(newY, corkboardRect.height - activeItem.offsetHeight));

        activeItem.style.left = `${newX}px`;
        activeItem.style.top = `${newY}px`;
    });

    document.addEventListener('mouseup', () => {
        activeItem = null;
    });

    // --- Archive Terminal Logic ---
    const termInput = document.getElementById("terminal-input");
    const termOutput = document.getElementById("terminal-output");

    function printTerminal(text, color = "var(--terminal-green)") {
        const p = document.createElement("p");
        p.style.color = color;
        p.innerText = text;
        termOutput.appendChild(p);
        termOutput.scrollTop = termOutput.scrollHeight;
    }

    termInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const val = termInput.value.trim().toUpperCase();
            printTerminal(`C:\\ARCHIVE> ${val}`);
            termInput.value = "";

            switch (val) {
                case "HELP":
                    printTerminal("AVAILABLE COMMANDS: HELP, FILES, STATUS, CLEAR");
                    break;
                case "FILES":
                    printTerminal("ERROR: Directory corrupted. 74 fragments unlinked.");
                    break;
                case "STATUS":
                    printTerminal("SYSTEM: OFFLINE. LOCAL CACHE ONLY.");
                    break;
                case "CLEAR":
                    termOutput.innerHTML = "";
                    break;
                case "ICEY":
                case "TRUTH":
                    printTerminal("WARNING: UNAUTHORIZED QUERY.", "red");
                    printTerminal("He is not in the tapes. He is in the silence between them.", "red");
                    tapeDamage.style.display = "block";
                    setTimeout(() => tapeDamage.style.display = "none", 1000);
                    break;
                default:
                    if (val !== "") printTerminal("Bad command or file name.");
                    break;
            }
        }
    });
});
