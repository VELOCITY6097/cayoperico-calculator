import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// ✅ Added updateDoc for the heartbeat logic
import { getFirestore, doc, setDoc, updateDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- GLOBAL STATE ---
let config = null;
let liveHistory = new Array(14).fill(0); // Store last 14 updates for the graph

// --- FIREBASE SETUP ---
let app, auth, db, appId;
try {
    const fbConfigRaw = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
    if (fbConfigRaw) {
        const firebaseConfig = JSON.parse(fbConfigRaw);
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    }
} catch (e) {
    console.warn("Firebase configuration missing or invalid. Online features disabled.");
}

// --- TRAFFIC LOGIC (HEARTBEAT SYSTEM + LIVE GRAPH) ---
async function initTraffic() {
    // 1. Initial State
    setText('header-viewers', "...");
    
    // 2. Graph Buttons (Disabled for now as we only have LIVE data)
    const graphBtns = document.querySelectorAll('.graph-btn');
    graphBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            graphBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // We force 'live' view because we don't have historical database stored yet
            updateGraph(); 
        });
    });

    // 3. Firestore Logic (Sessions)
    if (!db) return;

    try {
        await signInAnonymously(auth);
        
        const sessionId = crypto.randomUUID();

        // Path: artifacts (col) -> [appId] (doc) -> sessions (col)
        const sessionsRef = collection(db, 'artifacts', appId, 'sessions');
        const mySessionDoc = doc(sessionsRef, sessionId);

        // A. Create session with initial lastSeen
        await setDoc(mySessionDoc, {
            joinedAt: Date.now(),
            lastSeen: Date.now(), 
            device: navigator.platform || 'unknown'
        });

        // B. Heartbeat Loop (Update lastSeen every 10 seconds)
        setInterval(async () => {
            try {
                await updateDoc(mySessionDoc, { lastSeen: Date.now() });
            } catch (e) {
                // Silently fail if network is temporarily lost
            }
        }, 10000); 

        // C. Listen and Filter Active Sessions
        onSnapshot(sessionsRef, (snapshot) => {
            const now = Date.now();
            let activeCount = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.lastSeen) {
                    const diff = now - data.lastSeen;
                    // Only count if seen in the last 30 seconds
                    if (diff < 30000) {
                        activeCount++;
                    }
                }
            });

            // Update Header
            setText('header-viewers', activeCount.toString());

            // ✅ UPDATE LIVE GRAPH HISTORY
            // Shift old data out, push new count in
            liveHistory.shift();
            liveHistory.push(activeCount);
            updateGraph();
        });

    } catch (e) {
        console.error("Traffic Error:", e);
        setText('header-viewers', "Offline");
    }
}

// ✅ NEW: Draws real data from liveHistory array
function updateGraph() {
    const container = document.getElementById('visitor-graph');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Calculate max for scaling (min 5 to avoid flat line at 0)
    const maxVal = Math.max(5, ...liveHistory);

    liveHistory.forEach((val, i) => {
        const percent = Math.max(5, (val / maxVal) * 100);
        
        const bar = document.createElement('div');
        bar.className = 'graph-bar';
        bar.style.height = `${percent}%`; 
        bar.title = `${val} Active Users`; 
        
        // Highlight the last bar as "Now"
        if (i === liveHistory.length - 1) {
            bar.style.opacity = '1';
            bar.style.background = 'var(--accent-green)';
        }

        container.appendChild(bar);
    });
}

