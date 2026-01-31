<script>
    import { onMount } from "svelte";
    import { fade, scale, fly } from "svelte/transition";
    import { quizzes } from "./data/quizzes";

    export let websocket;
    export let isHousemaster;
    export let sessionId;
    export let userName;

    // Canvas for host view
    let canvas;
    let ctx;
    let animationFrame;
    let width, height;

    // Game State
    let gameState = isHousemaster ? "LOBBY" : "WAITING"; // LOBBY/WAITING, PLAYING/QUIZ, VICTORY/FINISHED
    let users = [];
    let strikes = 0;
    let asteroidsDestroyed = 0;
    let totalAsteroids = 0;

    // Student State
    let questions = [];
    let currentQuestionIndex = 0;
    let streak = 0;
    let correctCount = 0;
    let totalScore = 0;

    // Current Question
    $: currentQuestion = questions[currentQuestionIndex];

    // Host: Leaderboard
    let leaderboard = new Map();

    // Host: Entities
    let spaceship = { x: 0, y: 0, angle: -Math.PI / 2, radius: 30 };
    let asteroids = [];
    let lasers = [];
    let particles = [];
    let pulses = [];
    let scoringNotifs = [];
    let spawnQueue = 0;

    const SPAWN_RATE = 1500;
    let lastSpawnTime = 0;

    // Countdown and Timer
    let countdown = null;
    let timeLeft = 60;
    let timerInterval;

    const COLORS = {
        ship: "#4ECDC4",
        asteroid: "#A0AEC0",
        laser: "#FF6B6B",
        background: "#0f172a",
        text: "#ffffff",
        accent: "#FBBF24",
    };

    // Host Action State
    let selectedQuizId = quizzes[0].id;
    let powerBoostActive = false;
    let shockwaveUses = 3;

    onMount(() => {
        if (isHousemaster && canvas) {
            ctx = canvas.getContext("2d");
            resize();
            window.addEventListener("resize", resize);
            loop();
        }

        // Subscribe to store updates for user list
        const unsubscribe = websocket.subscribe((state) => {
            if (state && state.rooms) {
                console.log(
                    "[QuizView] 📋 Store update: rooms =",
                    state.rooms.length,
                );
                users = state.rooms.filter((u) => !u.isHousemaster);
            }
        });

        // Event listeners for game logic
        const handlers = {
            towerShot: (e) => handleTowerShot(e.detail),
            pulse: (e) => handlePulseEvent(e.detail),
            quizMissionStarted: (e) => handleMissionStarted(e.detail),
            quizMissionEnded: (e) => handleMissionEnded(e.detail),
            quizResult: (e) => handleQuizResult(e.detail),
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            window.addEventListener(event, handler);
        });

        return () => {
            if (isHousemaster) {
                window.removeEventListener("resize", resize);
                cancelAnimationFrame(animationFrame);
            }
            unsubscribe();
            Object.entries(handlers).forEach(([event, handler]) => {
                window.removeEventListener(event, handler);
            });
        };
    });

    function resize() {
        if (canvas) {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            spaceship.x = width / 2;
            spaceship.y = height / 2;
        }
    }

    function handleTowerShot(data) {
        if (isHousemaster) {
            console.log("[QuizView] 🔫 Laser Shot!", data);
            fireLaser(data);
            updateLeaderboard(data);
        }
    }

    function handlePulseEvent(data) {
        if (isHousemaster) {
            console.log("[QuizView] 📡 Pulse received from", data.fromName);
            handlePulse(data);
        }
    }

    function handleMissionStarted(data) {
        console.log("[QuizView] 🚀 Mission Initialized!", data);
        questions = data.questions;
        gameState = "WAITING";
        startCountDown();
    }

    function startCountDown() {
        countdown = 5;
        const interval = setInterval(() => {
            countdown--;
            if (countdown <= 0) {
                clearInterval(interval);
                countdown = null;
                if (!isHousemaster) {
                    gameState = "QUIZ";
                } else {
                    startGame();
                }
            }
        }, 1000);
    }

    function handleQuizResult(data) {
        if (!isHousemaster) {
            console.log("[QuizView] 📊 Quiz Result:", data);
            const { streak: newStreak, totalScore: newTotal, correct } = data;
            streak = newStreak;
            totalScore = newTotal;

            if (correct) {
                correctCount++;
            }

            currentQuestionIndex =
                (currentQuestionIndex + 1) % questions.length;
            gameState = "QUIZ";
        }
    }

    function updateLeaderboard(data) {
        const { from, fromName, damage } = data;
        if (!leaderboard.has(from)) {
            leaderboard.set(from, { name: fromName, score: 0, shots: 0 });
        }
        const entry = leaderboard.get(from);
        entry.score += damage;
        entry.shots += 1;
        leaderboard = leaderboard;
    }

    function handlePulse(data) {
        pulses.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: 0,
            maxRadius: 200,
            opacity: 1,
            color: "#ffffff",
            label: data.fromName,
        });
    }

    function initiateMission() {
        const quiz = quizzes.find((q) => q.id === selectedQuizId);
        if (!quiz) return;

        // Reset host actions for new mission
        powerBoostActive = false;
        shockwaveUses = 3;

        // Step 1: Tell server to start
        websocket.startQuizMission(sessionId, quiz.questions);
    }

    function startGame() {
        gameState = "PLAYING";
        strikes = 0;
        asteroidsDestroyed = 0;
        leaderboard = new Map();
        asteroids = [];
        lasers = [];
        timeLeft = 60;

        const questionCount = 10; // More potential asteroids
        totalAsteroids = (users.length + 1) * questionCount;
        spawnQueue = totalAsteroids;
        lastSpawnTime = Date.now();

        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }

    function endGame() {
        if (isHousemaster) {
            websocket.endQuizMission(sessionId);
        }
    }

    // Host Action Functions
    function togglePowerBoost() {
        powerBoostActive = !powerBoostActive;
        websocket.updateQuizSettings(sessionId, {
            damageMultiplier: powerBoostActive ? 2 : 1,
        });
    }

    function spawnReinforcements(multiplier) {
        const count = Math.max(1, users.length) * multiplier;
        spawnQueue += count;
    }

    function fireShockwave() {
        if (shockwaveUses <= 0) return;
        shockwaveUses--;

        pulses.push({
            x: width / 2,
            y: height / 2,
            radius: 0,
            maxRadius: Math.max(width, height),
            opacity: 1,
            color: "#FBBF24",
            label: "SHOCKWAVE",
        });

        for (const asteroid of asteroids) {
            if (asteroid.destroyed) continue;
            asteroid.hp -= 10;
            if (asteroid.hp <= 0) {
                asteroid.destroyed = true;
                asteroidsDestroyed++;
                createParticles(asteroid.x, asteroid.y, COLORS.asteroid, 10);
            }
        }
    }

    function handleMissionEnded() {
        console.log("[QuizView] 🏁 Mission Ended (Sync)");
        clearInterval(timerInterval);
        gameState = isHousemaster ? "VICTORY" : "FINISHED";
    }

    function submitAnswer(index) {
        if (gameState !== "QUIZ") return;
        gameState = "SUBMITTING";
        websocket.submitQuizAnswer(sessionId, currentQuestion.id, index);
    }

    function handlePulseClick() {
        websocket.sendPulse(sessionId);
    }

    function fireLaser(data) {
        let target = null;
        let minDist = Infinity;

        for (const asteroid of asteroids) {
            if (asteroid.destroyed) continue;
            const dx = asteroid.x - spaceship.x;
            const dy = asteroid.y - spaceship.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                target = asteroid;
            }
        }

        let angle = -Math.PI / 2;

        if (target) {
            angle = Math.atan2(target.y - spaceship.y, target.x - spaceship.x);

            scoringNotifs.push({
                x: spaceship.x + 40,
                y: spaceship.y - 40,
                text: `${data.fromName} +${data.damage}`,
                life: 1.0,
                opacity: 1.0,
            });

            lasers.push({
                x1: spaceship.x,
                y1: spaceship.y,
                x2: target.x,
                y2: target.y,
                life: 1.0,
                color: data.level > 2 ? "#d946ef" : COLORS.laser,
                width: data.level * 2,
            });

            target.hp -= data.damage;
            if (target.hp <= 0 && !target.destroyed) {
                target.destroyed = true;
                asteroidsDestroyed++;
                createParticles(target.x, target.y, COLORS.asteroid, 10);
                createParticles(target.x, target.y, COLORS.accent, 5);
            }
        } else {
            lasers.push({
                x1: spaceship.x,
                y1: spaceship.y,
                x2: spaceship.x + Math.cos(angle) * 1000,
                y2: spaceship.y + Math.sin(angle) * 1000,
                life: 1.0,
                color: COLORS.laser,
                width: 2,
            });
        }

        spaceship.x -= Math.cos(angle) * 5;
        spaceship.y -= Math.sin(angle) * 5;
    }

    function spawnAsteroid() {
        if (spawnQueue <= 0) return;
        spawnQueue--;

        const isHeavy = Math.random() > 0.7;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.max(width, height) / 2 + 100;
        const x = width / 2 + Math.cos(angle) * r;
        const y = height / 2 + Math.sin(angle) * r;

        const vertices = [];
        const baseRadius = isHeavy ? 45 : 25;
        const points = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < points; i++) {
            const a = (Math.PI * 2 * i) / points;
            const radiusVar = baseRadius + Math.random() * (baseRadius * 0.6);
            vertices.push({
                x: Math.cos(a) * radiusVar,
                y: Math.sin(a) * radiusVar,
            });
        }

        asteroids.push({
            x,
            y,
            vx: (spaceship.x - x) * 0.002,
            vy: (spaceship.y - y) * 0.002,
            hp: isHeavy ? 20 : 10,
            maxHp: isHeavy ? 20 : 10,
            isHeavy,
            vertices,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.05,
            destroyed: false,
        });
    }

    function update() {
        if (!isHousemaster) return;

        const now = Date.now();
        let nearest = null;
        let minDist = Infinity;

        if (gameState === "PLAYING" && now - lastSpawnTime > SPAWN_RATE) {
            if (spawnQueue > 0) {
                spawnAsteroid();
                lastSpawnTime = now;
            } else if (asteroids.length === 0) {
                gameState = "VICTORY";
            }
        }

        spaceship.x += (width / 2 - spaceship.x) * 0.05;
        spaceship.y += (height / 2 - spaceship.y) * 0.05;

        for (let i = asteroids.length - 1; i >= 0; i--) {
            const a = asteroids[i];
            if (a.destroyed) {
                asteroids.splice(i, 1);
                continue;
            }

            a.x += a.vx;
            a.y += a.vy;
            a.rotation += a.rotSpeed;

            const distToShip = Math.sqrt(
                (a.x - spaceship.x) ** 2 + (a.y - spaceship.y) ** 2,
            );

            if (distToShip < minDist) {
                minDist = distToShip;
                nearest = a;
            }

            if (distToShip < spaceship.radius + 30) {
                strikes++;
                asteroids.splice(i, 1);
                createParticles(spaceship.x, spaceship.y, "#ef4444", 20);
            }
        }

        if (nearest) {
            const targetAngle = Math.atan2(
                nearest.y - spaceship.y,
                nearest.x - spaceship.x,
            );
            let diff = targetAngle - spaceship.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            spaceship.angle += diff * 0.1;
        } else {
            spaceship.angle += 0.01;
        }

        for (const l of lasers) {
            l.life -= 0.1;
        }
        lasers = lasers.filter((l) => l.life > 0);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) particles.splice(i, 1);
        }

        for (let i = pulses.length - 1; i >= 0; i--) {
            const p = pulses[i];
            p.radius += 5;
            p.opacity -= 0.02;
            if (p.opacity <= 0) pulses.splice(i, 1);
        }

        for (let i = scoringNotifs.length - 1; i >= 0; i--) {
            const s = scoringNotifs[i];
            s.y -= 1;
            s.life -= 0.02;
            s.opacity = s.life;
            if (s.life <= 0) scoringNotifs.splice(i, 1);
        }
    }

    function createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4;
            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                life: 1.0,
                size: Math.random() * 4 + 2,
            });
        }
    }

    function draw() {
        if (!isHousemaster || !ctx) return;

        ctx.fillStyle = COLORS.background;
        ctx.fillRect(0, 0, width, height);

        // Draw Pulses
        ctx.lineWidth = 2;
        for (const p of pulses) {
            ctx.globalAlpha = p.opacity;
            ctx.strokeStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = p.color;
            ctx.font = "14px Inter";
            ctx.textAlign = "center";
            ctx.fillText(p.label, p.x, p.y);
        }
        ctx.globalAlpha = 1.0;

        // Draw Particles
        for (const p of particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        // Draw Lasers
        for (const l of lasers) {
            ctx.globalAlpha = l.life;
            ctx.strokeStyle = l.color;
            ctx.lineWidth = l.width;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(l.x1, l.y1);
            ctx.lineTo(l.x2, l.y2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        // Draw Asteroids
        ctx.fillStyle = COLORS.asteroid;
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2;
        for (const a of asteroids) {
            ctx.save();
            ctx.translate(a.x, a.y);
            ctx.rotate(a.rotation);

            ctx.beginPath();
            const v = a.vertices;
            ctx.moveTo(v[0].x, v[0].y);
            for (let i = 1; i < v.length; i++) {
                ctx.lineTo(v[i].x, v[i].y);
            }
            ctx.closePath();

            if (a.isHeavy) {
                ctx.fillStyle = "#64748b";
                ctx.fill();
                ctx.strokeStyle = "#94a3b8";
            } else {
                ctx.fill();
                ctx.strokeStyle = "#cbd5e1";
            }

            ctx.stroke();

            // HP Bar for heavy asteroids
            if (a.isHeavy && a.hp < a.maxHp) {
                const barWidth = 40;
                ctx.fillStyle = "rgba(0,0,0,0.5)";
                ctx.fillRect(-barWidth / 2, -50, barWidth, 4);
                ctx.fillStyle = "#ef4444";
                ctx.fillRect(
                    -barWidth / 2,
                    -50,
                    barWidth * (a.hp / a.maxHp),
                    4,
                );
            }

            ctx.restore();
        }

        // Draw Spaceship
        ctx.save();
        ctx.translate(spaceship.x, spaceship.y);
        ctx.rotate(spaceship.angle);

        ctx.fillStyle = COLORS.ship;
        ctx.shadowBlur = 15;
        ctx.shadowColor = COLORS.ship;

        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-15, 15);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-15, -15);
        ctx.closePath();
        ctx.fill();

        // Draw Scoring Notifications
        ctx.textAlign = "left";
        ctx.font = "bold 18px Inter";
        for (const s of scoringNotifs) {
            ctx.globalAlpha = s.opacity;
            ctx.fillStyle = COLORS.accent;
            ctx.fillText(s.text, s.x, s.y);
        }
        ctx.globalAlpha = 1.0;

        if (strikes > 0) {
            ctx.strokeStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
        ctx.shadowBlur = 0;
    }

    function loop() {
        if (!isHousemaster) return;
        update();
        draw();
        animationFrame = requestAnimationFrame(loop);
    }
</script>

{#if isHousemaster}
    <!-- HOST VIEW -->
    <div class="quiz-container">
        {#if gameState === "LOBBY"}
            <div class="overlay lobby" in:fade>
                <div class="hero">
                    <h1>ASTEROID DEFENSE</h1>
                    <p class="subtitle">
                        MISSION READINESS: {users.length} OPERATORS CONNECTED
                    </p>
                </div>

                <div class="quiz-selector glass">
                    <h3>SELECT MISSION</h3>
                    <div class="quiz-options">
                        {#each quizzes as quiz}
                            <button
                                class="quiz-opt-btn"
                                class:active={selectedQuizId === quiz.id}
                                on:click={() => (selectedQuizId = quiz.id)}
                            >
                                <div class="opt-name">{quiz.name}</div>
                                <div class="opt-desc">{quiz.description}</div>
                            </button>
                        {/each}
                    </div>
                </div>

                <div class="player-grid">
                    {#each users as user}
                        <div class="player-bubble" transition:scale>
                            <span class="status-dot"></span>
                            {user.name}
                        </div>
                    {/each}
                </div>

                <button
                    class="start-btn"
                    on:click={initiateMission}
                    disabled={users.length === 0}
                >
                    INITIATE MISSION
                </button>
            </div>
        {/if}

        {#if countdown !== null}
            <div
                class="countdown-overlay"
                in:fade={{ duration: 400 }}
                out:fade={{ duration: 400 }}
            >
                {#key countdown}
                    <div
                        class="countdown-number"
                        in:scale={{ start: 4, duration: 900, opacity: 0 }}
                        out:scale={{ start: 0.5, duration: 300, opacity: 0 }}
                    >
                        {countdown}
                    </div>
                {/key}
            </div>
        {/if}

        <canvas bind:this={canvas} class:active={true}></canvas>

        {#if gameState === "PLAYING"}
            <div class="hud">
                <div class="panel left glass">
                    <div class="label">TIME LEFT</div>
                    <div class="value">{timeLeft}s</div>
                </div>
                <div class="panel center">
                    <button class="end-now-btn" on:click={endGame}>
                        FINISH MISSION
                    </button>
                </div>
                <div class="panel right glass">
                    <div class="label">DESTROYED</div>
                    <div class="value success">
                        {asteroidsDestroyed}
                    </div>
                </div>
            </div>

            <!-- Host Action Panel -->
            <div class="actions-panel glass">
                <button
                    class="action-btn power"
                    class:active={powerBoostActive}
                    on:click={togglePowerBoost}
                >
                    <span class="icon">⚡</span>
                    <span class="label">POWER BOOST</span>
                </button>

                <div class="action-group">
                    <button
                        class="action-btn wave"
                        on:click={() => spawnReinforcements(1)}
                    >
                        <span class="icon">🌊</span>
                        <span class="label">WAVE 1</span>
                    </button>
                    <button
                        class="action-btn wave"
                        on:click={() => spawnReinforcements(2)}
                    >
                        <span class="icon">🌊🌊</span>
                        <span class="label">WAVE 2</span>
                    </button>
                </div>

                <button
                    class="action-btn nuke"
                    disabled={shockwaveUses <= 0}
                    on:click={fireShockwave}
                >
                    <span class="icon">💥</span>
                    <span class="label">SHOCKWAVE ({shockwaveUses})</span>
                </button>
            </div>
        {/if}

        {#if gameState === "VICTORY"}
            <div class="overlay victory glass" in:scale>
                <h1>MISSION DEBRIEF</h1>
                <h2 class="result-text">
                    {strikes === 0
                        ? "PERFECT DEFENSE!"
                        : `${strikes} HULL BREACHES`}
                </h2>

                <div class="leaderboard">
                    {#each Array.from(leaderboard.values())
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 5) as player, i}
                        <div class="rank-row">
                            <span class="rank">#{i + 1}</span>
                            <span class="name">{player.name}</span>
                            <span class="score">{player.score} PTS</span>
                        </div>
                    {/each}
                </div>

                <button class="start-btn" on:click={initiateMission}
                    >RE-ENGAGE</button
                >
            </div>
        {/if}
    </div>
{:else}
    <!-- STUDENT VIEW -->
    <div class="quiz-container student">
        {#if countdown !== null}
            <div
                class="countdown-overlay"
                in:fade={{ duration: 400 }}
                out:fade={{ duration: 400 }}
            >
                {#key countdown}
                    <div
                        class="countdown-number"
                        in:scale={{ start: 4, duration: 900, opacity: 0 }}
                        out:scale={{ start: 0.5, duration: 300, opacity: 0 }}
                    >
                        {countdown}
                    </div>
                {/key}
                <div class="countdown-text">READY OPERATOR?</div>
            </div>
        {/if}

        <div class="hud">
            <div class="stat glass">
                <span class="label">HITS</span>
                <span class="value">{correctCount}</span>
            </div>
            <div class="stat glass">
                <span class="label">CREDITS</span>
                <span class="value">{totalScore}</span>
            </div>
        </div>

        {#if gameState === "WAITING"}
            <div class="overlay waiting" in:fade>
                <div class="glass-card">
                    <div class="pulse-icon">📡</div>
                    <h2>SYNCING WITH COMMAND</h2>
                    <p>Awaiting deployment orders from Commander...</p>
                </div>
            </div>
        {:else if gameState === "QUIZ" || gameState === "SUBMITTING"}
            <div class="quiz-area" in:fly={{ y: 50, duration: 400 }}>
                <div class="question-panel glass">
                    <div class="progress-bar">
                        <div
                            class="progress-fill"
                            style="width: {(currentQuestionIndex /
                                questions.length) *
                                100}%"
                        ></div>
                    </div>
                    <h3>{currentQuestion.text}</h3>
                </div>

                <div class="options-grid">
                    {#each currentQuestion.options as option, i}
                        <button
                            class="option-btn glass"
                            on:click={() => submitAnswer(i)}
                            disabled={gameState === "SUBMITTING"}
                        >
                            {option}
                        </button>
                    {/each}
                </div>

                <div class="status-footer">
                    DECIPHERING SIGNAL {currentQuestionIndex + 1} / {questions.length}
                </div>
            </div>
        {:else if gameState === "FINISHED"}
            <div class="overlay finished" in:scale>
                <div class="glass-card">
                    <div class="medal-icon">🏆</div>
                    <h1>MISSION COMPLETE</h1>
                    <div class="final-report">
                        <span class="label">FINAL CREDITS EARNED</span>
                        <span class="value">{totalScore}</span>
                    </div>
                    <p>Wait for commander to re-initialize mission...</p>
                </div>
            </div>
        {/if}

        <button class="pulse-btn" on:click={handlePulseClick}>📡 SIGNAL</button>
    </div>
{/if}

<style>
    .quiz-container {
        width: 100%;
        height: 100%;
        position: relative;
        color: white;
        font-family: "Inter", sans-serif;
        overflow: hidden;
        background: #0f172a;
    }

    .quiz-container.student {
        display: flex;
        flex-direction: column;
        padding: 24px;
        justify-content: center;
        box-sizing: border-box;
    }

    canvas {
        display: block;
        width: 100%;
        height: 100%;
    }

    .overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        width: 90%;
        max-width: 800px;
        z-index: 10;
        padding: 3rem;
        border-radius: 32px;
    }

    .overlay.glass {
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    }

    .subtitle {
        color: rgba(255, 255, 255, 0.5);
        letter-spacing: 3px;
        font-size: 0.8rem;
        font-weight: 600;
        margin-bottom: 2rem;
    }

    h1 {
        font-size: 4rem;
        font-weight: 800;
        margin-bottom: 0.5rem;
        letter-spacing: -2px;
        background: linear-gradient(to right, #4ecdc4, #556270);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    h2 {
        font-size: 1.4rem;
        font-weight: 800;
        letter-spacing: 2px;
        margin: 1rem 0;
    }

    h3 {
        font-size: 1.8rem;
        line-height: 1.4;
        margin: 0;
        font-weight: 700;
        text-align: center;
    }

    p {
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.95rem;
        line-height: 1.6;
    }

    .result-text {
        font-size: 1.5rem;
        color: #4ecdc4;
        letter-spacing: 2px;
        margin-bottom: 2rem;
    }

    .player-grid {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 1rem;
        margin: 2rem 0 3rem 0;
    }

    .player-bubble {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: white;
        padding: 0.6rem 1.2rem;
        border-radius: 20px;
        font-weight: bold;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        gap: 10px;
        backdrop-filter: blur(5px);
    }

    /* Quiz Selector Styling */
    .quiz-selector {
        width: 100%;
        max-width: 600px;
        padding: 2rem;
        margin: 2rem 0;
        text-align: left;
    }

    .quiz-selector h3 {
        font-size: 0.8rem;
        letter-spacing: 3px;
        color: rgba(255, 255, 255, 0.4);
        margin-bottom: 1.5rem;
    }

    .quiz-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .quiz-opt-btn {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 1.5rem;
        border-radius: 16px;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s;
        color: white;
    }

    .quiz-opt-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
    }

    .quiz-opt-btn.active {
        background: rgba(78, 205, 196, 0.1);
        border-color: #4ecdc4;
        box-shadow: 0 0 20px rgba(78, 205, 196, 0.2);
    }

    .opt-name {
        font-weight: 800;
        font-size: 1.1rem;
        margin-bottom: 0.4rem;
    }

    .opt-desc {
        font-size: 0.85rem;
        opacity: 0.5;
        line-height: 1.4;
    }

    .status-dot {
        width: 8px;
        height: 8px;
        background: #4ecdc4;
        border-radius: 50%;
        box-shadow: 0 0 10px #4ecdc4;
    }

    .start-btn {
        background: #4ecdc4;
        color: #0f172a;
        border: none;
        padding: 1.2rem 4rem;
        font-size: 1.5rem;
        font-weight: 900;
        border-radius: 60px;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 3px;
        transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: 0 0 30px rgba(78, 205, 196, 0.3);
    }

    .start-btn:hover:not(:disabled) {
        transform: scale(1.05);
        box-shadow: 0 0 50px rgba(78, 205, 196, 0.6);
    }

    .start-btn:disabled {
        opacity: 0.2;
        cursor: not-allowed;
    }

    /* Countdown Styling */
    .countdown-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(15, 23, 42, 0.8);
        backdrop-filter: blur(10px);
        z-index: 100;
    }

    .countdown-number {
        font-size: 15rem;
        font-weight: 900;
        color: #4ecdc4;
        text-shadow: 0 0 50px rgba(78, 205, 196, 0.5);
    }

    .countdown-text {
        font-size: 1.5rem;
        letter-spacing: 5px;
        color: white;
        margin-top: -2rem;
        opacity: 0.5;
    }

    .end-now-btn {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
        padding: 0.5rem 1rem;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.8rem;
        pointer-events: auto;
    }

    .end-now-btn:hover {
        background: #ef4444;
        color: white;
    }

    .panel.center {
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
    }

    /* Actions Panel Styling */
    .actions-panel {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 1rem 2rem;
        border-radius: 24px;
        z-index: 1000;
        pointer-events: auto;
    }

    .action-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        background: none;
        border: none;
        cursor: pointer;
        color: white;
        transition: all 0.2s;
        opacity: 0.6;
        min-width: 80px;
    }

    .action-btn:hover:not(:disabled) {
        opacity: 1;
        transform: scale(1.1);
    }

    .action-btn:active:not(:disabled) {
        transform: scale(0.95);
    }

    .action-btn:disabled {
        opacity: 0.1;
        cursor: not-allowed;
    }

    .action-btn.active {
        opacity: 1;
    }

    .action-btn .icon {
        font-size: 1.8rem;
    }

    .action-btn .label {
        font-size: 0.65rem;
        font-weight: 800;
        letter-spacing: 1px;
        text-transform: uppercase;
    }

    .action-btn.power.active {
        color: #fbbf24;
        text-shadow: 0 0 15px rgba(251, 191, 36, 0.5);
    }

    .action-btn.nuke:not(:disabled) {
        color: #ef4444;
    }

    .action-group {
        display: flex;
        gap: 1rem;
        padding: 0 1.5rem;
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        border-right: 1px solid rgba(255, 255, 255, 0.1);
    }

    .hud {
        position: fixed;
        top: 12px;
        left: 12px;
        display: flex;
        gap: 8px;
        pointer-events: none;
        z-index: 100;
    }

    .panel.glass {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        padding: 1rem 2rem;
        border-radius: 20px;
        min-width: 150px;
    }

    .stat.glass {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        padding: 6px 16px;
        border-radius: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .label {
        font-size: 0.6rem;
        color: rgba(255, 255, 255, 0.4);
        letter-spacing: 2px;
        font-weight: 800;
        line-height: 1;
        margin-bottom: 2px;
    }

    .panel .label {
        font-size: 0.75rem;
    }

    .value {
        font-size: 1.1rem;
        font-weight: 900;
        color: #4ecdc4;
        line-height: 1;
    }

    .panel .value {
        font-size: 2rem;
    }

    .value.success {
        color: #4ecdc4;
    }

    .leaderboard {
        margin: 2rem 0;
        text-align: left;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 16px;
        padding: 10px;
    }

    .rank-row {
        display: flex;
        justify-content: space-between;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        font-size: 1.2rem;
    }

    .rank-row:last-child {
        border-bottom: none;
    }

    .rank {
        font-weight: 900;
        color: #4ecdc4;
        width: 40px;
    }

    .name {
        flex-grow: 1;
        font-weight: 500;
    }

    .score {
        font-weight: 800;
        color: #4ecdc4;
    }

    .glass-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        padding: 3rem;
        border-radius: 32px;
        max-width: 480px;
        width: 100%;
        text-align: center;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
        margin: 0 auto;
    }

    .pulse-icon,
    .medal-icon {
        font-size: 3.5rem;
        margin-bottom: 1rem;
    }

    .final-report {
        margin: 2rem 0;
        padding: 1.5rem;
        background: rgba(78, 205, 196, 0.1);
        border-radius: 20px;
        border: 1px solid rgba(78, 205, 196, 0.2);
    }

    .final-report .label {
        display: block;
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.4);
        letter-spacing: 2px;
        margin-bottom: 0.5rem;
        font-weight: 700;
    }

    .final-report .value {
        font-size: 3.5rem;
        font-weight: 900;
        color: #4ecdc4;
        line-height: 1;
    }

    .quiz-area {
        max-width: 800px;
        width: 100%;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .question-panel.glass {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(15px);
        padding: 2.5rem;
        border-radius: 28px;
        position: relative;
        overflow: hidden;
    }

    .progress-bar {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.05);
    }

    .progress-fill {
        height: 100%;
        background: #4ecdc4;
        box-shadow: 0 0 10px #4ecdc4;
        transition: width 0.3s ease;
    }

    .options-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
    }

    .option-btn.glass {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        padding: 1.8rem 1.2rem;
        border-radius: 20px;
        color: white;
        font-size: 1.1rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .option-btn:hover:not(:disabled) {
        background: rgba(78, 205, 196, 0.1);
        border-color: #4ecdc4;
        transform: translateY(-4px);
    }

    .option-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .status-footer {
        text-align: center;
        font-size: 0.7rem;
        letter-spacing: 3px;
        color: rgba(255, 255, 255, 0.3);
        font-weight: 700;
    }

    .pulse-btn {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.5);
        padding: 10px 24px;
        border-radius: 40px;
        font-size: 0.8rem;
        font-weight: 800;
        cursor: pointer;
        backdrop-filter: blur(10px);
        transition: all 0.2s;
        text-transform: uppercase;
        letter-spacing: 2px;
        z-index: 100;
    }

    .pulse-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border-color: rgba(255, 255, 255, 0.3);
    }

    .pulse-btn:active {
        transform: translateX(-50%) scale(0.95);
        background: #4ecdc4;
        color: #0f172a;
        box-shadow: 0 0 20px rgba(78, 205, 196, 0.5);
    }

    @media (max-width: 600px) {
        .quiz-container.student {
            padding: 16px;
            padding-top: 80px;
            justify-content: flex-start;
        }

        .options-grid {
            grid-template-columns: 1fr;
            gap: 12px;
        }

        h1 {
            font-size: 2.5rem;
        }

        h3 {
            font-size: 1.4rem;
        }

        .question-panel.glass {
            padding: 1.5rem;
        }

        .glass-card {
            padding: 2rem;
        }

        .hud {
            width: calc(100% - 24px);
            justify-content: center;
        }
    }
</style>
