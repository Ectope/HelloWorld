/**
 * Cardiac Pacing Simulator
 * Educational tool for ICU nursing and junior doctor training
 */

class CardiacPacingSimulator {
    constructor() {
        // Canvas setup
        this.ecgCanvas = document.getElementById('ecgCanvas');
        this.artCanvas = document.getElementById('artCanvas');
        this.ecgCtx = this.ecgCanvas.getContext('2d');
        this.artCtx = this.artCanvas.getContext('2d');

        // Timing
        this.lastTimestamp = 0;
        this.ecgPosition = 0;
        this.artPosition = 0;

        // Waveform data buffers
        this.ecgBuffer = [];
        this.artBuffer = [];

        // Pacemaker settings
        this.settings = {
            power: true,
            mode: 'VVI',
            rate: 70,
            aOutput: 5.0,
            vOutput: 5.0,
            aSensitivity: 2.0,
            vSensitivity: 2.0,
            avDelay: 150
        };

        // Patient/scenario settings
        this.patient = {
            rhythm: 'complete_hb',
            intrinsicRate: 35,
            captureThreshold: 2.0,
            sysBP: 120,
            diaBP: 80,
            failureToCapture: false,
            failureToSense: false,
            oversensing: false,
            leadDisplacement: false
        };

        // Cardiac cycle state
        this.cardiacState = {
            lastAtrialBeat: 0,
            lastVentBeat: 0,
            lastPacedAtrial: 0,
            lastPacedVent: 0,
            atrialPaceScheduled: false,
            ventPaceScheduled: false,
            currentPhase: 'diastole',
            intrinsicPWave: false,
            intrinsicQRS: false,
            avConducted: false,
            beatCount: 0,
            wenckebachCount: 0
        };

        // Animation state
        this.animationId = null;
        this.currentTime = 0;

        // Indicator flash timers
        this.indicatorTimers = {
            atrial: null,
            vent: null,
            sense: null
        };

        this.init();
    }

    init() {
        this.setupCanvas();
        this.bindEvents();
        this.initializeBuffers();
        this.updatePowerIndicator();
        this.startSimulation();
    }