// --- VOLTLAB SOLVER LOGIC ---
const VoltSolver = {
    init() {
        const solveBtn = document.getElementById('solve-volt');
        if (solveBtn) {
            solveBtn.addEventListener('click', () => this.solve());
        }
    },

    solve() {
        const target = parseInt(document.getElementById('volt-target').value);
        const v1 = parseInt(document.getElementById('volt-val-1').value);
        const v2 = parseInt(document.getElementById('volt-val-2').value);
        const v3 = parseInt(document.getElementById('volt-val-3').value);

        if (isNaN(target) || isNaN(v1) || isNaN(v2) || isNaN(v3)) {
            const status = document.getElementById('volt-solution-status');
            if(status) {
                status.innerText = "INVALID INPUT";
                status.style.color = "var(--alert-red)";
            }
            return;
        }

        const leftNodes = document.querySelectorAll('.left-node');
        if(leftNodes.length >= 3) {
            leftNodes[0].innerText = v1;
            leftNodes[1].innerText = v2;
            leftNodes[2].innerText = v3;
        }

        const multipliers = [1, 2, 10]; 
        const inputs = [v1, v2, v3];
        const result = this.findPermutation(inputs, multipliers, target);

        const status = document.getElementById('volt-solution-status');
        if (result) {
            this.drawSolution(result);
            if(status) {
                status.innerText = "PATH FOUND";
                status.style.color = "var(--accent-green)";
            }
        } else {
            this.clearLines();
            if(status) {
                status.innerText = "NO SOLUTION FOUND";
                status.style.color = "var(--alert-red)";
            }
        }
    },

    findPermutation(inputs, mults, target) {
        const perms = [
            [0, 1, 2], [0, 2, 1],
            [1, 0, 2], [1, 2, 0],
            [2, 0, 1], [2, 1, 0]
        ];

        for (let p of perms) {
            let sum = 0;
            for (let i = 0; i < 3; i++) {
                sum += inputs[i] * mults[p[i]];
            }
            if (sum === target) return p;
        }
        return null;
    },

    drawSolution(mapping) {
        this.clearLines();
        const svg = document.getElementById('hack-svg');
        const board = document.getElementById('hack-board');
        if(!svg || !board) return;

        const boardRect = board.getBoundingClientRect();

        mapping.forEach((rightIdx, leftIdx) => {
            const leftNode = document.querySelectorAll('.left-node')[leftIdx];
            const rightNode = document.querySelectorAll('.right-node')[rightIdx];

            if (leftNode && rightNode) {
                const lRect = leftNode.getBoundingClientRect();
                const rRect = rightNode.getBoundingClientRect();

                const x1 = lRect.right - boardRect.left - 10; 
                const y1 = lRect.top + lRect.height/2 - boardRect.top;
                const x2 = rRect.left - boardRect.left + 10;
                const y2 = rRect.top + rRect.height/2 - boardRect.top;

                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1);
                line.setAttribute('y1', y1);
                line.setAttribute('x2', x2);
                line.setAttribute('y2', y2);
                line.classList.add('active');
                svg.appendChild(line);
            }
        });
    },

    clearLines() {
        const svg = document.getElementById('hack-svg');
        if(svg) {
            while (svg.firstChild) svg.removeChild(svg.firstChild);
        }
    }
};

// --- NAVIGATION LOGIC ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const title = document.getElementById('app-title');
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            document.querySelectorAll('.view-section').forEach(el => {
                el.style.display = 'none'; 
                el.classList.remove('active');
            });
            const targetView = document.getElementById(`view-${view}`);
            if(targetView) {
                targetView.style.display = (view === 'calculator' ? 'grid' : 'block');
                targetView.classList.add('active');
            }

            if(title) title.innerText = item.innerText.trim();
            if(menu) menu.classList.remove('open');
            if(overlay) overlay.classList.remove('active');
        });
    });

    const btn = document.getElementById('hamburger-btn');
    const close = document.getElementById('close-menu');

    function toggle() {
        if(menu) menu.classList.toggle('open');
        if(overlay) overlay.classList.toggle('active');
    }

    if(btn) btn.addEventListener('click', toggle);
    if(close) close.addEventListener('click', toggle);
    if(overlay) overlay.addEventListener('click', toggle);
}

// --- APP INIT ---
async function initApp() {
    try {
        if (typeof window.CONFIG !== 'undefined') {
            config = window.CONFIG;
        } else {
            const response = await fetch('data/targets.json');
            if (!response.ok) throw new Error("Failed to load targets.json");
            config = await response.json();
        }

        populateUI();
        initNavigation();
        initTraffic();
        VoltSolver.init();
        attachListeners();
        calculate();

    } catch (e) {
        console.error(e);
        const aiBox = document.getElementById('ai-output');
        if(aiBox) aiBox.innerHTML = "System Error: Could not load configuration.";
    }
}

