// --- HELPER FUNCTIONS ---

// Calculate how many grabs (clicks) needed for a specific amount of loot
function getClicksAndPercent(lootId, amountNeeded, fullStackSize) {
    // Find the loot config
    const item = CONFIG.targets.secondary.find(t => t.id === lootId);
    if (!item) return { text: "Unknown", percent: 0 };

    // 1. Calculate percentage of STACK
    const percentOfStack = Math.min(100, Math.round((amountNeeded / fullStackSize) * 100));

    // 2. Calculate Clicks
    let clicks = 0;
    let found = false;
    
    if (amountNeeded >= fullStackSize) {
            clicks = item.pickup_units.length; // Max clicks
            found = true;
    } else {
        for (let i = 0; i < item.pickup_units.length; i++) {
            if (item.pickup_units[i] >= amountNeeded) {
                clicks = i + 1;
                found = true;
                break;
            }
        }
    }
    
    if (!found) clicks = item.pickup_units.length;

    // Painting is always 1 click (cut)
    if (lootId === 'paintings') return { text: `1 Cut (Full)`, percent: 100 };

    // Formatting text
    if (amountNeeded >= fullStackSize - 10) return { text: `Full Stack`, percent: 100 };
    
    return { text: `~${clicks} Grabs`, percent: percentOfStack };
}

// --- MAIN CALCULATION ---