    setupCanvas() {
        const resizeCanvas = () => {
            const ecgContainer = this.ecgCanvas.parentElement;
            const artContainer = this.artCanvas.parentElement;

            this.ecgCanvas.width = ecgContainer.clientWidth - 10;
            this.ecgCanvas.height = ecgContainer.clientHeight - 30;
            this.artCanvas.width = artContainer.clientWidth - 10;
            this.artCanvas.height = artContainer.clientHeight - 30;

            this.initializeBuffers();
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    initializeBuffers() {
        const ecgLength = this.ecgCanvas.width;
        const artLength = this.artCanvas.width;

        this.ecgBuffer = new Array(ecgLength).fill(0);
        this.artBuffer = new Array(artLength).fill(0);
        this.ecgPosition = 0;
        this.artPosition = 0;
    }

    bindEvents() {
        // Power toggle
        document.getElementById('powerToggle').addEventListener('change', (e) => {
            this.settings.power = e.target.checked;
            this.updatePowerIndicator();
        });

        // Mode selector
        document.getElementById('pacingMode').addEventListener('change', (e) => {
            this.settings.mode = e.target.value;
        });

        // Rate control
        const rateSlider = document.getElementById('rateSlider');
        rateSlider.addEventListener('input', (e) => {
            this.settings.rate = parseInt(e.target.value);
            document.getElementById('rateValue').textContent = this.settings.rate;
            this.updateDialRotation('rateDial', e.target.value, 30, 180);
        });

        // Output controls
        this.bindDialControl('aOutputSlider', 'aOutputValue', 'aOutputDial', 'aOutput', 0.1, 25, 1);
        this.bindDialControl('vOutputSlider', 'vOutputValue', 'vOutputDial', 'vOutput', 0.1, 25, 1);

        // Sensitivity controls
        this.bindDialControl('aSensSlider', 'aSensValue', 'aSensDial', 'aSensitivity', 0.5, 20, 1);
        this.bindDialControl('vSensSlider', 'vSensValue', 'vSensDial', 'vSensitivity', 0.5, 20, 1);

        // AV Delay
        const avDelaySlider = document.getElementById('avDelaySlider');
        avDelaySlider.addEventListener('input', (e) => {
            this.settings.avDelay = parseInt(e.target.value);
            document.getElementById('avDelayValue').textContent = this.settings.avDelay;
            this.updateDialRotation('avDelayDial', e.target.value, 50, 300);
        });

        // Scenario controls
        document.getElementById('rhythmSelect').addEventListener('change', (e) => {
            this.patient.rhythm = e.target.value;
            this.resetCardiacState();
        });

        document.getElementById('intrinsicRateSlider').addEventListener('input', (e) => {
            this.patient.intrinsicRate = parseInt(e.target.value);
            document.getElementById('intrinsicRateValue').textContent = e.target.value;
        });

        document.getElementById('captureThreshold').addEventListener('input', (e) => {
            this.patient.captureThreshold = parseFloat(e.target.value);
            document.getElementById('captureThresholdValue').textContent = parseFloat(e.target.value).toFixed(1);
        });

        // Complications
        document.getElementById('failureToCapture').addEventListener('change', (e) => {
            this.patient.failureToCapture = e.target.checked;
        });

        document.getElementById('failureToSense').addEventListener('change', (e) => {
            this.patient.failureToSense = e.target.checked;
        });

        document.getElementById('oversensing').addEventListener('change', (e) => {
            this.patient.oversensing = e.target.checked;
        });

        document.getElementById('leadDisplacement').addEventListener('change', (e) => {
            this.patient.leadDisplacement = e.target.checked;
        });

        // BP controls
        document.getElementById('sysBP').addEventListener('input', (e) => {
            this.patient.sysBP = parseInt(e.target.value);
        });

        document.getElementById('diaBP').addEventListener('input', (e) => {
            this.patient.diaBP = parseInt(e.target.value);
        });

        // Reset button
        document.getElementById('resetScenario').addEventListener('click', () => {
            this.resetToDefaults();
        });

        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                e.target.classList.add('active');
                document.getElementById(e.target.dataset.tab + 'Tab').classList.remove('hidden');
            });
        });

        // Initialize dial positions
        this.updateDialRotation('rateDial', 70, 30, 180);
        this.updateDialRotation('aOutputDial', 5, 0.1, 25);
        this.updateDialRotation('vOutputDial', 5, 0.1, 25);
        this.updateDialRotation('aSensDial', 2, 0.5, 20);
        this.updateDialRotation('vSensDial', 2, 0.5, 20);
        this.updateDialRotation('avDelayDial', 150, 50, 300);
    }

    bindDialControl(sliderId, valueId, dialId, settingKey, min, max, decimals) {
        const slider = document.getElementById(sliderId);
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.settings[settingKey] = value;
            document.getElementById(valueId).textContent = value.toFixed(decimals);
            this.updateDialRotation(dialId, value, min, max);
        });
    }

    updateDialRotation(dialId, value, min, max) {
        const dial = document.getElementById(dialId);
        if (dial) {
            const knob = dial.querySelector('.dial-knob');
            const percentage = (value - min) / (max - min);
            const rotation = -135 + (percentage * 270); // -135 to 135 degrees
            knob.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        }
    }

    updatePowerIndicator() {
        const indicator = document.getElementById('powerIndicator');
        if (this.settings.power) {
            indicator.classList.add('on');
        } else {
            indicator.classList.remove('on');
        }
    }

    resetCardiacState() {
        this.cardiacState = {
            lastAtrialBeat: this.currentTime,
            lastVentBeat: this.currentTime,
            lastPacedAtrial: 0,
            lastPacedVent: 0,
            atrialPaceScheduled: false,
            ventPaceScheduled: false,
            currentPhase: 'diastole',
            intrinsicPWave: false,
            intrinsicQRS: false,
            avConducted: false,
            beatCount: 0,
            wenckebachCount: 0
        };
    }

    resetToDefaults() {
        // Reset pacemaker settings
        this.settings = {
            power: true,
            mode: 'VVI',
            rate: 70,
            aOutput: 5.0,
            vOutput: 5.0,
            aSensitivity: 2.0,
            vSensitivity: 2.0,
            avDelay: 150
        };

        // Reset patient settings
        this.patient = {
            rhythm: 'complete_hb',
            intrinsicRate: 35,
            captureThreshold: 2.0,
            sysBP: 120,
            diaBP: 80,
            failureToCapture: false,
            failureToSense: false,
            oversensing: false,
            leadDisplacement: false
        };

        // Update UI
        document.getElementById('powerToggle').checked = true;
        document.getElementById('pacingMode').value = 'VVI';
        document.getElementById('rateSlider').value = 70;
        document.getElementById('rateValue').textContent = '70';
        document.getElementById('aOutputSlider').value = 5;
        document.getElementById('aOutputValue').textContent = '5.0';
        document.getElementById('vOutputSlider').value = 5;
        document.getElementById('vOutputValue').textContent = '5.0';
        document.getElementById('aSensSlider').value = 2;
        document.getElementById('aSensValue').textContent = '2.0';
        document.getElementById('vSensSlider').value = 2;
        document.getElementById('vSensValue').textContent = '2.0';
        document.getElementById('avDelaySlider').value = 150;
        document.getElementById('avDelayValue').textContent = '150';
        document.getElementById('rhythmSelect').value = 'complete_hb';
        document.getElementById('intrinsicRateSlider').value = 35;
        document.getElementById('intrinsicRateValue').textContent = '35';
        document.getElementById('captureThreshold').value = 2;
        document.getElementById('captureThresholdValue').textContent = '2.0';
        document.getElementById('failureToCapture').checked = false;
        document.getElementById('failureToSense').checked = false;
        document.getElementById('oversensing').checked = false;
        document.getElementById('leadDisplacement').checked = false;
        document.getElementById('sysBP').value = 120;
        document.getElementById('diaBP').value = 80;

        // Update dial positions
        this.updateDialRotation('rateDial', 70, 30, 180);
        this.updateDialRotation('aOutputDial', 5, 0.1, 25);
        this.updateDialRotation('vOutputDial', 5, 0.1, 25);
        this.updateDialRotation('aSensDial', 2, 0.5, 20);
        this.updateDialRotation('vSensDial', 2, 0.5, 20);
        this.updateDialRotation('avDelayDial', 150, 50, 300);

        this.updatePowerIndicator();
        this.resetCardiacState();
    }

    startSimulation() {
        const animate = (timestamp) => {
            const deltaTime = timestamp - this.lastTimestamp;
            this.lastTimestamp = timestamp;
            this.currentTime += deltaTime;

            this.updateSimulation(deltaTime);
            this.render();

            this.animationId = requestAnimationFrame(animate);
        };

        this.animationId = requestAnimationFrame(animate);
    }

    updateSimulation(deltaTime) {
        const pixelsPerMs = 0.15; // Sweep speed
        const samplesToAdd = Math.floor(deltaTime * pixelsPerMs);

        for (let i = 0; i < samplesToAdd; i++) {
            const ecgValue = this.generateECGSample();
            const artValue = this.generateArtSample();

            this.ecgBuffer[this.ecgPosition] = ecgValue;
            this.artBuffer[this.artPosition] = artValue;

            this.ecgPosition = (this.ecgPosition + 1) % this.ecgBuffer.length;
            this.artPosition = (this.artPosition + 1) % this.artBuffer.length;
        }

        this.updateVitalsDisplay();
    }

    generateECGSample() {
        const time = this.currentTime;
        let value = 0;

        // Calculate intervals
        const pacingInterval = 60000 / this.settings.rate; // ms
        const intrinsicInterval = 60000 / this.patient.intrinsicRate; // ms

        // Get timing since last events
        const timeSinceLastVent = time - this.cardiacState.lastVentBeat;
        const timeSinceLastAtrial = time - this.cardiacState.lastAtrialBeat;
        const timeSinceLastPacedVent = time - this.cardiacState.lastPacedVent;
        const timeSinceLastPacedAtrial = time - this.cardiacState.lastPacedAtrial;

        // Check for oversensing (random inhibition)
        if (this.patient.oversensing && this.settings.power) {
            if (Math.random() < 0.001) { // Random noise detection
                this.flashIndicator('sense');
                // Inhibit pacing briefly
                this.cardiacState.lastVentBeat = time;
                this.cardiacState.lastAtrialBeat = time;
            }
        }

        // Generate intrinsic rhythm based on selected condition
        const intrinsicActivity = this.generateIntrinsicRhythm(time);

        // Process pacing logic
        if (this.settings.power) {
            value = this.processPacingLogic(time, intrinsicActivity, pacingInterval);
        } else {
            // Pacemaker off - only show intrinsic rhythm
            value = intrinsicActivity.ecgValue;
        }

        return value;
    }

    generateIntrinsicRhythm(time) {
        const result = {
            ecgValue: 0,
            hasPWave: false,
            hasQRS: false,
            pWaveTime: 0,
            qrsTime: 0
        };

        const intrinsicInterval = 60000 / this.patient.intrinsicRate;
        const timeSinceLastAtrial = time - this.cardiacState.lastAtrialBeat;
        const timeSinceLastVent = time - this.cardiacState.lastVentBeat;

        switch (this.patient.rhythm) {
            case 'nsr':
                // Normal sinus rhythm
                if (timeSinceLastAtrial >= intrinsicInterval) {
                    result.hasPWave = true;
                    result.pWaveTime = time;
                    this.cardiacState.avConducted = true;
                }
                if (result.hasPWave || (timeSinceLastAtrial >= 0 && timeSinceLastAtrial < 40)) {
                    result.ecgValue += this.generatePWave(timeSinceLastAtrial % intrinsicInterval);
                }
                if (this.cardiacState.avConducted && timeSinceLastAtrial >= 160 && timeSinceLastAtrial < 260) {
                    result.hasQRS = true;
                    result.ecgValue += this.generateQRS(timeSinceLastAtrial - 160);
                }
                if (timeSinceLastAtrial >= 260 && timeSinceLastAtrial < 400) {
                    result.ecgValue += this.generateTWave(timeSinceLastAtrial - 260);
                }
                if (timeSinceLastAtrial >= intrinsicInterval) {
                    this.cardiacState.lastAtrialBeat = time;
                    this.cardiacState.lastVentBeat = time + 160;
                }
                break;

            case 'sinus_brady':
                // Sinus bradycardia - same as NSR but slower
                const bradyInterval = 60000 / 45;
                if (timeSinceLastAtrial >= bradyInterval) {
                    this.cardiacState.lastAtrialBeat = time;
                    this.cardiacState.lastVentBeat = time + 160;
                }
                const bradyPhase = timeSinceLastAtrial % bradyInterval;
                if (bradyPhase < 40) {
                    result.ecgValue += this.generatePWave(bradyPhase);
                    result.hasPWave = true;
                }
                if (bradyPhase >= 160 && bradyPhase < 260) {
                    result.ecgValue += this.generateQRS(bradyPhase - 160);
                    result.hasQRS = true;
                }
                if (bradyPhase >= 260 && bradyPhase < 400) {
                    result.ecgValue += this.generateTWave(bradyPhase - 260);
                }
                break;

            case 'first_degree':
                // First degree AV block - prolonged PR interval (>200ms)
                const firstDegreeInterval = 60000 / this.patient.intrinsicRate;
                if (timeSinceLastAtrial >= firstDegreeInterval) {
                    this.cardiacState.lastAtrialBeat = time;
                    this.cardiacState.lastVentBeat = time + 280; // Prolonged PR
                }
                const fdPhase = timeSinceLastAtrial % firstDegreeInterval;
                if (fdPhase < 40) {
                    result.ecgValue += this.generatePWave(fdPhase);
                    result.hasPWave = true;
                }
                if (fdPhase >= 280 && fdPhase < 380) {
                    result.ecgValue += this.generateQRS(fdPhase - 280);
                    result.hasQRS = true;
                }
                if (fdPhase >= 380 && fdPhase < 520) {
                    result.ecgValue += this.generateTWave(fdPhase - 380);
                }
                break;

            case 'mobitz1':
                // Mobitz I (Wenckebach) - progressive PR prolongation then dropped beat
                const m1Interval = 60000 / this.patient.intrinsicRate;
                if (timeSinceLastAtrial >= m1Interval) {
                    this.cardiacState.lastAtrialBeat = time;
                    this.cardiacState.wenckebachCount = (this.cardiacState.wenckebachCount + 1) % 4;
                    if (this.cardiacState.wenckebachCount < 3) {
                        // Conduct with progressively longer PR
                        const prDelay = 160 + (this.cardiacState.wenckebachCount * 60);
                        this.cardiacState.lastVentBeat = time + prDelay;
                        this.cardiacState.avConducted = true;
                    } else {
                        // Dropped beat
                        this.cardiacState.avConducted = false;
                    }
                }
                const m1Phase = timeSinceLastAtrial % m1Interval;
                if (m1Phase < 40) {
                    result.ecgValue += this.generatePWave(m1Phase);
                    result.hasPWave = true;
                }
                if (this.cardiacState.avConducted) {
                    const prDelay = 160 + ((this.cardiacState.wenckebachCount > 0 ? this.cardiacState.wenckebachCount - 1 : 2) * 60);
                    if (m1Phase >= prDelay && m1Phase < prDelay + 100) {
                        result.ecgValue += this.generateQRS(m1Phase - prDelay);
                        result.hasQRS = true;
                    }
                    if (m1Phase >= prDelay + 100 && m1Phase < prDelay + 240) {
                        result.ecgValue += this.generateTWave(m1Phase - prDelay - 100);
                    }
                }
                break;

            case 'mobitz2':
                // Mobitz II - intermittent dropped beats with constant PR
                const m2Interval = 60000 / this.patient.intrinsicRate;
                if (timeSinceLastAtrial >= m2Interval) {
                    this.cardiacState.lastAtrialBeat = time;
                    this.cardiacState.beatCount++;
                    // 2:1 conduction
                    if (this.cardiacState.beatCount % 2 === 1) {
                        this.cardiacState.lastVentBeat = time + 160;
                        this.cardiacState.avConducted = true;
                    } else {
                        this.cardiacState.avConducted = false;
                    }
                }
                const m2Phase = timeSinceLastAtrial % m2Interval;
                if (m2Phase < 40) {
                    result.ecgValue += this.generatePWave(m2Phase);
                    result.hasPWave = true;
                }
                if (this.cardiacState.avConducted) {
                    if (m2Phase >= 160 && m2Phase < 260) {
                        result.ecgValue += this.generateQRS(m2Phase - 160);
                        result.hasQRS = true;
                    }
                    if (m2Phase >= 260 && m2Phase < 400) {
                        result.ecgValue += this.generateTWave(m2Phase - 260);
                    }
                }
                break;

            case 'complete_hb':
                // Complete heart block - P waves and QRS completely dissociated
                const atrialInterval = 60000 / 70; // Atrial rate ~70
                const ventEscapeInterval = 60000 / this.patient.intrinsicRate; // Ventricular escape

                // P waves at atrial rate
                if (timeSinceLastAtrial >= atrialInterval) {
                    this.cardiacState.lastAtrialBeat = time;
                }
                const chbAtrialPhase = timeSinceLastAtrial % atrialInterval;
                if (chbAtrialPhase < 40) {
                    result.ecgValue += this.generatePWave(chbAtrialPhase);
                    result.hasPWave = true;
                }

                // Ventricular escape at slower rate
                if (timeSinceLastVent >= ventEscapeInterval) {
                    this.cardiacState.lastVentBeat = time;
                }
                const chbVentPhase = timeSinceLastVent % ventEscapeInterval;
                if (chbVentPhase < 100) {
                    result.ecgValue += this.generateQRS(chbVentPhase) * 0.8; // Wider, escape QRS
                    result.hasQRS = chbVentPhase < 20;
                }
                if (chbVentPhase >= 100 && chbVentPhase < 240) {
                    result.ecgValue += this.generateTWave(chbVentPhase - 100);
                }
                break;

            case 'afib_slow':
                // Atrial fibrillation with slow ventricular response
                // Irregular baseline (fibrillatory waves)
                result.ecgValue += (Math.random() - 0.5) * 0.08;

                // Irregular ventricular response
                const afibVentInterval = 60000 / this.patient.intrinsicRate;
                const variability = (Math.random() - 0.5) * 400;
                if (timeSinceLastVent >= afibVentInterval + variability) {
                    this.cardiacState.lastVentBeat = time;
                }
                const afibPhase = timeSinceLastVent % (afibVentInterval + variability);
                if (afibPhase >= 0 && afibPhase < 100) {
                    result.ecgValue += this.generateQRS(afibPhase);
                    result.hasQRS = afibPhase < 20;
                }
                if (afibPhase >= 100 && afibPhase < 240) {
                    result.ecgValue += this.generateTWave(afibPhase - 100);
                }
                break;

            case 'asystole':
                // Asystole - flat line with occasional wandering baseline
                result.ecgValue = (Math.random() - 0.5) * 0.02;
                break;
        }

        return result;
    }

    processPacingLogic(time, intrinsicActivity, pacingInterval) {
        let value = 0;
        const mode = this.settings.mode;
        const timeSinceLastPacedVent = time - this.cardiacState.lastPacedVent;
        const timeSinceLastPacedAtrial = time - this.cardiacState.lastPacedAtrial;
        const timeSinceLastVent = time - this.cardiacState.lastVentBeat;
        const timeSinceLastAtrial = time - this.cardiacState.lastAtrialBeat;

        // Check for sensed intrinsic activity
        const sensedAtrial = intrinsicActivity.hasPWave && !this.patient.failureToSense;
        const sensedVent = intrinsicActivity.hasQRS && !this.patient.failureToSense;

        // Add intrinsic activity to output
        value += intrinsicActivity.ecgValue;

        // Check if capture will occur
        const willCapture = this.checkCapture();

        switch (mode) {
            case 'VOO':
                // Asynchronous ventricular pacing
                if (timeSinceLastPacedVent >= pacingInterval) {
                    value += this.generatePacingSpike('V');
                    this.cardiacState.lastPacedVent = time;
                    this.flashIndicator('vent');
                    if (willCapture) {
                        value += this.generatePacedQRS(0);
                    }
                } else if (timeSinceLastPacedVent > 0 && timeSinceLastPacedVent < 150 && willCapture) {
                    value += this.generatePacedQRS(timeSinceLastPacedVent);
                }
                break;

            case 'AOO':
                // Asynchronous atrial pacing
                if (timeSinceLastPacedAtrial >= pacingInterval) {
                    value += this.generatePacingSpike('A');
                    this.cardiacState.lastPacedAtrial = time;
                    this.flashIndicator('atrial');
                }
                break;

            case 'DOO':
                // Asynchronous dual pacing
                if (timeSinceLastPacedAtrial >= pacingInterval) {
                    value += this.generatePacingSpike('A');
                    this.cardiacState.lastPacedAtrial = time;
                    this.flashIndicator('atrial');
                }
                if (timeSinceLastPacedAtrial >= this.settings.avDelay &&
                    timeSinceLastPacedAtrial < this.settings.avDelay + 10) {
                    value += this.generatePacingSpike('V');
                    this.cardiacState.lastPacedVent = time;
                    this.flashIndicator('vent');
                    if (willCapture) {
                        this.cardiacState.lastVentBeat = time;
                    }
                }
                if (timeSinceLastPacedVent > 0 && timeSinceLastPacedVent < 150 && willCapture) {
                    value += this.generatePacedQRS(timeSinceLastPacedVent);
                }
                break;

            case 'VVI':
                // Ventricular demand pacing
                if (sensedVent) {
                    this.cardiacState.lastVentBeat = time;
                    this.flashIndicator('sense');
                }

                if (timeSinceLastVent >= pacingInterval && timeSinceLastPacedVent >= pacingInterval) {
                    value += this.generatePacingSpike('V');
                    this.cardiacState.lastPacedVent = time;
                    this.flashIndicator('vent');
                    if (willCapture) {
                        this.cardiacState.lastVentBeat = time;
                    }
                }
                if (timeSinceLastPacedVent > 0 && timeSinceLastPacedVent < 150 && willCapture) {
                    value += this.generatePacedQRS(timeSinceLastPacedVent);
                }
                break;

            case 'AAI':
                // Atrial demand pacing
                if (sensedAtrial) {
                    this.cardiacState.lastAtrialBeat = time;
                    this.flashIndicator('sense');
                }

                if (timeSinceLastAtrial >= pacingInterval && timeSinceLastPacedAtrial >= pacingInterval) {
                    value += this.generatePacingSpike('A');
                    this.cardiacState.lastPacedAtrial = time;
                    this.flashIndicator('atrial');
                    this.cardiacState.lastAtrialBeat = time;
                }
                break;

            case 'DDD':
                // Dual chamber pacing
                // Atrial sensing/pacing
                if (sensedAtrial) {
                    this.cardiacState.lastAtrialBeat = time;
                    this.flashIndicator('sense');
                }

                if (timeSinceLastAtrial >= pacingInterval && timeSinceLastPacedAtrial >= pacingInterval) {
                    value += this.generatePacingSpike('A');
                    this.cardiacState.lastPacedAtrial = time;
                    this.cardiacState.lastAtrialBeat = time;
                    this.flashIndicator('atrial');
                }

                // Ventricular sensing/pacing
                if (sensedVent) {
                    this.cardiacState.lastVentBeat = time;
                    this.flashIndicator('sense');
                }

                const timeSinceAtrial = Math.min(timeSinceLastAtrial, timeSinceLastPacedAtrial);
                if (timeSinceAtrial >= this.settings.avDelay &&
                    timeSinceAtrial < this.settings.avDelay + 10 &&
                    timeSinceLastVent >= this.settings.avDelay) {
                    value += this.generatePacingSpike('V');
                    this.cardiacState.lastPacedVent = time;
                    this.flashIndicator('vent');
                    if (willCapture) {
                        this.cardiacState.lastVentBeat = time;
                    }
                }
                if (timeSinceLastPacedVent > 0 && timeSinceLastPacedVent < 150 && willCapture) {
                    value += this.generatePacedQRS(timeSinceLastPacedVent);
                }
                break;
        }

        return value;
    }

    checkCapture() {
        if (this.patient.failureToCapture) {
            return false;
        }
        if (this.patient.leadDisplacement) {
            return Math.random() > 0.7; // Intermittent capture
        }
        return this.settings.vOutput >= this.patient.captureThreshold;
    }

    generatePacingSpike(chamber) {
        // Sharp vertical spike
        return chamber === 'V' ? 1.5 : 0.8;
    }

    generatePWave(phase) {
        // P wave: smooth dome shape, ~80ms duration
        if (phase < 0 || phase > 80) return 0;
        const normalized = phase / 80;
        return 0.15 * Math.sin(normalized * Math.PI);
    }

    generateQRS(phase) {
        // QRS complex: sharp narrow complex ~80-100ms
        if (phase < 0 || phase > 100) return 0;

        if (phase < 20) {
            // Q wave (small negative)
            return -0.1 * Math.sin((phase / 20) * Math.PI);
        } else if (phase < 50) {
            // R wave (tall positive)
            const rPhase = (phase - 20) / 30;
            return 1.0 * Math.sin(rPhase * Math.PI);
        } else if (phase < 80) {
            // S wave (negative)
            const sPhase = (phase - 50) / 30;
            return -0.3 * Math.sin(sPhase * Math.PI);
        } else {
            // Return to baseline
            return 0;
        }
    }

    generatePacedQRS(phase) {
        // Paced QRS: wider, different morphology
        if (phase < 0 || phase > 150) return 0;

        if (phase < 10) {
            return 0; // Brief isoelectric after spike
        } else if (phase < 70) {
            // Wide R wave
            const rPhase = (phase - 10) / 60;
            return 0.9 * Math.sin(rPhase * Math.PI);
        } else if (phase < 120) {
            // ST segment and wide S
            const sPhase = (phase - 70) / 50;
            return -0.2 * Math.sin(sPhase * Math.PI);
        } else {
            return 0;
        }
    }

    generateTWave(phase) {
        // T wave: smooth dome, ~120-160ms duration
        if (phase < 0 || phase > 140) return 0;
        const normalized = phase / 140;
        return 0.25 * Math.sin(normalized * Math.PI);
    }

    generateArtSample() {
        // Arterial waveform based on cardiac activity
        const timeSinceVent = this.currentTime - this.cardiacState.lastVentBeat;
        const beatInterval = 60000 / Math.max(this.settings.rate, this.patient.intrinsicRate);

        if (!this.settings.power && this.patient.rhythm === 'asystole') {
            // No arterial pulsation in asystole without pacing
            return 0.3;
        }

        const phase = (timeSinceVent % beatInterval) / beatInterval;
        const sysBP = this.patient.sysBP;
        const diaBP = this.patient.diaBP;
        const range = sysBP - diaBP;

        let value;
        if (phase < 0.1) {
            // Systolic upstroke
            value = diaBP + range * Math.sin((phase / 0.1) * Math.PI / 2);
        } else if (phase < 0.2) {
            // Peak systole
            value = sysBP;
        } else if (phase < 0.35) {
            // Dicrotic notch
            const notchPhase = (phase - 0.2) / 0.15;
            value = sysBP - range * 0.4 * Math.sin(notchPhase * Math.PI);
            if (notchPhase > 0.4 && notchPhase < 0.6) {
                value += range * 0.1; // Dicrotic wave
            }
        } else {
            // Diastolic decay
            const decayPhase = (phase - 0.35) / 0.65;
            value = diaBP + range * 0.3 * Math.exp(-decayPhase * 3);
        }

        // Normalize to 0-1 range for display
        return (value - 40) / 160;
    }

    flashIndicator(type) {
        const indicators = {
            atrial: 'atrialPaceIndicator',
            vent: 'ventPaceIndicator',
            sense: 'senseIndicator'
        };

        const element = document.getElementById(indicators[type]);
        if (element) {
            element.classList.add('active');

            if (this.indicatorTimers[type]) {
                clearTimeout(this.indicatorTimers[type]);
            }

            this.indicatorTimers[type] = setTimeout(() => {
                element.classList.remove('active');
            }, 100);
        }
    }

    updateVitalsDisplay() {
        // Calculate effective heart rate
        const timeSinceLastBeat = this.currentTime - this.cardiacState.lastVentBeat;
        const effectiveRate = this.settings.power ?
            Math.max(this.settings.rate, this.patient.intrinsicRate) :
            this.patient.intrinsicRate;

        // Update displays
        document.getElementById('hrValue').textContent = effectiveRate;
        document.getElementById('hrDisplay').textContent = `HR: ${effectiveRate} bpm`;

        const sysBP = this.patient.sysBP;
        const diaBP = this.patient.diaBP;
        const map = Math.round(diaBP + (sysBP - diaBP) / 3);

        document.getElementById('bpValue').textContent = `${sysBP}/${diaBP}`;
        document.getElementById('bpDisplay').textContent = `${sysBP}/${diaBP} (${map})`;
        document.getElementById('mapValue').textContent = map;
    }

    render() {
        this.renderECG();
        this.renderArt();
    }

    renderECG() {
        const ctx = this.ecgCtx;
        const width = this.ecgCanvas.width;
        const height = this.ecgCanvas.height;
        const centerY = height / 2;
        const scale = height * 0.35;

        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        this.drawGrid(ctx, width, height, '#0a2a0a', '#0f3f0f');

        // Draw waveform
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < this.ecgBuffer.length; i++) {
            const x = i;
            const bufferIndex = (this.ecgPosition + i) % this.ecgBuffer.length;
            const y = centerY - this.ecgBuffer[bufferIndex] * scale;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();

        // Draw sweep line (eraser)
        const sweepWidth = 20;
        const gradient = ctx.createLinearGradient(this.ecgPosition - sweepWidth, 0, this.ecgPosition, 0);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.ecgPosition - sweepWidth, 0, sweepWidth + 5, height);
    }

    renderArt() {
        const ctx = this.artCtx;
        const width = this.artCanvas.width;
        const height = this.artCanvas.height;
        const scale = height * 0.8;
        const offsetY = height * 0.1;

        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        this.drawGrid(ctx, width, height, '#2a0a0a', '#3f0f0f');

        // Draw waveform
        ctx.strokeStyle = '#f44336';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < this.artBuffer.length; i++) {
            const x = i;
            const bufferIndex = (this.artPosition + i) % this.artBuffer.length;
            const y = height - offsetY - this.artBuffer[bufferIndex] * scale;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();

        // Draw sweep line
        const sweepWidth = 20;
        const gradient = ctx.createLinearGradient(this.artPosition - sweepWidth, 0, this.artPosition, 0);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.artPosition - sweepWidth, 0, sweepWidth + 5, height);
    }

    drawGrid(ctx, width, height, lightColor, darkColor) {
        // Small grid
        ctx.strokeStyle = lightColor;
        ctx.lineWidth = 0.5;
        const smallGrid = 10;

        for (let x = 0; x < width; x += smallGrid) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        for (let y = 0; y < height; y += smallGrid) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Large grid
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 1;
        const largeGrid = 50;

        for (let x = 0; x < width; x += largeGrid) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        for (let y = 0; y < height; y += largeGrid) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }
}

// Initialize simulator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pacingSimulator = new CardiacPacingSimulator();
});