function populateUI() {
    const primarySelect = document.getElementById('primary');
    const secondaryContainer = document.getElementById('secondary-inputs');

    if (primarySelect && config.targets.primary) {
        primarySelect.innerHTML = '';
        config.targets.primary.forEach(t => {
            let opt = document.createElement('option');
            opt.value = t.id || t.name; 
            opt.innerText = t.label || t.name; 
            if ((t.id || t.name) === 'pink_diamond') opt.selected = true;
            primarySelect.appendChild(opt);
        });
    }

    if (secondaryContainer && config.targets.secondary) {
        secondaryContainer.innerHTML = '';
        config.targets.secondary.forEach(t => {
            let div = document.createElement('div');
            div.className = 'input-group';
            div.style.marginTop = '10px';
            const id = t.id || t.name;
            div.innerHTML = `
                <label>${t.label || t.name} Stacks Found</label>
                <input type="number" id="count-${id}" min="0" value="0">
            `;
            secondaryContainer.appendChild(div);
        });
    }
}

function attachListeners() {
    document.querySelectorAll('#view-calculator input, #view-calculator select').forEach(el => {
        el.addEventListener('input', calculate);
        el.addEventListener('change', calculate);
    });
}

window.calculate = function() {
    if (!config) return;

    const mode = document.getElementById('mode').value;
    const playersEl = document.getElementById('players');
    const players = Math.max(1, Math.min(4, parseInt(playersEl.value) || 1));
    const primaryId = document.getElementById('primary').value;

    const soloWarning = document.getElementById('solo-warning');
    if(soloWarning) soloWarning.style.display = (players === 1) ? 'block' : 'none';

    const primaryObj = config.targets.primary.find(t => (t.id || t.name) === primaryId);
    if (!primaryObj) return;

    const primaryVal = (typeof primaryObj.value.standard === 'number') 
        ? (mode === 'hard' ? primaryObj.value.hard : primaryObj.value.standard) : 0; 

    // Image Logic
    const imgContainer = document.getElementById('target-img-container');
    if (imgContainer) {
        if (primaryObj.img) imgContainer.innerHTML = `<img src="${primaryObj.img}" class="target-img-real">`;
        else imgContainer.innerHTML = `<span class="target-icon">${primaryObj.emoji || '💎'}</span>`;
    }

    // Logic
    let lootPool = [];
    const priority = ['gold', 'cocaine', 'weed', 'cash', 'paintings'];

    config.targets.secondary.forEach(item => {
        const id = item.id || item.name;
        if (players === 1 && (id === 'gold' || id === 'cash')) return;

        const input = document.getElementById(`count-${id}`);
        const count = input ? (parseInt(input.value) || 0) : 0;
        const avgValue = (item.value.min + item.value.max) / 2;
        
        for(let i=0; i<count; i++) {
            lootPool.push({
                id: id,
                name: item.label || item.name,
                totalValue: avgValue,
                weight: item.full_table_units,
                originalWeight: item.full_table_units,
                pickup_units: item.pickup_units || [],
                priority: priority.indexOf(id)
            });
        }
    });

    lootPool.sort((a, b) => a.priority - b.priority);

    let bags = [];
    for (let i = 0; i < players; i++) {
        bags.push({ id: i + 1, currentWeight: 0, capacity: config.bag_capacity || 1800, value: 0, contents: [] });
    }

    for (let item of lootPool) {
        for (let bag of bags) {
            const spaceLeft = bag.capacity - bag.currentWeight;
            if (spaceLeft <= 10) continue;

            if (item.weight <= spaceLeft) {
                bag.currentWeight += item.weight;
                bag.value += item.totalValue;
                if (item.weight < item.originalWeight) {
                    const info = getClicksAndPercent(item, item.weight, item.originalWeight);
                    bag.contents.push(`<span class="click-info">${item.name}: ${info.text}</span> <span style="font-size:0.8em">(Remainder)</span>`);
                } else {
                    bag.contents.push(`Full Stack of ${item.name}`);
                }
                break;
            } else {
                const weightToTake = spaceLeft;
                const ratio = weightToTake / item.weight;
                const partialVal = item.totalValue * ratio;
                const info = getClicksAndPercent(item, weightToTake, item.originalWeight);
                bag.currentWeight += weightToTake;
                bag.value += partialVal;
                bag.contents.push(`<span class="click-info">${item.name}: ${info.text}</span> <span style="font-size:0.8em">(${info.percent}%)</span>`);
                item.weight -= weightToTake;
                item.totalValue -= partialVal;
            }
        }
    }

    let secondaryTotal = bags.reduce((acc, bag) => acc + bag.value, 0);
    const safeAvg = (config.targets.office_safe.min + config.targets.office_safe.max) / 2;
    const gross = primaryVal + secondaryTotal + safeAvg;
    const fencing = gross * 0.10;
    const pavel = gross * 0.02;
    const net = gross - fencing - pavel;

    setText('val-primary', '$' + Math.round(primaryVal).toLocaleString());
    setText('val-secondary', '$' + Math.round(secondaryTotal).toLocaleString());
    setText('val-safe', '$' + Math.round(safeAvg).toLocaleString());
    setText('val-fencing', '-$' + Math.round(fencing).toLocaleString());
    setText('val-pavel', '-$' + Math.round(pavel).toLocaleString());
    setText('val-net', '$' + Math.round(net).toLocaleString());

    const aiBox = document.getElementById('ai-output');
    const bagsContainer = document.getElementById('bags-container');
    
    if(aiBox && bagsContainer) {
        aiBox.innerHTML = '';
        bagsContainer.innerHTML = '';

        if (secondaryTotal === 0 && lootPool.length === 0 && players > 1) {
            aiBox.innerHTML = "No secondary loot selected.";
        } else if (secondaryTotal === 0 && players === 1 && lootPool.length === 0) {
            aiBox.innerHTML = "No accessible loot. (Gold/Cash restricted in Solo)";
        } else {
            bags.forEach(bag => {
                let html = `<strong>PLAYER ${bag.id} LOADOUT:</strong><ul>`;
                if (bag.contents.length === 0) {
                    html += `<li style="color:#666">- Empty Bag -</li>`;
                } else {
                    bag.contents.forEach(line => html += `<li>${line}</li>`);
                }
                html += `</ul>`;
                aiBox.innerHTML += html;

                const percent = Math.min(100, (bag.currentWeight / bag.capacity) * 100);
                const barHtml = `
                    <div class="bag-wrapper">
                        <div class="bag-label">
                            <span>PLAYER ${bag.id} BAG</span>
                            <span>${Math.round(percent)}%</span>
                        </div>
                        <div class="bag-bar-bg">
                            <div class="bag-bar-fill" style="width: ${percent}%"></div>
                        </div>
                    </div>
                `;
                bagsContainer.insertAdjacentHTML('beforeend', barHtml);
            });
        }
    }
};

function setText(id, text) {
    const el = document.getElementById(id);
    if(el) el.innerText = text;
}

function getClicksAndPercent(item, amountNeeded, fullStackSize) {
    const percentOfStack = Math.min(100, Math.round((amountNeeded / fullStackSize) * 100));
    const pickup_units = item.pickup_units || [];
    let clicks = 1;
    
    if (pickup_units.length > 0) {
        if (amountNeeded >= fullStackSize) {
            clicks = pickup_units.length;
        } else {
            for (let i = 0; i < pickup_units.length; i++) {
                if (pickup_units[i] >= amountNeeded) {
                    clicks = i + 1;
                    break;
                }
            }
        }
    }
    
    if (item.id === 'paintings') return { text: `1 Cut (Full)`, percent: 100 };
    if (amountNeeded >= fullStackSize - 10) return { text: `Full Stack`, percent: 100 };
    return { text: `~${clicks} Grabs`, percent: percentOfStack };
}

window.onload = initApp;