function calculate() {
    const mode = document.getElementById('mode').value;
    const players = Math.max(1, Math.min(4, parseInt(document.getElementById('players').value) || 1));
    const primaryId = document.getElementById('primary').value;

    // --- Handle Solo Warning ---
    const soloWarning = document.getElementById('solo-warning');
    if (players === 1) {
        soloWarning.style.display = 'block';
    } else {
        soloWarning.style.display = 'none';
    }

    // --- Step A: Primary Value & Image ---
    const primaryObj = CONFIG.targets.primary.find(p => p.id === primaryId);
    const primaryVal = primaryObj.value[mode];
    
    // Update Image
    const imgContainer = document.getElementById('target-img-container');
    if (primaryObj.img) {
        imgContainer.innerHTML = `<img src="${primaryObj.img}" class="target-img-real" alt="${primaryObj.label}">`;
    } else {
        imgContainer.innerHTML = `<span class="target-icon">${primaryObj.emoji}</span>`;
    }

    // --- Step B: AI Optimization ---
    let lootPool = [];
    
    // Create pool based on inputs
    CONFIG.targets.secondary.forEach(item => {
        // SOLO RESTRICTION: Ignore Gold and Cash if 1 player
        if (players === 1 && (item.id === 'gold' || item.id === 'cash')) {
            return;
        }

        const count = parseInt(document.getElementById(`count-${item.id}`).value) || 0;
        const avgValue = (item.value.min + item.value.max) / 2;
        
        for(let i=0; i<count; i++) {
            lootPool.push({
                id: item.id,
                name: item.label,
                totalValue: avgValue,
                weight: item.full_table_units,
                originalWeight: item.full_table_units, // TRACK ORIGINAL SIZE
                priority: CONFIG.priority_order.indexOf(item.id) 
            });
        }
    });

    // SORT: Priority Order from Config
    lootPool.sort((a, b) => a.priority - b.priority);

    // --- Simulate Bags for N Players ---
    // Initialize Bags
    let bags = [];
    for (let i = 0; i < players; i++) {
        bags.push({
            id: i + 1,
            currentWeight: 0,
            capacity: CONFIG.bag_capacity,
            value: 0,
            contents: []
        });
    }

    // Fill Bags
    for (let item of lootPool) {
        let itemPlaced = false;

        // Try to find a bag that fits this item
        for (let bag of bags) {
            const spaceLeft = bag.capacity - bag.currentWeight;
            
            if (spaceLeft <= 10) continue; // Bag basically full

            if (item.weight <= spaceLeft) {
                // Fits completely (or fits the remainder completely)
                bag.currentWeight += item.weight;
                bag.value += item.totalValue;
                
                // CHECK: Is this a full stack or a remainder?
                if (item.weight < item.originalWeight) {
                    // It is a remainder from a previous bag
                    const clickInfo = getClicksAndPercent(item.id, item.weight, item.originalWeight);
                    bag.contents.push(`<span class="click-info">${item.name}: ${clickInfo.text}</span> <span style="font-size:0.8em">(Remainder)</span>`);
                } else {
                    // It is a full stack
                    bag.contents.push(`Full Stack of ${item.name}`);
                }
                
                itemPlaced = true;
                break;
            } else {
                // Fits partially - Calculate exact "clicks"
                const weightToTake = spaceLeft;
                const ratio = weightToTake / item.weight;
                const partialVal = item.totalValue * ratio;
                
                // Get Click Info
                const clickInfo = getClicksAndPercent(item.id, weightToTake, item.originalWeight);

                bag.currentWeight += weightToTake; // Bag now full
                bag.value += partialVal;
                
                bag.contents.push(`<span class="click-info">${item.name}: ${clickInfo.text}</span> <span style="font-size:0.8em">(${clickInfo.percent}%)</span>`);
                
                // Reduce item weight/value for next bag
                item.weight -= weightToTake;
                item.totalValue -= partialVal;
                // Don't break loop, item continues to next bag
            }
        }
    }

    // --- Step C: Totals ---
    let secondaryTotal = bags.reduce((acc, bag) => acc + bag.value, 0);
    const safeAvg = (CONFIG.targets.office_safe.min + CONFIG.targets.office_safe.max) / 2;
    const gross = primaryVal + secondaryTotal + safeAvg;
    const fencing = gross * 0.10;
    const pavel = gross * 0.02;
    const net = gross - fencing - pavel;

    // --- Step D: Update UI ---
    
    // Financials
    document.getElementById('val-primary').innerText = '$' + Math.round(primaryVal).toLocaleString();
    document.getElementById('val-secondary').innerText = '$' + Math.round(secondaryTotal).toLocaleString();
    document.getElementById('val-safe').innerText = '$' + Math.round(safeAvg).toLocaleString();
    document.getElementById('val-fencing').innerText = '-$' + Math.round(fencing).toLocaleString();
    document.getElementById('val-pavel').innerText = '-$' + Math.round(pavel).toLocaleString();
    document.getElementById('val-net').innerText = '$' + Math.round(net).toLocaleString();

    // AI Output Text & Bars
    const aiBox = document.getElementById('ai-output');
    const bagsContainer = document.getElementById('bags-container');
    
    aiBox.innerHTML = '';
    bagsContainer.innerHTML = '';

    if (secondaryTotal === 0 && lootPool.length === 0 && players > 1) {
            aiBox.innerHTML = "No secondary loot selected.";
    } else if (secondaryTotal === 0 && players === 1 && lootPool.length === 0) {
            aiBox.innerHTML = "No accessible loot. (Gold/Cash restricted in Solo)";
    } else {
        // Render per player
        bags.forEach(bag => {
            // 1. Text List
            let html = `<strong>PLAYER ${bag.id} LOADOUT:</strong><ul>`;
            if (bag.contents.length === 0) {
                html += `<li style="color:#666">- Empty Bag -</li>`;
            } else {
                bag.contents.forEach(line => html += `<li>${line}</li>`);
            }
            html += `</ul>`;
            aiBox.innerHTML += html;

            // 2. Visual Bar
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

// --- INITIALIZATION ---

window.onload = function() {
    const primarySelect = document.getElementById('primary');
    const secondaryContainer = document.getElementById('secondary-inputs');

    // Populate Primary Dropdown
    CONFIG.targets.primary.forEach(t => {
        let opt = document.createElement('option');
        opt.value = t.id;
        opt.innerText = t.label;
        if(t.id === 'pink_diamond') opt.selected = true;
        primarySelect.appendChild(opt);
    });

    // Populate Secondary Inputs from Config
    CONFIG.targets.secondary.forEach(t => {
        let div = document.createElement('div');
        div.className = 'input-group';
        div.style.marginTop = '10px';
        div.innerHTML = `
            <label>${t.label} Stacks Found</label>
            <input type="number" id="count-${t.id}" min="0" value="0" oninput="calculate()" onclick="calculate()">
        `;
        secondaryContainer.appendChild(div);
    });

    // Run Initial Calculation
    calculate();
};