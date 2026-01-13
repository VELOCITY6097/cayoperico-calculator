// --- CONFIGURATION FILE ---
// Edit this file to update prices, weights, or images.

// We attach to window to ensure visibility in modules
window.CONFIG = {
    // Total capacity of one loot bag
    "bag_capacity": 1800, 
    
    // The order in which the AI prioritizes items
    "priority_order": ['gold', 'cocaine', 'weed', 'cash', 'paintings'],
    
    "targets": {
        "primary": [
            { 
                "id": "tequila", 
                "label": "Sinsimito Tequila", 
                "emoji": "🍾", 
                "img": "assets/tequila.png", 
                "value": { "standard": 630000, "hard": 690000 } 
            },
            { 
                "id": "ruby_necklace", 
                "label": "Ruby Necklace", 
                "emoji": "📿", 
                "img": "assets/Necklace.png",
                "value": { "standard": 700000, "hard": 770000 } 
            },
            { 
                "id": "bearer_bonds", 
                "label": "Bearer Bonds", 
                "emoji": "📄",
                "img": "assets/bond.png", 
                "value": { "standard": 770000, "hard": 850000 } 
            },
            { 
                "id": "pink_diamond", 
                "label": "Pink Diamond", 
                "emoji": "💎", 
                "img": "assets/pink.png",
                "value": { "standard": 1300000, "hard": 1430000 } 
            },
            { 
                "id": "panther_statue", 
                "label": "Panther Statue", 
                "emoji": "🐆", 
                "img": "assets/panther.png",
                "value": { "standard": 1900000, "hard": 2090000 } 
            }
        ],
        "secondary": [
            { 
                "id": "gold", 
                "label": "Gold", 
                "value": { "min": 328333, "max": 333333 }, 
                "full_table_units": 1200, 
                "pickup_units": [100, 300, 400, 600, 800, 1000, 1200] 
            },
            { 
                "id": "cocaine", 
                "label": "Cocaine", 
                "value": { "min": 198000, "max": 202500 }, 
                "full_table_units": 900, 
                "pickup_units": [100, 200, 280, 340, 380, 460, 580, 700, 860, 900] 
            },
            { 
                "id": "weed", 
                "label": "Weed", 
                "value": { "min": 130500, "max": 135000 }, 
                "full_table_units": 675, 
                "pickup_units": [75, 150, 210, 255, 285, 345, 435, 525, 645, 675] 
            },
            { 
                "id": "cash", 
                "label": "Cash", 
                "value": { "min": 78750, "max": 83250 }, 
                "full_table_units": 450, 
                "pickup_units": [50, 100, 140, 170, 190, 230, 290, 350, 430, 450] 
            },
            { 
                "id": "paintings", 
                "label": "Paintings", 
                "value": { "min": 157500, "max": 180000 }, 
                "full_table_units": 900, 
                "pickup_units": [900] 
            }
        ],
        "office_safe": { "min": 50000, "max": 99000 }
    }
};
