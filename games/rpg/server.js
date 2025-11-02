// Co-op RPG Quest - Server Logic

const multer = require("multer");

// Status effect definitions
const STATUS_EFFECTS = {
  stun: {
    id: 'stun',
    name: 'Stunned',
    icon: '💫',
    description: 'Cannot act this turn',
    color: '#fbbf24',
    cancelsAction: true,
    negative: true
  },
  slow: {
    id: 'slow',
    name: 'Slowed',
    icon: '🐌',
    description: 'Reduced speed',
    color: '#60a5fa', 
    speedReduction: 5,
    negative: true
  },
  poison: {
    id: 'poison',
    name: 'Poisoned',
    icon: '☠️',
    description: 'Takes damage over time',
    color: '#a855f7',
    damagePerTurn: 5,
    negative: true
  },
  defense_buff: {
    id: 'defense_buff',
    name: 'Defending',
    icon: '🛡️',
    description: 'Increased defense',
    color: '#22c55e',
    negative: false
  },
  physical_buff: {
    id: 'physical_buff',
    name: 'Empowered',
    icon: '⚔️',
    description: 'Increased physical damage',
    color: '#ef4444',
    physicalDamageBonus: 10,
    negative: false
  },
  magic_buff: {
    id: 'magic_buff',
    name: 'Arcane Power',
    icon: '✨',
    description: 'Increased magic damage',
    color: '#8b5cf6',
    magicDamageBonus: 10,
    negative: false
  },
  damage_buff: {
    id: 'damage_buff',
    name: 'Berserker',
    icon: '💥',
    description: 'Increased all damage',
    color: '#f59e0b',
    physicalDamageBonus: 8,
    magicDamageBonus: 8,
    negative: false
  },
  rage: {
    id: 'rage',
    name: 'Rage',
    icon: '😡',
    description: 'Increased critical strike chance',
    color: '#dc2626',
    critChanceBonus: 50,
    negative: false
  },
  curse: {
    id: 'curse',
    name: 'Cursed',
    icon: '👿',
    description: 'Reduced damage output',
    color: '#7c3aed',
    damageReduction: 0.25, // 25% damage reduction
    negative: true
  },
  vulnerable: {
    id: 'vulnerable',
    name: 'Vulnerable',
    icon: '🎯',
    description: 'Takes increased damage',
    color: '#f97316',
    damageAmplification: 0.5, // 50% increased damage taken
    negative: true
  },
  sunder: {
    id: 'sunder',
    name: 'Sundered',
    icon: '🔨',
    description: 'Reduced defense',
    color: '#94a3b8',
    defenseReduction: true, // Defense reduced by points value
    negative: true
  },
  speed: {
    id: 'speed',
    name: 'Speed',
    icon: '🏃',
    description: 'Increased speed',
    color: '#3b82f6',
    speedBonus: 5,
    negative: false
  },
  haste: {
    id: 'haste',
    name: 'Haste',
    icon: '⚡',
    description: 'Increased initiative speed',
    color: '#22d3ee',
    speedBonus: true, // Speed bonus based on points value
    negative: false
  },
  taunt: {
    id: 'taunt',
    name: 'Taunt',
    icon: '😡',
    description: 'Enemies focus you. Take reduced damage',
    color: '#dc2626',
    negative: false
  },
  thorns: {
    id: 'thorns',
    name: 'Thorns',
    icon: '🌿',
    description: 'Damages attackers',
    color: '#51de35',
    negative: false
  },
  heal: {
    id: 'heal',
    name: 'Heal',
    icon: '🩸',
    description: 'Healing over time',
    color: '#fffc2e',
    negative: false
  },
  lifesteal: {
    id: 'lifesteal',
    name: 'Lifesteal',
    icon: '💉',
    description: 'Heals based on damage',
    color: '#fffc2e',
    negative: false
  },
  healBonus: {
    id: 'healBonus',
    name: 'Healing Bonus',
    icon: '💊',
    description: 'Increased healing done',
    color: '#22c55e',
    negative: false
  },
  healReduction: {
    id: 'healReduction',
    name: 'Wounded',
    icon: '💔',
    description: 'Reduced healing taken',
    color: '#ef4444',
    negative: true
  },
  mark: {
    id: 'mark',
    name: 'Mark',
    icon: '🎯',
    description: 'Marked by a Monk',
    color: '#fffc2e',
    negative: true
  }
};

const PROC_START_OF_COMBAT = 1;
const PROC_END_OF_COMBAT = 2;
const PROC_ANY = 3;
const PROC_AOE_ALLY = 4;
const PROC_AOE_ENEMY = 5;
const PROC_CRIT_ATTACK = 6;
const PROC_HIT_ATTACK = 7;
const PROC_MISS_ATTACK = 8;
const PROC_HIT_HEAL = 9;
const PROC_DODGE_ATTACK = 10;
const PROC_EXECUTE_ATTACK = 11;
const PROC_TAKE_ATTACK = 12;
const PROC_AOE_ANY = 13;
const PROC_STUN = 14;
  const PROC_KILL_ENEMY = 15;

// Proc condition constants
const PROC_CONDITION_SELF_STATUS = 1;
const PROC_CONDITION_TARGET_STATUS = 2;
const PROC_CONDITION_ALL_TARGET_STATUS = 3;
const PROC_CONDITION_TARGET_HEALTH_LESS_THAN = 4;
const PROC_CONDITION_TARGET_HEALTH_GREATER_THAN = 5;
const PROC_CONDITION_TARGET_FULL_HP = 6;
const PROC_CONDITION_SELF_HEALTH_LESS_THAN = 7;
const PROC_CONDITION_SELF_HEALTH_GREATER_THAN = 8;
const PROC_CONDITION_SELF_FULL_HP = 9;
const PROC_CONDITION_MORE_HEALTH = 10;

// Encounter type constants
const ENCOUNTER_TYPE_COMBAT = 'combat';
const ENCOUNTER_TYPE_BOSS = 'boss';
const ENCOUNTER_TYPE_PUZZLE = 'puzzle';
  
  // Class definitions with their unique actions
  const CLASSES = {
    knight: {
      name: 'Knight',
      baseHealth: 120,
      baseDefense: 15,
      actions: [
        { id: 'slash', sound: 'sound_sword', name: 'Slash', damage: 15, damageType: 'physical', hitChanceModifier: 10, type: 'attack', target: 'enemy', animType: 'melee' },
        { id: 'shield_bash', desc: 'Deal $d damage and stun an enemy', usesPerCombat: 2, sound: 'sound_shieldbash', name: 'Shield Bash', damage: 10, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'melee',
          applyStatus: true, duration: 1, statusEffect: 'stun'
         },
        { id: 'defend', animTime: 1200, desc: 'Defense +10 for 2 rounds', name: 'Defend', animTime: 1100, type: 'buff', target: 'self', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'defense_buff', points: 10,
          sound: 'sound_magicbuff'
         },
        { id: 'taunt', desc: 'Force enemies to attack you and reduce damage you take by 30% for 2 rounds', name: 'Taunt', type: 'buff', target: 'self', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'taunt', points: 30,
          sound: 'sound_zap'
        },
        { id: 'charge', sound: 'sound_sword', name: 'Charge', damage: 25, damageType: 'physical', hitChanceModifier: -10, type: 'attack', target: 'enemy', animType: 'melee' },
        { id: 'sunder_armor', desc: '$d damage and Sunder for 2 rounds, reducing armor by 15', sound: 'sound_sword', name: 'Sunder Armor', damage: 10, damageType: 'physical', hitChanceModifier: 5, type: 'attack', target: 'enemy', animType: 'melee',
          applyStatus: true, duration: 2, statusEffect: 'sunder', points: 15,
         },
      ],
      skills: [
        { id: 'whirlwind', sound: 'sound_sword', sprite: 'impact_right', usesPerCombat: 3, desc: 'Deal $d damage to all enemies', name: 'Whirlwind', damage: 10, animTime: 800, damageType: 'physical', type: 'attack', target: 'all_enemies', level: 5, animType: 'spell' },
        { id: 'precision_strike', sound: 'sound_sword', desc: 'Deal $d damage to an enemy next round', name: 'Precision Strike', damage: 35, chargeUp: true, damageType: 'physical', type: 'attack', target: 'enemy', level: 5, animType: 'melee' },
        { id: 'rally', sound: 'sound_heal', sprite: 'defend', level: 10, desc: 'Defense +8 for all allies for 2 rounds', name: 'Rally', type: 'buff', target: 'all_allies', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'defense_buff', points: 8
         },
        { id: 'shieldwall', sound: 'sound_magicbuff', sprite: 'defend', tint: '#5cadbd', level: 10, desc: 'Defense +20 for 2 rounds', name: 'Shield Wall', defense: 20, type: 'buff', target: 'self', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'defense_buff', points: 20
         },    
        { id: 'slam', level: 15, usesPerCombat: 3, desc: 'Deal $d damage and stun an enemy', sound: 'sound_shieldbash', name: 'Slam', damage: 30, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'melee',
          applyStatus: true, duration: 1, statusEffect: 'stun'
         },
        { id: 'execute', sound: 'sound_sword', level: 15, desc: 'Deal $d damage, doubled against enemies below 50% health', sound: 'sound_sword', executeBonus: true, name: 'Execute', damage: 30, damageType: 'physical', stun: true, type: 'attack', target: 'enemy', animType: 'melee' },
      ],
      talents: [
        createTalent('knight_sword_talent', 'Blade Mastery', 'Physical damage +15%', 3, 'rare', '⚔️', '🗡️', { physicalDamage: 15 }, 'weapon'),
        createTalent('knight_armor_talent', 'Shield Mastery', 'Defense +10. Enemies are 30% more likely to attack you', 3, 'rare', '🛡️', '🛡️', { defense: 10, threat: 30 }, 'armor'),
        createTalent('talent_levelup', 'Level Up', 'Gain an additional action per turn', 6, 'rare', '🔥', '🔥', { grantAdditionalActions: 1 }, 'accessory'),
        createTalent('talent_knight_missproc1', 'Defensive Posture', 'Gain +20 Defense for 1 round when missing an attack', 9, 'rare', '🐉', '🐉', { 
          procTrigger: PROC_MISS_ATTACK, procChance: 100, procAction: {
            type: 'buff', target: 'self', animType: 'support',
            applyStatus: true, duration: 1, statusEffect: 'defense_buff', points: 20,
            sprite: 'defend',
            tint: '#fffc2e'
          }
        }, 'accessory'),
        createTalent('talent_knight_missproc2', 'Offensive Posture', 'Gain +20% Physical damage for 2 rounds when missing an attack', 9, 'rare', '🐉', '🐉', { 
          procTrigger: PROC_MISS_ATTACK, procChance: 100, procAction: {
            type: 'buff', target: 'self', animType: 'support',
            applyStatus: true, duration: 2, statusEffect: 'physical_buff', points: 20,
            sprite: 'damagebuff',
            tint: '#fffc2e'
          }
        }, 'accessory'),
        createTalent('talent_knight_crit', 'Executioner', 'Physical damage +10%, crit chance +10%', 12, 'rare', '🛡️', '🛡️', { critChance: 10, physicalDamage: 10 }, 'weapon'),
        createTalent('talent_knight_hp', 'Strength of Giants', 'Health +50', 12, 'rare', '🛡️', '🛡️', { maxHealth: 50 }, 'armor'),
        createTalent('knight_banner_talent', 'Banner of Protection', 'Start of Combat: Allies gain +10 Defense for 2 rounds', 16, 'rare', '🏴', '🏳️', {  }, 'accessory', [
          { procTrigger: PROC_START_OF_COMBAT, procChance: 100, procAction: {
            type: 'buff', target: 'all_allies', animType: 'support',
            applyStatus: true, duration: 2, statusEffect: 'defense_buff', points: 10,
            sprite: 'defend',
            tint: '#fffc2e'
          }}
        ]),
        createTalent('knight_banner_talent1', 'Banner of Conquest', 'Start of Combat: Allies gain +10 Physical Damage for 2 rounds', 16, 'rare', '🏴', '🏳️', {  }, 'accessory', [
          { procTrigger: PROC_START_OF_COMBAT, procChance: 100, procAction: {
            type: 'buff', target: 'all_allies', animType: 'support',
            applyStatus: true, duration: 2, statusEffect: 'physical_buff', points: 10,
            sprite: 'damagebuff',
            tint: '#fffc2e'
          }}
        ]),
        
      ]
    },
    wizard: {
      name: 'Wizard',
      baseHealth: 80,
      baseDefense: 5,
      actions: [
        { id: 'fireball', name: 'Fireball', damage: 25, hitChanceModifier: 10, desc: 'Deal $d damage to an enemy', sound: 'sound_fireball', damageType: 'magic', type: 'attack', target: 'enemy', animType: 'projectile' },
        { id: 'ice_spike', sound: 'sound_explode', usesPerCombat: 2, tint: '#4ef5e4', name: 'Ice Spike', desc: 'Deal $d damage and stun an enemy', damage: 18, damageType: 'magic', type: 'attack', target: 'enemy', animTime: 2600, animType: 'spell',
          applyStatus: true, duration: 1, statusEffect: 'stun'
         },
        { id: 'lightning', sound: 'sound_lightning', name: 'Lightning Bolt', tint: '#d8de35', hitChanceModifier: 25, damage: 50, desc: 'Deal $d damage to an enemy next round', damageType: 'magic', chargeUp: true, type: 'attack', target: 'enemy', animType: 'spell' },
        { id: 'magic_shield', sprite: 'defend', sound: 'sound_magicbuff', animTime: 1100, desc: 'Defense +15 for 2 rounds', name: 'Magic Shield', type: 'buff', target: 'self', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'defense_buff', points: 15
         },
        { id: 'arcane_blast', sound: 'sound_magicimpact', hitChanceModifier: 100, animTime: 2000, name: 'Arcane Blast', desc: 'Deal 15 damage to all enemies', damage: 15, damageType: 'magic', usesPerCombat: 2, type: 'attack', target: 'all_enemies', animType: 'spell' },
        { id: 'mana_restore', sound: 'sound_heal', sprite: 'arcane_blast', tint: '#3cdea2', name: 'Mana Restore', desc: 'Heal $h', heal: 20, type: 'heal', target: 'self', animType: 'support' },
      ],
      skills: [
        { id: 'flamestrike', sound: 'sound_fireball', name: 'Flamestrike', desc: 'Deal $d damage to all enemies', level: 5, damage: 15, damageType: 'magic', type: 'attack', target: 'all_enemies', animType: 'spell', usesPerCombat: 2 },
        { id: 'arcane_power', sound: 'sound_magicbuff', name: 'Arcane Power', desc: 'Magic damage +10 to an ally for 2 rounds', level: 5, magicBuff: true, type: 'buff', target: 'ally', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'magic_buff', points: 10
         },
        { id: 'timestop', sound: 'sound_zap', sprite: 'frost', name: 'Timestop', level: 10, desc: 'Deal $d damage and stun all enemies', damage: 5, damageType: 'magic', type: 'attack', target: 'all_enemies', animTime: 2600, animType: 'spell',
          applyStatus: true, duration: 1, statusEffect: 'stun',
          animTime: 1000,
          hitChanceModifier: -15
         },
        { id: 'spellsurge', sound: 'sound_magicbuff', sprite: 'arcane_power', tint: '#bb5ae8', name: 'Spellsurge', desc: 'Magic damage +20 for 2 rounds', level: 10, magicBuff: true, type: 'buff', target: 'self', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'magic_buff', points: 20
         },
  
      ],
      talents : [
        createTalent('talent_wizard_fireball', 'Fireball Mastery', 'Fireball damage +25%', 3, 'rare', '🔥', '🔥', { 
          abilityBuffs: { 
            fireball: { damage: 25, healing: 0 } 
          } 
        }, 'accessory'),
        createTalent('talent_threat_reduc', 'Fading Image', 'Reduce chance enemies target you by 20%', 3, 'rare', '🔥', '🔥', { threat: -20 }, 'accessory'),
        createTalent('talent_levelup', 'Level Up', 'Gain an additional action per turn', 6, 'rare', '🔥', '🔥', { grantAdditionalActions: 1 }, 'accessory'),
        createTalent('talent_wizard_magicdmg', 'Spell Mastery', 'Magic damage +15%', 9, 'rare', '🔥', '🔥', { magicDamage: 15 }, 'accessory'),
        createTalent('talent_wizard_crit', 'Untold Power', 'Crit chance +15%', 9, 'rare', '🔥', '🔥', { critChance: 15 }, 'accessory'),
        createTalent('talent_wizard_bounce', 'Explosive Force', '20% chance on attack to deal 10 damage to an all enemies', 12, 'rare', '🔥', '🔥', { 
          procTrigger: PROC_HIT_ATTACK, procChance: 20, procAction: {
            type: 'attack', target: 'all_enemies', animType: 'spell', damage: 10, damageType: 'magic',
            sprite: 'flamestrike',
            tint: '#fffc2e'
          }
        }, 'accessory'),
        createTalent('talent_wizard_slow', 'Touch of Frost', 'Damage reduces enemy speed by 8 for 2 rounds', 12, 'rare', '🔥', '🔥', { 
          procTrigger: PROC_HIT_ATTACK, procChance: 100, procAction: {
            type: 'debuff', target: 'enemy', animType: 'spell',
            applyStatus: true, duration: 2, statusEffect: 'slow', points: 8,
            sprite: 'frost',
            tint: '#fffc2e'
          }
        }, 'accessory'),
        createTalent('talent_wizard_coldmaster', 'Cold Mastery', '+2 Ice Spike uses per combat. +25% Ice Spike damage', 16, 'rare', '🔥', '🔥', { 
          abilityBuffs: { 
            ice_spike: { damage: 25 } 
          },
          addBonusUses: {
            ice_spike: 2
          }
        }, 'accessory'),
        createTalent('talent_wizard_opportunist', 'Runic Omen', 'Gain 30% spell damage for 2 rounds when you stun', 16, 'rare', '🔥', '🔥', { 
          procTrigger: PROC_STUN, procChance: 100, procAction: {
            type: 'buff', target: 'self', animType: 'support',
            applyStatus: true, duration: 2, statusEffect: 'magic_buff', points: 30,
            sprite: 'arcane_power',
          }
        }, 'accessory'),
        createTalent('talent_levelup_1', 'Level Up', 'Gain an additional action per turn', 19, 'rare', '🔥', '🔥', { grantAdditionalActions: 1 }, 'accessory'),
        createTalent('talent_wizard_doublefire', 'Dual Flames', 'Fireball strikes 1 additional time', 22, 'rare', '🔥', '🔥', { 
          abilityBuffs: { 
            fireball: { repeats: 1 } 
          },
        }, 'accessory'),
        createTalent('talent_wizard_aoebuff', 'Room Clearer', '+20% Flamestrike & Arcane Blast damage', 22, 'rare', '🔥', '🔥', { 
          abilityBuffs: { 
            flamestrike: { damage: 20 } ,
            arcane_blast: { damage: 20 } 
          },
        }, 'accessory'),
      ]
    },
    cleric: {
      name: 'Cleric',
      baseHealth: 100,
      baseDefense: 10,
      actions: [
        { id: 'heal', sound: 'sound_heal', name: 'Heal', desc: 'Heal $h health to an ally', heal: 25, type: 'heal', target: 'ally', animType: 'support' },
        { id: 'smite', sound: 'sound_bash', desc: 'Deal $d damage to an enemy', name: 'Smite', damage: 18, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'melee' },
        { id: 'prayer', sprite: 'heal', sound: 'sound_heal', desc: 'Heal $h health to all allies', name: 'Desperate Prayer', usesPerCombat: 1, heal: 30, type: 'heal', target: 'all_allies', animType: 'support' },
        { id: 'bless', sound: 'sound_magicbuff', desc: 'Defense +8 to an ally for 2 rounds', tint: '#fffc2e', name: 'Bless', type: 'buff', target: 'ally', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'defense_buff', points: 8
         },
        { id: 'divine_strength', sound: 'sound_magicbuff', tint: '#fffc2e', sprite: 'damagebuff', desc: 'Physical damage +10 to an ally for 2 rounds', name: 'Divine Strength', type: 'buff', target: 'ally', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'physical_buff', points: 10
         },
         { id: 'cleanse', sound: 'sound_heal', sprite: 'sunbeam', desc: 'Remove negative status effects from all allies', name: 'Cleanse', usesPerCombat: 2, cleanseEffect: true, type: 'special', target: 'self', animType: 'support' },
      ],
      skills: [
        { id: 'resurrect', sound: 'sound_heal', sprite: 'sunbeam', usesPerCombat: 1, desc: 'Revive a dead ally with 50% health', name: 'Resurrect', revive: true, type: 'special', target: 'dead_ally', level: 5, animType: 'support' },
        { id: 'holy_light', sound: 'sound_heal', level: 5, desc: 'Deal $d damage to an enemy and heal self for 10', name: 'Holy Light', animTime: 1600, damage: 15, damageType: 'magic', heal: 10, type: 'attack', target: 'enemy', animType: 'spell' },
        { id: 'crusader_aura', level: 10, sound: 'sound_magicbuff',  tint: '#fffc2e', sprite: 'damagebuff', desc:'Physical damage +10 to all allies for 2 rounds', name: 'Crusader Aura', type: 'buff', target: 'all_allies', animType: 'support',
          applyStatus: true, duration: 3, statusEffect: 'physical_buff', points: 10
         },
        { id: 'devotion_aura', level: 10, sound: 'sound_magicbuff', tint: '#fffc2e', sprite: 'bless', desc: 'Defense +12 to all allies for 2 rounds', name: 'Devotion Aura', defense: 12, type: 'buff', target: 'all_allies', animType: 'support',
          applyStatus: true, duration: 3, statusEffect: 'defense_buff', points: 12
         },
        { id: 'greaterheal', level: 15, sound: 'sound_magicbuff', sprite: 'sunbeam', desc: 'Restores 80 health to an ally next round', name: 'Greater Heal', heal: 80, type: 'heal', target: 'ally', animType: 'spell' },
        { id: 'exorcism', level: 15, sound: 'sound_fireball', sprite: 'sunbeam', name: 'Exorcism', type: 'debuff', target: 'two_random_enemies', animType: 'support', desc: 'Mark 2 random enemies to take +50% damage for 3 rounds',
          applyStatus: true, duration: 3, statusEffect: 'vulnerable', points: 50
         },
      ],
      talents: [
        createTalent('talent_cleric_devotion', 'Divine Devotion', 'Healing +20%, Defense +4', 3, 'rare', '✨', '✨', { healingBonus: 20, defense: 4 }, 'accessory'),
        createTalent('talent_cleric_light', 'Blessed Weapon', 'Physical damage +15%', 3, 'rare', '✨', '✨', { physicalDamage: 15 }, 'weapon'),
        createTalent('talent_levelup', 'Level Up', 'Gain an additional action per turn', 6, 'rare', '✨', '✨', { grantAdditionalActions: 1 }, 'accessory'),
        createTalent('talent_cleric_smite', 'Righteousness', 'Smite damage +30%', 9, 'rare', '⚔️', '⚔️', { 
          abilityBuffs: { 
            smite: { damage: 30 } 
          } 
        }, 'weapon'),
        createTalent('talent_cleric_paladin', 'Paladin Oath', 'Attacks have a 50% chance deal 20 bonus Magic Damage while you have a Defense buff', 9, 'rare', '✨', '✨', { 
          procTrigger: PROC_HIT_ATTACK, procChance: 50, procCondition: PROC_CONDITION_SELF_STATUS, procConditionValue: 'defense_buff', procAction: {
            type: 'attack', target: 'enemy', animType: 'spell', damage: 20, damageType: 'magic',
            sprite: 'sunbeam',
            animTime: 1500,
            tint: '#fffc2e',
            sound: 'sound_zap'
          }
        }, 'weapon'),
        createTalent('talent_cleric_stunhammer', 'Hammer of Justice', 'Attacks stun full health enemies', 12, 'rare', '✨', '✨', { 
          procTrigger: PROC_HIT_ATTACK, procChance: 100, procCondition: PROC_CONDITION_TARGET_FULL_HP, procAction: {
            type: 'debuff', target: 'enemy', animType: 'spell', heal: 0, damageType: 'magic',
            sprite: 'sunbeam',
            animTime: 1500,
            tint: '#fffc2e',
            sound: 'sound_bash',
            applyStatus: true, duration: 1, statusEffect: 'stun', points: 50
          }
        }, 'weapon'),
        createTalent('talent_cleric_prayer1', 'Communion', 'Gain 2 additional uses of Desperate Prayer each combat', 12, 'rare', '✨', '✨', { 
          addBonusUses: {
            prayer: 2
          }
        }, 'accessory'),
        createTalent('talent_cleric_healing', 'Greater Restoration', 'Heal, Greater Heal and Prayer healing +25%', 16, 'rare', '✨', '✨', { 
          abilityBuffs: { 
            heal: { healing: 25 },
            prayer: { healing: 25 },
            greaterheal: { healing: 25 }
          } 
        }, 'weapon'),
        createTalent('talent_cleric_holy', 'Judgement', 'Holy Light & Smite damage +40%', 16, 'rare', '✨', '✨', { 
          abilityBuffs: { 
            holy_light: { damage: 40 },
            smite: { damage: 40 } 
          } 
        }, 'weapon'),
        createTalent('talent_cleric_speed', 'First Aid', '+12 speed', 16, 'rare', '✨', '✨', { 
          speed: 12
        }, 'accessory'),
        createTalent('talent_levelup_1', 'Level Up', 'Gain an additional action per turn', 19, 'rare', '✨', '✨', { grantAdditionalActions: 1 }, 'accessory'),
        createTalent('talent_cleric_protection', 'Divine Protection', 'Defense +15, threat +40', 22, 'rare', '🛡️', '🛡️', { defense: 15, threat: 40 }, 'armor'),
        createTalent('talent_cleric_radiance', 'Divine Radiance', 'Healing +30%, Magic damage +20%', 22, 'rare', '✨', '✨', { healingBonus: 30, magicDamage: 20 }, 'weapon'),
        createTalent('talent_cleric_resurrection', 'Master Resurrection', 'Gain an additional use of Resurrect each combat', 26, 'rare', '✨', '✨', { 
          addBonusUses: {
            resurrect: 1
          }
        }, 'accessory'),
        createTalent('talent_cleric_healhammer', 'Hammer of Faith', 'Attacks heal all allies for 12', 26, 'rare', '✨', '✨', { 
          procTrigger: PROC_HIT_ATTACK, procChance: 100, procAction: {
            sprite: 'sunbeam',
            animTime: 1500,
            tint: '#fffc2e',
            sound: 'sound_zap',
            applyStatus: true, duration: 1, statusEffect: 'stun', points: 1
          }
        }, 'weapon'),
        createTalent('talent_cleric_divine_wrath', 'Divine Wrath', 'Healing an ally below 50% health deals 30 magic damage to a random enemy', 29, 'rare', '✨', '✨', { 
          procTrigger: PROC_HIT_HEAL, procChance: 100, procCondition: PROC_CONDITION_TARGET_HEALTH_LESS_THAN, procConditionValue: 50, procAction: {
            type: 'attack', target: 'random_enemy', animType: 'spell', damage: 30, damageType: 'magic',
            sprite: 'sunbeam',
            animTime: 1500,
            tint: '#fffc2e'
          }
        }, 'weapon'),
      ]
    },
    rogue: {
      name: 'Rogue',
      baseHealth: 90,
      baseDefense: 12,
      actions: [
        { id: 'backstab', sound: 'sound_sword', name: 'Backstab', desc: '$d damage, doubled against full health enemies', fullHpBonus: true, damage: 30, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'melee' },
        { id: 'poison', sound: 'sound_magicimpact', desc: '$d damage for 3 rounds to an enemy', tint: '#51de35', animTime: 2200, name: 'Poison', damage: 15, damageType: 'magic', type: 'attack', target: 'enemy', animType: 'spell',
          applyStatus: true, duration: 2, statusEffect: 'poison', points: 15
         },
        { id: 'evade', sound: 'sound_magicbuff', name: 'Evade', type: 'buff', target: 'self', animType: 'support', desc: 'Defense +20 for 2 rounds',
          applyStatus: true, duration: 2, statusEffect: 'defense_buff', points: 20
        },
        { id: 'smoke_bomb', sound: 'sound_magicimpact', name: 'Smoke Bomb', desc: 'Defense +15 for all allies for 2 rounds', type: 'buff', target: 'all_allies', animType: 'support',
          applyStatus: true, duration: 2, usesPerCombat: 1, statusEffect: 'defense_buff', points: 15
         },
         { id: 'quick_strike', desc: '$d damage', sound: 'sound_sword', name: 'Quick Strike', damage: 12, hitChanceModifier: 50, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'melee' },
         { id: 'expose', desc: '$d damage and Sunder for 2 rounds, reducing Defense by 10', sound: 'sound_sword', name: 'Expose', damage: 8, hitChanceModifier: 20, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'melee',
          applyStatus: true, duration: 2, statusEffect: 'sunder', points: 10,
          }
        ],
      skills: [
        { id: 'cheap_shot', level: 5, usesPerCombat: 2, sound: 'sound_bash', name: 'Cheap Shot', damage: 12, hitChanceModifier: 100, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'melee',
          applyStatus: true, duration: 2, statusEffect: 'stun',
          desc: 'Stun an enemy for 2 rounds and deal $d damage'
         },
        { id: 'poison_bomb', sound: 'sound_magicimpact', level: 5, desc: '$d damage for 3 rounds to all enemies', name: 'Poison Bomb', damageType: 'magic', tint: '#51de35', sprite: 'poison', type: 'attack', target: 'all_enemies', animType: 'spell',
          applyStatus: true, duration: 2, statusEffect: 'poison', points: 15
         },
        { id: 'spot_weakness', level: 10, sound: 'sound_zap', name: 'Spot Weakness', type: 'debuff', target: 'enemy', animType: 'support', desc: 'Mark enemy to take +50% damage for 3 rounds',
          applyStatus: true, duration: 3, statusEffect: 'vulnerable', points: 50
         },
        { id: 'assassinate', sound: 'sound_sword', level: 10, name: 'Assassinate', desc: 'Deal $d damage to an enemy, doubled if they are below 50% health', damage: 25, damageType: 'physical', executeBonus: true, type: 'attack', target: 'enemy', animType: 'melee' },
        { id: 'fanofknives', sound: 'sound_sword', level: 15, name: 'Fan of Knives', desc: 'Deal $d damage to all enemies', damage: 15, damageType: 'physical', type: 'attack', target: 'all_enemies', animType: 'melee' },
        { id: 'deadlypoison', sound: 'sound_magicimpact', level: 15, sprite: 'poison', tint: '#bf0dbf', name: 'Deadly Poison', desc: '$d damage for 3 rounds to an enemy', damage: 30, damageType: 'magic', type: 'attack', target: 'enemy', animType: 'cast',
          applyStatus: true, duration: 3, statusEffect: 'poison', points: 30
         }
      ],
      talents: [
        createTalent('talent_knives', 'Knife Mastery', 'Physical damage +15%', 3, 'rare', '🔥', '🔥', { physicalDamage: 15 }, 'weapon'),
        createTalent('talent_initiative', 'Initiative', '+8 speed', 3, 'rare', '🔥', '🔥', { speed: 8 }, 'weapon'),
        createTalent('talent_levelup', 'Level Up', 'Gain an additional action per turn', 6, 'rare', '🔥', '🔥', { grantAdditionalActions: 1 }, 'accessory'),
        createTalent('rogue_executioner', 'Toxic Turmoil', '+20% damage against poisoned enemies', 9, 'rare', '🗡️', '🗡️', { 
          statusDamageBonus: { 
            poison: 20  // +25% damage vs poisoned enemies
          } 
        }, 'weapon'),
        createTalent('rogue_poison', 'Excrutiation', 'Poison damage +50%', 9, 'rare', '🗡️', '🗡️', { 
          abilityBuffs: { 
            poison: { damage: 50 },
            poison_bomb: { damage: 50 },
            deadly_poison: { damage: 50 },
          } 
        }, 'weapon'),
        createTalent('rogue_firststrike', 'First Strike', 'Hitting a full health enemy deals 20 bonus damage', 12, 'rare', '🗡️', '🗡️', { 
          procTrigger: PROC_HIT_ATTACK, procChance: 100, procCondition: PROC_CONDITION_TARGET_FULL_HP, procAction: {
            type: 'attack', target: 'enemy', animType: 'spell', damage: 20, damageType: 'physical',
            sprite: 'poison',
            animTime: 1000,
            tint: '#fffc2e'
          }
        }, 'weapon'),
        createTalent('rogue_executioner1', 'Exploitation', '+40% damage against stunned enemies', 12, 'rare', '🗡️', '🗡️', { 
          statusDamageBonus: { 
            stun: 40  // +25% damage vs poisoned enemies
          } 
        }, 'weapon'),
        createTalent('talent_rogue_crit', 'Lethality', '+15% crit chance', 16, 'rare', '🔥', '🔥', { critChance: 15 }, 'weapon'),
        createTalent('talent_rogue_hit', 'Precision', '+25% hit chance', 16, 'rare', '🔥', '🔥', { hitChance: 25 }, 'weapon'),
        createTalent('talent_levelup_1', 'Level Up', 'Gain an additional action per turn', 19, 'rare', '🔥', '🔥', { grantAdditionalActions: 1 }, 'accessory'),
        createTalent('talent_rogue_stealth', 'Stealth', 'Reduce chance enemies target you by 30%', 22, 'rare', '🔥', '🔥', { threat: -30 }, 'accessory'),
        createTalent('talent_rogue_assassin', 'Assassin', 'Physical damage +25%, Magic damage +15%', 22, 'rare', '🔥', '🔥', { physicalDamage: 25, magicDamage: 15 }, 'weapon'),
        createTalent('talent_rogue_backstab', 'Silent Killer', 'Backstab damage +30%', 26, 'rare', '🔥', '🔥', { abilityBuffs: { backstab: { damage: 30 } } }, 'weapon'),
        createTalent('talent_rogue_backstab1', 'Surprise', 'Hit chance +25%, speed +6', 26, 'rare', '🔥', '🔥', { hitChance: 25, speed: 6 }, 'weapon'),
        createTalent('talent_rogue_vanish', 'Vanish', 'Hitting a full health enemy grants +15 Defense for 1 rounds', 29, 'rare', '🗡️', '🗡️', { 
          procTrigger: PROC_HIT_ATTACK, procChance: 100, procCondition: PROC_CONDITION_TARGET_FULL_HP, procAction: {
            type: 'buff', target: 'self', animType: 'support',
            applyStatus: true, duration: 1, statusEffect: 'defense_buff', points: 15,
            sprite: 'defend',
            tint: '#fffc2e'
          }
        }, 'weapon'),
      ]
    },
    archer: {
      name: 'Archer',
      baseHealth: 95,
      baseDefense: 8,
      actions: [
        { id: 'arrow_shot', name: 'Arrow Shot', damage: 20, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'projectile' },
        { id: 'multi_shot', name: 'Multi Shot', damage: 15, damageType: 'physical', type: 'attack', target: 'all_enemies', animType: 'projectile' },
        { id: 'aimed_shot', name: 'Aimed Shot', damage: 20, hitChanceModifier: 25, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'projectile' },
        { id: 'trap', name: 'Trap', damage: 15, damageType: 'physical', stun: true, type: 'attack', target: 'enemy', animType: 'spell' },
        { id: 'retreat', name: 'Retreat', defense: 12, type: 'buff', target: 'self', animType: 'support' },
        { id: 'volley', name: 'Quick Shot', damage: 50, hitChanceModifier: -30, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'projectile' }
      ]
    },
    bard: {
      name: 'Bard',
      baseHealth: 80,
      baseDefense: 10,
      actions: [
        { id: 'riposte', desc: '$d physical damage, doubled against Slowed enemies', name: 'Riposte!', damage: 10, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'attack' },
        { id: 'song_haste', desc: 'Heal all allies for $h and grant 10 Speed for 2 rounds', name: 'Song of Haste', heal: 10, damageType: 'magic', type: 'heal', target: 'all_allies', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'haste', points: 10,
          sprite: 'haste',
          tint: '#ed85d7',
          sound: 'sound_magicbuff',
         },
        { id: 'dispel', desc: '$d magic damage and remove positive status effects', name: 'Antimagic Chord', damage: 10, hitChanceModifier: 25, damageType: 'magic', type: 'attack', target: 'enemy', animType: 'projectile', dispelEffect: true },
        { id: 'sleep', desc: '$d magic damage and stun for 2 rounds', name: 'Song of Sleep', usesPerCombat: 1, damage: 5, hitChanceModifier: 100, damageType: 'magic', stun: true, type: 'attack', target: 'enemy', animType: 'spell', 
          applyStatus: true, duration: 2, statusEffect: 'stun', points: 5,
          sprite: 'sleep',
          tint: '#ed85d7',
          sound: 'sound_magicbuff',
        },
        { id: 'song_heal', desc: 'Heal ally for $h, repeats next round', name: 'Song of Healing', heal: 10, type: 'heal', target: 'ally', animType: 'support',
          sprite: 'heal',
          tint: '#75d962',
          sound: 'sound_zap',
          applyStatus: true, duration: 1, statusEffect: 'heal', points: 10,
        },
        { id: 'song_slow', desc: '$d magic damage and slow by 15 for 2 rounds', name: 'Song of Slowness', damage: 18, hitChanceModifier: 0, damageType: 'magic', type: 'attack', target: 'enemy', animType: 'spell',
          applyStatus: true, duration: 2, statusEffect: 'slow', points: 15,
          sprite: 'slow',
          tint: '#ed85d7',
          sound: 'sound_magicbuff',
         }
      ],
      skills: [
        { id: 'inspire', level: 5, desc: 'Grant all allies +15% physical damage for 3 rounds', name: 'Inspire Courage', type: 'buff', target: 'all_allies', animType: 'support',
          applyStatus: true, duration: 3, statusEffect: 'physical_buff', points: 15,
          sprite: 'damagebuff',
          tint: '#ed85d7',
          sound: 'sound_magicbuff'
         },
        { id: 'discord', level: 5, desc: 'Deal $d damage to all enemies and slow by 10 for 2 rounds', name: 'Song of Discord', damage: 15, damageType: 'magic', type: 'attack', target: 'all_enemies', animType: 'spell',
          applyStatus: true, duration: 2, statusEffect: 'slow', points: 10,
          sprite: 'slow',
          tint: '#ed85d7',
          sound: 'sound_magicimpact'
         },
        { id: 'crescendo', level: 10, usesPerCombat: 2, desc: 'Deal $d damage to an enemy, doubled against slowed enemies', name: 'Crescendo Strike', damage: 30, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'melee',
          sound: 'sound_sword'
         },
        { id: 'rejuvenating_melody', level: 10, desc: 'Heal all allies for $h every round for 3 rounds', name: 'Rejuvenating Melody', type: 'buff', target: 'all_allies', animType: 'support',
          applyStatus: true, duration: 3, statusEffect: 'heal', points: 12,
          sprite: 'heal',
          tint: '#ed85d7',
          sound: 'sound_heal'
         },
        { id: 'charm', level: 15, usesPerCombat: 2, desc: 'Stun an enemy for 2 rounds', name: 'Charm', type: 'attack', target: 'enemy', animType: 'spell',
          applyStatus: true, duration: 2, statusEffect: 'stun',
          sprite: 'sleep',
          tint: '#ed85d7',
          sound: 'sound_magicbuff',
          hitChanceModifier: 100
         },
        { id: 'battle_hymn', level: 15, desc: 'Grant all allies +20 Speed and +15% crit chance for 2 rounds', name: 'Battle Hymn', type: 'buff', target: 'all_allies', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'haste', points: 20,
          sprite: 'haste',
          tint: '#ed85d7',
          sound: 'sound_magicbuff'
         },
      ],
      talents: [
        createTalent('talent_bard_inspiration', 'Inspiring Presence', 'All healing +20%, +5 Speed', 3, 'rare', '🎵', '🎵', { healingBonus: 20, speed: 5 }, 'accessory'),
        createTalent('talent_bard_riposte', 'Perfect Riposte', 'Riposte! damage +30%', 3, 'rare', '🎵', '🎵', { 
          abilityBuffs: { 
            riposte: { damage: 30 } 
          } 
        }, 'weapon'),
        createTalent('talent_levelup', 'Level Up', 'Gain an additional action per turn', 6, 'rare', '🎵', '🎵', { grantAdditionalActions: 1 }, 'accessory'),
        createTalent('talent_bard_slow', 'Maestro of Lethargy', '+50% damage against slowed enemies', 9, 'rare', '🎵', '🎵', { 
          statusDamageBonus: { 
            slow: 50
          } 
        }, 'weapon'),
        createTalent('talent_bard_songpower', 'Resonance', 'Song of Slowness damage +40%, Song of Sleep damage +40%', 9, 'rare', '🎵', '🎵', { 
          abilityBuffs: { 
            song_slow: { damage: 40 },
            sleep: { damage: 40 }
          } 
        }, 'accessory'),
        createTalent('talent_bard_heal_proc', 'Harmonious Recovery', 'Healing an ally grants them +10 Defense for 1 round', 12, 'rare', '🎵', '🎵', { 
          procTrigger: PROC_HIT_HEAL, procChance: 100, procAction: {
            type: 'buff', target: 'ally', animType: 'support',
            applyStatus: true, duration: 1, statusEffect: 'defense_buff', points: 10,
            sprite: 'defend',
            tint: '#ed85d7'
          }
        }, 'accessory'),
        createTalent('talent_bard_haste', 'Quickening Tempo', 'Song of Haste grants +15 Speed instead of +10', 12, 'rare', '🎵', '🎵', { 
          abilityBuffs: { 
            song_haste: { statusEffectPoints: 5 }
          } 
        }, 'accessory'),
        createTalent('talent_bard_magic', 'Arcane Melody', 'Magic damage +20%', 16, 'rare', '🎵', '🎵', { magicDamage: 20 }, 'weapon'),
        createTalent('talent_bard_physical', 'Blade Dancer', 'Physical damage +20%', 16, 'rare', '🎵', '🎵', { physicalDamage: 20 }, 'weapon'),
        createTalent('talent_levelup_1', 'Level Up', 'Gain an additional action per turn', 19, 'rare', '🎵', '🎵', { grantAdditionalActions: 1 }, 'accessory'),
        createTalent('talent_bard_support', 'Master Performer', 'All allies gain +5 Speed permanently', 22, 'rare', '🎵', '🎵', { 
          procTrigger: PROC_START_OF_COMBAT, procChance: 100, procAction: {
            type: 'buff', target: 'all_allies', animType: 'support',
            applyStatus: true, duration: 999, statusEffect: 'haste', points: 5,
            sprite: 'haste',
            tint: '#ed85d7'
          }
        }, 'accessory'),
        createTalent('talent_bard_versatile', 'Versatile Artist', 'Physical damage +15%, Magic damage +15%, Defense +5', 22, 'rare', '🎵', '🎵', { physicalDamage: 15, magicDamage: 15, defense: 5 }, 'accessory'),
        createTalent('talent_bard_dispel', 'Antimagic Mastery', 'Antimagic Chord damage +40% and always dispels', 26, 'rare', '🎵', '🎵', { 
          abilityBuffs: { 
            dispel: { damage: 40 }
          } 
        }, 'weapon'),
        createTalent('talent_bard_crit_slow', 'Discordant Strike', 'Critical hits slow enemies by 10 for 2 rounds', 26, 'rare', '🎵', '🎵', { 
          procTrigger: PROC_CRIT_ATTACK, procChance: 100, procAction: {
            type: 'debuff', target: 'enemy', animType: 'support',
            applyStatus: true, duration: 2, statusEffect: 'slow', points: 10,
            sprite: 'slow',
            tint: '#ed85d7'
          }
        }, 'weapon'),
        createTalent('talent_bard_ultimate', 'Symphony of Power', 'Hitting a slowed enemy deals 25 bonus magic damage', 29, 'rare', '🎵', '🎵', { 
          procTrigger: PROC_HIT_ATTACK, procChance: 100, procCondition: PROC_CONDITION_TARGET_STATUS, procConditionValue: 'slow', procAction: {
            type: 'attack', target: 'enemy', animType: 'spell', damage: 25, damageType: 'magic',
            sprite: 'arcane_power',
            animTime: 1000,
            tint: '#ed85d7'
          }
        }, 'weapon'),
      ]
    },
    druid: {
      name: 'Druid',
      baseHealth: 105,
      baseDefense: 11,
      actions: [
        { id: 'nature_attack', desc: 'Deal $d damage', name: "Nature's Wrath", damage: 18, damageType: 'magic', type: 'attack', target: 'enemy', animType: 'projectile', sound: 'sound_magicimpact' },
        { id: 'heal_nature', desc: 'Heal ally for $h', name: 'Healing Touch', heal: 18, type: 'heal', target: 'ally', animType: 'support',
          sprite: 'heal',
          sound: 'sound_zap',
          tint: '#75d962'
         },
        { id: 'entangle', desc: 'Deal $d damage and stun', usesPerCombat: 3, name: 'Stonebind', damage: 5, damageType: 'magic', hitChanceModifier: 50 , stun: true, type: 'attack', target: 'enemy', animType: 'spell',
          applyStatus: true, duration: 1, statusEffect: 'stun',
          sprite: 'rock',
          sound: 'sound_explode',
          tint: '#75d962'
         },
        { id: 'rejuvenate', desc: 'Heal ally for $h every round for 3 rounds', name: 'Rejuvenate', heal: 8, type: 'buff', target: 'ally', animType: 'support',
          applyStatus: true, duration: 3, statusEffect: 'heal', points: 8,
          sound: 'sound_zap',
          sprite: 'smoke_bomb',
          tint: '#75d962'
         },
         { id: 'poison_1', sound: 'sound_magicimpact', desc: '$d damage for 4 rounds to an enemy', tint: '#51de35', animTime: 2200, name: 'Spider Venom', damage: 8, damageType: 'magic', type: 'attack', target: 'enemy', animType: 'spell',
          applyStatus: true, duration: 3, statusEffect: 'poison', points: 8,
          sprite: 'poison',
         },
         { id: 'rust', sound: 'sound_magicimpact', desc: '$d damage and Sunder for 3 rounds, reducing armor by 12', animTime: 2200, name: 'Rust Metal', damage: 8, damageType: 'magic', type: 'attack', target: 'enemy', animType: 'spell',
          applyStatus: true, duration: 3, statusEffect: 'sunder', points: 12,
          sprite: 'poison',
          tint: '#75d962'
         },
        { id: 'thorns', desc: 'Attackers take $d damage for 3 rounds', damage: 10, damageType: 'magic', name: 'Thorns', type: 'buff', target: 'self', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'thorns', points: 10,
          sprite: 'defend',
          animTime: 1000,
          tint: '#75d962',
          sound: 'sound_magicbuff'
         }
      ],
      skills: [
        { id: 'buff_bear', desc: 'Force enemies to attack you and take half damage for 2 rounds', name: 'Bear Blessing', type: 'buff', target: 'self', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'taunt', points: 25,
          level: 5,
          sprite: 'taunt',
          tint: '#75d962',
          sound: 'sound_magicbuff'
         },
         { id: 'buff_tiger', desc: 'Give ally +25% crit chance for 2 rounds', name: 'Tiger Blessing', type: 'buff', target: 'ally', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'rage', points: 25,
          sound: 'sound_laser',
          sprite: 'frost',
          tint: '#75d962',
          level: 5,
         },
         { id: 'buff_wolf', desc: 'Give all allies 15% lifesteal for 2 rounds', name: 'Wolfpack Blessing', type: 'buff', target: 'self', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'lifesteal', points: 15,
          level: 10,
          sprite: 'poison',
          tint: '#75d962',
          sound: 'sound_magicbuff'
         },
         { id: 'mass_rejuv', desc: 'Heal all allies for $h every round for 3 rounds', name: 'Forest Blessing', type: 'buff', target: 'all_allies', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'heal', points: 15,
          level: 6,
          sprite: 'smoke_bomb',
          tint: '#75d962',
          sound: 'sound_heal'
         },
         { id: 'beast_rage', sound: 'sound_magicbuff', sprite: 'damagebuff', desc: 'Physical damage +50 to an ally for 2 rounds', name: 'Beast Rage', type: 'buff', target: 'ally', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'physical_buff', points: 50,
          level: 10,
          tint: '#75d962',
          sound: 'sound_magicbuff'
         },
         { id: 'hawkeye', desc: 'Mark all enemies to take 50% more damage this round', name: 'Hawkeye', type: 'debuff', target: 'all_enemies', animType: 'support',
          applyStatus: true, duration: 1, statusEffect: 'vulnerable', points: 50,
          level: 15,
          sprite: 'spot_weakness',
          tint: '#75d962',
          sound: 'sound_magicimpact'
         },
      ],
      talents: [
        createTalent('talent_druid_1', 'Vigil', 'Healing Touch grants the target +8 defense that round', 3, 'rare', '🐉', '🐉', { 
          procTrigger: PROC_HIT_HEAL, procChance: 100, procAction: {
            type: 'buff', target: 'ally', animType: 'support',
            applyStatus: true, duration: 1, statusEffect: 'defense_buff', points: 8,
            sprite: 'defend',
            tint: '#75d962'
          }
         }, 'accessory'),
         createTalent('talent_druid_2', 'Greater Wrath', "+15% Nature's Wrath damage", 3, 'rare', '🐉', '🐉', { 
          abilityBuffs: { 
            nature_attack: { damage: 15 } 
          } 
         }, 'accessory'),
        createTalent('talent_levelup', 'Level Up', 'Grants an additional action per turn', 6, 'rare', '🐉', '🐉', { grantAdditionalActions: 1 }, 'accessory'),
        createTalent('talent_druid_3', 'Twin Cobras', "Nature's Wrath strikes 1 additional time", 9, 'rare', '🐉', '🐉', { 
          abilityBuffs: { 
            nature_attack: { repeats: 1 } 
          } 
         }, 'accessory'),
         createTalent('talent_druid_4', 'Wildguard', "+20% healing, +5 defense", 9, 'rare', '🐉', '🐉', { 
          healingBonus: 20,
          defense: 5
         }, 'accessory'),
         createTalent('talent_druid_5', 'Brambles', "Nature's Wrath deals 15 extra damage while you have Thorns", 12, 'rare', '🐉', '🐉', { 
          procTrigger: PROC_HIT_ATTACK, procChance: 100, procCondition: PROC_CONDITION_SELF_STATUS, procConditionValue: 'thorns', procAction: {
            type: 'attack', target: 'enemy', animType: 'spell', damage: 15, damageType: 'magic',
            sprite: 'lightning',
            sound: 'sound_lightning',
            tint: '#75d962'
          }
         }, 'accessory'),
         createTalent('talent_druid_6', 'Siphon', "Gain 15% magic lifesteal", 12, 'rare', '🐉', '🐉', { 
          magicVamp: 15
         }, 'accessory'),
         createTalent('talent_druid_7', 'Treeheart', "+20% healing", 16, 'rare', '🐉', '🐉', { 
          healingBonus: 20
         }, 'accessory'),
         createTalent('talent_druid_8', "Ancestral Protection", "Gain +10 defense for 2 rounds when you take damage", 16, 'rare', '🐉', '🐉', { 
          procTrigger: PROC_TAKE_ATTACK, procChance: 100, procAction: {
            type: 'buff', target: 'self', animType: 'support',
            applyStatus: true, duration: 2, statusEffect: 'defense_buff', points: 10,
            sprite: 'defend',
            tint: '#75d962'
          }
         }, 'accessory'),
         createTalent('talent_levelup1', 'Level Up', 'Gain an additional action per turn', 19, 'rare', '🔮', '🔮', { grantAdditionalActions: 1 }, 'accessory'),
         createTalent('talent_druid_9', "Vile Fangs", "When you crit, Poison all enemies for 10 damage for 2 rounds", 22, 'rare', '🐉', '🐉', { 
          procTrigger: PROC_CRIT_ATTACK, procChance: 100, procAction: {
            type: 'buff', target: 'all_enemies', animType: 'debuff',
            applyStatus: true, duration: 2, statusEffect: 'poison', points: 10,
            sprite: 'poison',
            tint: '#75d962'
          }
         }, 'accessory'),
         createTalent('talent_druid_10', 'Ancient Boon', "+20% healing, +10% hit chance", 22, 'rare', '🐉', '🐉', { 
          healingBonus: 20,
          hitChance: 10
         }, 'accessory'),
      ]
    },/*
    barbarian: {
      name: 'Barbarian',
      baseHealth: 130,
      baseDefense: 12,
      actions: [
        { id: 'wild_strike', name: 'Wild Strike', damage: 35, damageType: 'physical', hitChanceModifier: -25, type: 'attack', target: 'enemy', animType: 'melee' },
        { id: 'cleave', name: 'Cleave', damage: 15, damageType: 'physical', type: 'attack', target: 'two_random_enemies', animType: 'melee' },
        { id: 'rage', name: 'Rage', desc: 'Gain +20% crit chance for 2 rounds', ragebuff: true, type: 'buff', target: 'self', animType: 'support' },
        { id: 'savagery', name: 'Savagery', desc: 'Deal 15 damage to all enemies, then take 10 damage', damage: 15, damageType: 'physical', selfDamage: 10, type: 'attack', target: 'all_enemies', animType: 'melee' },
        { id: 'execute', name: 'Execute', desc: 'Deal 25 damage to an enemy, doubled if they are below 50% health', damage: 25, damageType: 'physical', executeBonus: true, type: 'attack', target: 'enemy', animType: 'melee' }
      ]
    },*/
    warlock: {
      name: 'Warlock',
      baseHealth: 85,
      baseDefense: 8,
      actions: [
        { id: 'cursed_blade', sound: 'sound_sword', name: 'Cursed Blade', desc: 'Deal $d damage and Curse an enemy for 2 rounds, reducing damage by 30%', damage: 15, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'melee',
          applyStatus: true, duration: 2, statusEffect: 'curse', points: 30
         },
         { id: 'hex', sound: 'sound_lightning', name: 'Hex', desc: 'Steal $d health from an enemy', damage: 12, damageType: 'magic', lifesteal: 12, type: 'attack', target: 'enemy', animType: 'spell' },
         { id: 'cripple', sound: 'sound_lightning', name: 'Cripple', desc: 'Reduce all enemy speed by 10 for 3 rounds', damageType: 'magic', type: 'debuff', target: 'all_enemies', animType: 'spell',
          applyStatus: true, duration: 3, statusEffect: 'slow', points: 10
         },
         { id: 'demon_armor', sound: 'sound_magicbuff', name: 'Demon Armor', desc: 'Defense +10 for 2 rounds', defense: 10, type: 'buff', target: 'self', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'defense_buff', points: 10
         },
        { id: 'soulfire', sound: 'sound_fireball', name: 'Soulfire', desc: 'Take 15 damage and deal $d to en enemy', damage: 40, damageType: 'magic', selfDamage: 15, animTime: 2500, type: 'attack', target: 'enemy', animType: 'spell'},
        { id: 'hellfire', sound: 'sound_explode', name: 'Hellfire', desc: 'Deal $d damage to all enemies next round', damage: 15, damageType: 'magic', animTime: 1800, chargeUp: true, type: 'attack', target: 'all_enemies', animType: 'spell' }
      ],
      skills: [
        { id: 'lifedrink', sound: 'sound_heal', level: 5, sprite: 'hex', tint: '#59ed4c', name: 'Lifedrink', desc: 'Heal self for $h', heal: 40, damageType: 'magic', animTime: 2500, type: 'heal', target: 'self', animType: 'spell' },
        { id: 'demonrage', sound: 'sound_magicbuff', level: 5, name: 'Demon Rage', sprite: 'damagebuff', tint: '#d4113b', desc: 'Gain +25% crit chance for 3 rounds', type: 'buff', target: 'ally', animType: 'support',
          applyStatus: true, duration: 3, statusEffect: 'rage', points: 25
         },
        { id: 'twinflame', sound: 'sound_fireball', level: 10, name: 'Twin Flames', sprite: 'flamestrike', tint: '#d69b2d', desc: '$d damage to 2 random enemies', damage: 25, damageType: 'magic', animTime: 2500, type: 'attack', target: 'two_random_enemies', animType: 'spell'},
        { id: 'greater_curse', sound: 'sound_magicimpact', level: 10, sprite: 'hex', tint: '#c42361', name: 'Greater Curse', desc: 'Curse all enemies for 2 rounds, reducing damage by 30%', damage: 0, damageType: 'physical', curse: true, type: 'attack', target: 'enemy', animType: 'spell',
          applyStatus: true, duration: 2, statusEffect: 'curse', points: 30
         },
        { id: 'anihilate', sound: 'sound_explode', level: 15, sprite: 'shadow_bolt', name: 'Annihilate', desc: 'Deal $d damage to a Cursed enemy. Doubled if they are below 50% health.', damage: 30, damageType: 'magic', executeBonus: true, type: 'attack', target: 'enemy', animType: 'spell' },
      ],
      talents: [
        createTalent('talent_warlock_hex', 'Hex Mastery', 'Hex damage +30%', 3, 'rare', '🔮', '🔮', { abilityBuffs: { hex: { damage: 30 } } }, 'accessory'),
        createTalent('talent_warlock_soulfire', 'Soulfire Mastery', 'Soulfire damage +20%', 3, 'rare', '🔮', '🔮', { abilityBuffs: { soulfire: { damage: 30 } } }, 'accessory'),
        createTalent('talent_warlock_gloomblade', 'Gloomblade', 'Deal 15% more damage to Cursed enemies', 3, 'rare', '🗡️', '🗡️', { statusDamageBonus: { curse: 15 } }, 'weapon'),
        createTalent('talent_levelup', 'Level Up', 'Gain an additional action per turn', 6, 'rare', '🔮', '🔮', { grantAdditionalActions: 1 }, 'accessory'),
        createTalent('talent_warlock_crown', 'Hellfire Crown', 'While below 50% health, attacks deal 15 bonus magic damage', 9, 'rare', '🗡️', '🗡️', {
           procTrigger: PROC_HIT_ATTACK, procChance: 100, procCondition: PROC_CONDITION_SELF_HEALTH_LESS_THAN, procConditionValue: 50, procAction: {
            type: 'attack', target: 'enemy', animType: 'spell', damage: 15, damageType: 'magic',
            sprite: 'flamestrike',
            tint: '#fffc2e'
          }
        }, 'armor'),
        createTalent('talent_warlock_hp', 'Demon Robes', '+20 health, +5% magic damage', 9, 'rare', '🔮', '🔮', { maxHealth: 20, magicDamage: 5 }, 'accessory'),
        createTalent('talent_warlock_staff', 'Devil Staff', '+15 magic damage, -15 health', 12, 'rare', '🔮', '🔮', { maxHealth: -15, magicDamage: 15 }, 'accessory'),
        createTalent('talent_warlock_crit', 'Eye of Hell', '+15% crit chance', 12, 'rare', '🔮', '🔮', { critChance: 15 }, 'accessory'),
        createTalent('talent_warlock_crit1', 'Demonfrenzy', 'Start of Combat: Gain +50% crit chance for 2 rounds', 16, 'rare', '🏴', '🏳️', {  }, 'accessory', [
          { procTrigger: PROC_START_OF_COMBAT, procChance: 100, procAction: {
            type: 'buff', target: 'self', animType: 'support',
            applyStatus: true, duration: 2, statusEffect: 'rage', points: 50,
            sprite: 'damagebuff',
            tint: '#d4113b'
          }}
        ]),
        createTalent('talent_levelup1', 'Level Up', 'Gain an additional action per turn', 19, 'rare', '🔮', '🔮', { grantAdditionalActions: 1 }, 'accessory'),

      ]
    },

    monk: {
      name: 'Monk',
      baseHealth: 100,
      baseDefense: 8,
      actions: [
        { id: 'punch', sound: 'sound_bash', name: 'Jab', desc: 'Deal $d damage to an enemy. Marked: Stun', damage: 10, hitChanceModifier: 20, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'melee' },
        { id: 'kick', sound: 'sound_sword', name: 'Leg Sweep', sprite: 'impact_right', tint: '#dede8c', desc: 'Deal $d damage to all enemies. Marked: +50% damage, slow by 10 for 3 rounds', damage: 7, damageType: 'physical', type: 'attack', target: 'all_enemies', animType: 'melee' },
        { id: 'meditate', sound: 'sound_heal', sprite: 'heal', name: 'Grace', desc: 'Heal $h health to an ally every round for 3 rounds', heal: 8, type: 'heal', target: 'all_allies', animType: 'support',
          applyStatus: true, duration: 3, statusEffect: 'heal', points: 8,
          tint: '#dede8c'
         },
        { id: 'pressure_point', sound: 'sound_zap', name: 'Combo Strike', desc: 'Deal $d damage and Mark en enemy for 3 rounds', damage: 5, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'melee',
          applyStatus: true, duration: 3, statusEffect: 'mark'
        },
        { id: 'preparation', sound: 'sound_zap', name: 'Preparation', desc: 'Clear negative status effects and gain +15 Defense for 2 rounds', cleanseEffect: true, type: 'buff', target: 'self', animType: 'spell',
          applyStatus: true, duration: 2, statusEffect: 'defense_buff', points: 15,
          sprite: 'defend',
          tint: '#dede8c'
        },
        { id: 'flurry_of_blows', sound: 'sound_bash', name: 'Flurry of Blows', usesPerCombat: 2, desc: 'Deal $d damage to an enemy, 3 times. Marked: +100% damage', repeats: 2, damage: 8, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'melee' },

      ],
      skills: [
        { id: 'iron_fist', sound: 'sound_bash', name: 'Phoenix Punch', desc: 'Deal $d damage to an enemy next round. Marked: +100% damage', level: 5, damage: 30, chargeUp: true, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'melee' },
        { id: 'dodge', sound: 'sound_magicbuff',usesPerCombat: 1, level: 5, sprite: 'defend', name: 'Dodge', desc: 'Defense +100 for 2 rounds', type: 'buff', target: 'self', animType: 'support',
          applyStatus: true, duration: 2, statusEffect: 'defense_buff', points: 100
        },
        { id: 'zen_focus', sound: 'sound_magicbuff', sprite: 'damagebuff', name: 'Battle Trance', desc: 'Physical damage +15% for 5 rounds', level: 10, type: 'buff', target: 'self', animType: 'support',
          applyStatus: true, duration: 5, statusEffect: 'physical_buff', points: 15,
          sprite: 'damagebuff',
          tint: '#dede8c'
        },
        { id: 'mark_all', sound: 'sound_explode', name: 'Ring of Death', desc: 'Mark all enemies for 3 rounds', level: 15, type: 'debuff', target: 'eneall_enemies', animType: 'spell',
          applyStatus: true, duration: 3, statusEffect: 'mark', points: 50,
          sprite: 'spot_weakness',
          tint: '#dede8c'
        },
        { id: 'perfect_form', sound: 'sound_magicbuff', sprite: 'defend', name: 'Perfect Form', desc: 'Defense +25 and heal $h for 3 rounds', level: 15, heal: 15, type: 'buff', target: 'self', animType: 'support',
          applyStatus: true, duration: 3, statusEffect: 'defense_buff', points: 25
        },
        { id: 'dragon_strike', sound: 'sound_explode', name: 'Pressure Point', desc: 'Make an enemy vulnerable, taking 50% more damage for 2 rounds', level: 20, damage: 5, damageType: 'physical', type: 'attack', target: 'enemy', animType: 'spell',
          applyStatus: true, duration: 2, statusEffect: 'vulnerable', points: 50,
          sprite: 'spot_weakness',
          tint: '#dede8c'
        },
      ],
      talents: [
        createTalent('monk_stance_1', 'Way of the Dragon', 'Grants an additional action per turn', 1, 'rare', '👊', '👊', { grantAdditionalActions: 1 }, 'accessory'),
        createTalent('monk_iron_fist', 'Way of the Ox', 'Physical damage +50%. Lose your additional action', 3, 'rare', '👊', '👊', { physicalDamage: 50, grantAdditionalActions: -1 }, 'weapon'),
        createTalent('monk_chi_flow', 'Martial Expertise', 'Physical damage +15%, speed +3', 3, 'rare', '🧘', '🧘', { physicalDamage: 15, speed: 3 }, 'accessory'),
        createTalent('talent_levelup', 'Level Up', 'Grants an additional action per turn', 6, 'rare', '👊', '👊', { grantAdditionalActions: 1 }, 'accessory'),
        createTalent('monk_dragon_robes', 'Dragon Robes', 'Physical damage +10%, defense +5', 9, 'rare', '🐉', '🐉', { physicalDamage: 10, defense: 5 }, 'armor'),
        createTalent('monk_zen_master', 'One-Two Punch', 'Jab strikes 1 additional time', 9, 'rare', '🧘', '🧘', { abilityBuffs: { jab: { repeats: 1 } } }, 'accessory'),
        createTalent('monk_pressure_master', 'Precision', 'Hit chance +8, crit chance +8%', 12, 'rare', '👆', '👆', { hitChance: 8, critChance: 8 }, 'accessory'),
        createTalent('monk_chi_armor', 'Chi Armor', 'Start of Combat: Gain +15 Defense for 2 rounds', 12, 'rare', '🛡️', '🛡️', { }, 'armor', [
          { procTrigger: PROC_START_OF_COMBAT, procChance: 100, procAction: {
            type: 'buff', target: 'self', animType: 'support',
            applyStatus: true, duration: 2, statusEffect: 'defense_buff', points: 15,
            sprite: 'defend',
            tint: '#dede8c'
          }}
        ]),
        createTalent('monk_fof', 'Fists of Fury', 'Flurry of Blows strikes 2 additional times and gains 1 extra use per combat', 16, 'rare', '🧘', '🧘', { addBonusUses: { flurry_of_blows: 1 }, abilityBuffs: { flurry_of_blows: { repeats: 2 } } }, 'accessory'),
        createTalent('monk_wardance', 'Wardance', 'When an attack hits you, gain +20% physical damage for 2 rounds', 16, 'rare', '🧘', '🧘', { }, 'accessory', [
          { procTrigger: PROC_TAKE_ATTACK, procChance: 100, procAction: {
            type: 'buff', target: 'self', animType: 'support',
            applyStatus: true, duration: 2, statusEffect: 'physical_buff', points: 20,
            sprite: 'damagebuff',
            tint: '#dede8c'
          }}
        ]),
      ]
    }
  };

// Camp actions available to all players
const CAMP_ACTIONS = {
  rest: {
    id: 'rest',
    name: 'Rest',
    description: 'Heal for 60 HP',
    icon: '😴',
    heal: 60,
    target: 'self'
  },
  rest1: {
    id: 'rest1',
    name: 'Long Rest',
    description: 'Heal for 100 HP',
    icon: '🛌',
    heal: 100,
    target: 'self'
  },
  study: {
    id: 'study',
    name: 'Study',
    description: 'Gain +3 magic damage',
    icon: '📚',
    grantItem: 'sharpened_mind',
    target: 'self'
  },
  accuracy_training: {
    id: 'accuracy_training',
    name: 'Accuracy Training',
    description: 'Gain +3 hit chance',
    icon: '🎯',
    grantItem: 'accuracy_training',
    target: 'self'
  },
  agility_training: {
    id: 'agility_training',
    name: 'Agility Training',
    description: 'Gain +3 speed',
    icon: '🏃',
    grantItem: 'agility_training',
    target: 'self'
  },
  eat: {
    id: 'eat',
    name: 'Eat',
    description: 'Heal for 40 HP',
    icon: '🍖',
    heal: 40,
    target: 'self'
  },
  inspiring_speech: {
    id: 'inspiring_speech',
    name: 'Inspiring Speech',
    description: 'Heal all players for 30 HP',
    icon: '📣',
    heal: 30,
    target: 'all_players'
  },
  train: {
    id: 'train',
    name: 'Train',
    description: 'Gain +3 physical damage',
    icon: '🎯',
    grantItem: 'sharpened_weapons',
    target: 'self'
  },
  hpinc: {
    id: 'hpinc',
    name: 'Meditate',
    description: 'Gain +20 Max HP',
    icon: '🧘',
    grantItem: 'hp_buff',
    target: 'self'
  }
};

// Enemy types with damage resistances, special abilities, and difficulty levels
const ENEMIES = [
  // Level 1 - Weak enemies (Budget: 1)
  { 
    id: 'goblin', 
    name: 'Goblin', 
    level: 1,
    health: 40, 
    damage: 8, 
    defense: 5, 
    speed: 12,
    specialAbilities: [{
      id: 'poison_claw',
      name: 'Poison Claw',
      damage: 5,
      dot: 5,
      damageType: 'magic',
      target: 'single_player',
      weight: 15, 
      animType: 'melee',
      type: 'attack',
      sound: 'sound_magicimpact',
      applyStatus: true, duration: 3, statusEffect: 'poison', points: 5
    }],
  },
  { 
    id: 'goblin_shaman', 
    name: 'Goblin Shaman', 
    level: 1,
    health: 35, 
    damage: 4, 
    defense: 5, 
    sprite: 'goblin',
    speed: 15,
    scale: 0.7,
    minEncounterNumber: 3,
    tint: '#00ff00',
    specialAbilities: [{
      id: 'ritual',
      name: 'Ritual',
      type: 'buff',
      physicalBuff: true,
      damageType: 'magic',
      target: 'all_friends',
      weight: 15, 
      sprite: 'damagebuff',
      tint: '#32c96f',
      animType: 'cast',
      applyStatus: true, duration: 3, statusEffect: 'physical_buff', points: 10,
      sound: 'sound_magicbuff',
    },
  {
    id: 'storm',
    name: 'Stormbolt',
    type: 'attack',
    damage: 15,
    damageType: 'magic',
    target: 'single_player',
    weight: 15, 
    animType: 'spell',
    sprite: 'lightning',
    tint: '#76cccf',
    sound: 'sound_lightning'
  }],
  },
  { 
    id: 'wolf', 
    name: 'Wolf', 
    level: 1,
    health: 50, 
    damage: 11, 
    defense: 7, 
    speed: 15,
    specialAbilities: [{
      id: 'bite',
      name: 'Bite',
      damage: 18,
      type: 'attack',
      damageType: 'physical',
      target: 'single_player',
      weight: 15, 
      animType: 'melee',
      sound: 'sound_attack'
    }],
  },
  
  // Level 2 - Medium enemies (Budget: 2)
  { 
    id: 'skeleton', 
    name: 'Skeleton', 
    level: 2,
    health: 55, 
    damage: 15, 
    defense: 5, 
    speed: 10 ,
    minEncounterNumber: 2,
  },
  { 
    id: 'orc', 
    name: 'Orc', 
    level: 2,
    health: 65, 
    damage: 12, 
    defense: 12, 
    minEncounterNumber: 4,
    speed: 8,
    scale: 1.4,
    specialAbilities: [{
      id: 'enrage',
      name: 'Enrage',
      type: 'buff',
      ragebuff: true,
      damageType: 'physical',
      target: 'self',
      weight: 15, 
      animType: 'spell',
      applyStatus: true, duration: 2, statusEffect: 'physical_buff', points: 20,
      sound: 'sound_magicbuff'
    },
    {
      id: 'rampage',
      name: 'Rampage',
      damage: 18,
      type: 'attack',
      damageType: 'physical',
      target: 'all_players',
      weight: 15, 
      animType: 'melee',
      sound: 'sound_sword'
    }
  ],
  },
  
  // Level 3 - Strong enemies (Budget: 3)
  { 
    id: 'dark_cleric', 
    name: 'Black Cleric', 
    level: 2,
    health: 90, 
    damage: 10, 
    defense: 10, 
    minEncounterNumber: 4,
    sprite: 'dark_wizard',
    tint: '#80734b',
    speed: 9,
    specialAbilities: [
      {
        id: 'darkmend',
        name: 'Darkmend',
        heal: 30,
        type: 'heal',
        damageType: 'magic',
        target: 'random_friend',
        weight: 30, 
        animType: 'spell',
        sprite: 'heal',
        tint: '#6330ab',
        sound: 'sound_heal'
      }
    ]
  },
  { 
    id: 'fiend', 
    name: 'Shadowspawn', 
    level: 2,
    health: 70, 
    damage: 10, 
    minEncounterNumber: 4,
    defense: 4, 
    sprite: 'fiend',
    speed: 9,
    specialAbilities: [
      {
        id: 'deathtouch',
        name: 'Death Mark',
        damage: 15,
        type: 'attack',
        damageType: 'magic',
        target: 'single_player',
        weight: 20, 
        animType: 'spell',
        sprite: 'hex',
        tint: '#822b39',
        applyStatus: true, duration: 3, statusEffect: 'vulnerable', points: 50,
        sound: 'sound_laser'
      }
    ]
  },
  { 
    id: 'imp', 
    name: 'Imp', 
    level: 1,
    health: 25, 
    damage: 10, 
    defense: 1, 
    sprite: 'imp',
    speed: 9,
    specialAbilities: [
      {
        id: 'burningwound',
        name: 'Burning Wound',
        damage: 15,
        type: 'attack',
        damageType: 'magic',
        target: 'single_player',
        weight: 20, 
        animType: 'spell',
        sprite: 'hellfire',
        applyStatus: true, duration: 3, statusEffect: 'healReduction', points: 50,
        sound: 'sound_explodesmall'
      }
    ]
  },
  { 
    id: 'demon', 
    name: 'Demon', 
    level: 3,
    health: 100, 
    damage: 15, 
    defense: 9, 
    sprite: 'demon',
    speed: 9,
    specialAbilities: [
      {
        id: 'burningwound',
        name: 'Burning Wound',
        damage: 15,
        type: 'attack',
        damageType: 'magic',
        target: 'single_player',
        weight: 20, 
        animType: 'spell',
        sprite: 'hellfire',
        applyStatus: true, duration: 3, statusEffect: 'healReduction', points: 50,
        sound: 'sound_explodesmall'
      },
      {
        id: 'execute',
        name: 'Execute',
        damage: 20,
        executeBonus: true,
        type: 'attack',
        damageType: 'physical',
        target: 'single_player',
        weight: 20, 
        animType: 'melee',
        sprite: 'hellfire',
        sound: 'enemy_attack'
      }
    ]
  },
  { 
    id: 'horror', 
    name: 'Horror', 
    level: 2,
    health: 45, 
    damage: 8, 
    defense: 3, 
    sprite: 'horror',
    speed: 9,
    specialAbilities: [
      {
        id: 'gaze1',
        name: 'Gaze of Horror',
        damage: 20,
        type: 'attack',
        damageType: 'magic',
        target: 'single_player',
        weight: 30, 
        animType: 'spell',
        sprite: 'hex',
        applyStatus: true, duration: 2, statusEffect: 'curse', points: 30,
        sound: 'sound_magicimpact'
      },
      {
        id: 'gaze2',
        name: 'Gaze of Death',
        damage: 20,
        type: 'attack',
        damageType: 'magic',
        target: 'single_player',
        weight: 30, 
        animType: 'spell',
        sprite: 'poison',
        applyStatus: true, duration: 2, statusEffect: 'poison', points: 15,
        sound: 'sound_magicimpact'
      },
    ]
  },
  { 
    id: 'golem', 
    name: 'Golem', 
    level: 3,
    health: 80, 
    damage: 12, 
    defense: 3, 
    sprite: 'golem',
    speed: 1,
    specialAbilities: [
      {
        id: 'protect',
        name: 'Protect',
        type: 'buff',
        damageType: 'magic',
        target: 'random_friend',
        weight: 20, 
        animType: 'support',
        sprite: 'defend',
        tint: "#99b0a1",
        applyStatus: true, duration: 3, statusEffect: 'defense_buff', points: 30,
        sound: 'sound_magicimpact'
      },
      {
        id: 'thorns',
        name: 'Thorns',
        type: 'buff',
        damageType: 'magic',
        target: 'random_friend',
        weight: 20, 
        animType: 'support',
        sprite: 'defend',
        tint: "#5bc781",
        applyStatus: true, duration: 3, statusEffect: 'thorns', points: 15,
        sound: 'sound_magicimpact'
      },
    ]
  },
  { 
    id: 'lava', 
    name: 'Lava Elemental', 
    level: 2,
    health: 70, 
    damage: 15, 
    defense: 9, 
    minEncounterNumber: 5,
    sprite: 'lava',
    speed: 9,
    specialAbilities: [
      {
        id: 'firenova',
        name: 'Fire Nova',
        damage: 15,
        type: 'attack',
        damageType: 'magic',
        target: 'all_players',
        weight: 20, 
        animType: 'spell',
        sprite: 'flamestrike',
        sound: 'sound_fireball'
      }
    ]
  },
  { 
    id: 'water', 
    name: 'Water Elemental', 
    level: 2,
    health: 50, 
    damage: 14, 
    minEncounterNumber: 3,
    defense: 9, 
    sprite: 'water',
    speed: 9,
    specialAbilities: [
      {
        id: 'frostnova',
        name: 'Cold Nova',
        damage: 8,
        type: 'attack',
        damageType: 'magic',
        target: 'all_players',
        weight: 15, 
        animType: 'spell',
        sprite: 'frost',
        applyStatus: true, duration: 2, statusEffect: 'slow', points: 8,
        sound: 'sound_laser'
      }
    ]
  },
  { 
    id: 'dark_wizard', 
    name: 'Dark Wizard', 
    level: 3,
    health: 120, 
    scale: 1.5,
    damage: 15, 
    defense: 6, 
    minEncounterNumber: 6,
    speed: 9,
    resistances: ['magic'], // Resistant to magic damage
    specialAbilities: [
      {
        id: 'shadow_bolt',
        name: 'Shadow Bolt',
        damage: 12,
        type: 'attack',
        damageType: 'magic',
        target: 'all_players',
        weight: 20, 
        animType: 'spell',
        sprite: 'shadow_bolt',
        sound: 'sound_zap'
      },
      {
        id: 'summon_skeleton',
        name: 'Summon Skeleton',
        type: 'summon',
        summonEnemyId: 'skeleton',
        target: 'none',
        weight: 10,
        animType: 'spell',
        sprite: 'raise_dead',
        sound: 'sound_magicimpact'
      }
    ]
  },
  { 
    id: 'wolf_boss', 
    name: 'Denmother', 
    level: 2,
    health: 100, 
    damage: 14, 
    minEncounterNumber: 5,
    defense: 8, 
    speed: 15,
    scale: 2,
    sprite: 'wolf',
    tint: '#d47739',
    specialAbilities: [{
      id: 'summon_wolf',
        name: 'Howl',
        type: 'summon',
        summonEnemyId: 'wolf',
        target: 'none',
        weight: 10,
        animType: 'spell',
        sprite: 'smoke_bomb',
        sound: 'sound_magicimpact'
    }],
  },
  
  // Level 4 - Elite enemies (Budget: 4)
  { 
    id: 'troll', 
    name: 'Orc Shaman', 
    level: 4,
    health: 80, 
    damage: 14, 
    minEncounterNumber: 6,
    defense: 8, 
    sprite: 'orc',
    speed: 6,
    scale: 2.5,
    tint: '#56accc',
    resistances: ['physical'], // Resistant to physical damage
    specialAbilities: [
      {
        id: 'bash',
        name: 'Boulder Crush',
        damage: 25,
        damageType: 'physical',
        type: 'attack',
        stun: true,
        target: 'single_player',
        weight: 20, // 10% chance to use
        animType: 'spell',
        sprite: 'rock',
        applyStatus: true, duration: 1, statusEffect: 'stun', points: 1,
        sound: 'sound_explode'
      }
    ]
  },
  { 
    id: 'orc_chieftain', 
    name: 'Orc Chieftain', 
    level: 4,
    health: 150, 
    damage: 18, 
    minEncounterNumber: 7,
    defense: 18, 
    speed: 10,
    sprite: 'orc',  // Use orc sprite assets
    scale: 1.8,     // 30% larger
    tint: '#e6633c', // Red tint
    resistances: ['physical'], // Resistant to physical damage
    specialAbilities: [
      {
        id: 'bash',
        name: 'Bash',
        damage: 20,
        damageType: 'physical',
        stun: true,
        target: 'single_player',
        weight: 10, // 10% chance to use
        animType: 'melee',
        type: 'attack',
        applyStatus: true, duration: 1, statusEffect: 'stun', points: 1,
        sound: 'sound_shieldbash'
      },
      {
        id: 'summon_orc',
        name: 'Reinforcements',
        type: 'summon',
        summonEnemyId: 'orc',
        target: 'none',
        weight: 10,
        animType: 'spell',
        sprite: 'smoke_bomb',
        sound: 'sound_magicimpact'
      }
    ]
  },
  
  // New Level 1 Enemies
  { 
    id: 'goblin_archer', 
    name: 'Goblin Archer', 
    level: 1,
    health: 30, 
    damage: 6, 
    defense: 3, 
    speed: 18,
    sprite: 'goblin',
    tint: '#8B4513', // Brown tint
    specialAbilities: [{
      id: 'piercing_shot',
      name: 'Piercing Shot',
      damage: 12,
      damageType: 'physical',
      target: 'single_player',
      weight: 20, 
      animType: 'projectile',
      sprite: 'impact_right',
      sound: 'sound_sword'
    }]
  },
  { 
    id: 'skeleton_warrior', 
    name: 'Skeleton Warrior', 
    level: 1,
    health: 45, 
    damage: 10, 
    defense: 8, 
    minEncounterNumber: 3,
    speed: 8,
    sprite: 'skeleton',
    tint: '#C0C0C0', // Silver tint
    specialAbilities: [{
      id: 'bone_shatter',
      name: 'Bone Shatter',
      damage: 8,
      damageType: 'physical',
      target: 'single_player',
      weight: 15, 
      animType: 'melee',
      sprite: 'impact_left',
      applyStatus: true, duration: 2, statusEffect: 'vulnerable', points: 50,
      sound: 'sound_bash'
    }]
  },
  
  // New Level 2 Enemies
  { 
    id: 'wolf_alpha', 
    name: 'Alpha Wolf', 
    level: 2,
    health: 70, 
    damage: 14, 
    defense: 10, 
    minEncounterNumber: 2,
    speed: 18,
    scale: 1.5,
    sprite: 'wolf',
    tint: '#2F4F4F', // Dark slate gray
    specialAbilities: [{
      id: 'pack_leader',
      name: 'Pack Leader',
      type: 'buff',
      physicalBuff: true,
      damageType: 'physical',
      target: 'all_friends',
      weight: 15, 
      sprite: 'damagebuff',
      tint: '#8B0000',
      animType: 'cast',
      applyStatus: true, duration: 3, statusEffect: 'physical_buff', points: 8,
      sound: 'sound_magicbuff'
    }]
  },
  { 
    id: 'orc_berserker', 
    name: 'Orc Berserker', 
    level: 2,
    health: 80, 
    damage: 16, 
    defense: 6, 
    scale: 1.5,
    minEncounterNumber: 3,
    speed: 12,
    sprite: 'orc',
    tint: '#DC143C', // Crimson
    specialAbilities: [{
      id: 'blood_frenzy',
      name: 'Blood Frenzy',
      damage: 20,
      damageType: 'physical',
      target: 'single_player',
      weight: 20, 
      animType: 'melee',
      sprite: 'impact_right',
      sound: 'sound_sword'
    }]
  },
  { 
    id: 'fiend_imp', 
    name: 'Fiend Imp', 
    level: 2,
    health: 35, 
    damage: 12, 
    defense: 2, 
    minEncounterNumber: 2,
    speed: 20,
    sprite: 'imp',
    tint: '#4B0082', // Indigo
    specialAbilities: [{
      id: 'chaos_bolt',
      name: 'Chaos Bolt',
      damage: 18,
      damageType: 'magic',
      target: 'single_player',
      weight: 25, 
      animType: 'spell',
      sprite: 'shadow_bolt',
      tint: '#FF1493',
      sound: 'sound_zap'
    }]
  },
  
  // New Level 3 Enemies
  { 
    id: 'skeleton_mage', 
    name: 'Skeleton Mage', 
    level: 3,
    health: 60, 
    damage: 8, 
    defense: 4, 
    speed: 12,
    minEncounterNumber: 4,
    sprite: 'skeleton',
    tint: '#9370DB', // Medium purple
    resistances: ['magic'],
    specialAbilities: [{
      id: 'bone_chill',
      name: 'Bone Chill',
      damage: 12,
      damageType: 'magic',
      target: 'single_player',
      weight: 20, 
      animType: 'spell',
      sprite: 'frost',
      tint: '#B0E0E6',
      applyStatus: true, duration: 2, statusEffect: 'slow', points: 6,
      sound: 'sound_laser'
    }]
  },
  { 
    id: 'lava_golem', 
    name: 'Lava Golem', 
    level: 3,
    health: 120, 
    damage: 18, 
    defense: 15, 
    speed: 6,
    scale: 2,
    minEncounterNumber: 7,
    sprite: 'lava',
    tint: '#FF4500', // Orange red
    resistances: ['physical'],
    specialAbilities: [{
      id: 'molten_armor',
      name: 'Molten Armor',
      type: 'buff',
      defenseBuff: true,
      damageType: 'magic',
      target: 'self',
      weight: 15, 
      sprite: 'defend',
      tint: '#FF6347',
      animType: 'cast',
      applyStatus: true, duration: 3, statusEffect: 'defense_buff', points: 12,
      sound: 'sound_magicbuff'
    }]
  },
  { 
    id: 'water_nymph', 
    name: 'Frost Spirit', 
    level: 3,
    health: 90, 
    damage: 10, 
    defense: 8, 
    speed: 15,
    scale: 2,
    minEncounterNumber: 6,
    sprite: 'water',
    tint: '#00CED1', // Dark turquoise
    specialAbilities: [{
      id: 'healing_waters',
      name: 'Healing Waters',
      heal: 40,
      type: 'heal',
      damageType: 'magic',
      target: 'random_friend',
      weight: 20, 
      animType: 'spell',
      sprite: 'heal',
      tint: '#87CEEB',
      sound: 'sound_heal'
    }]
  },
  
  // New Level 4 Elite Enemies
  { 
    id: 'dark_wizard_elite', 
    name: 'Shadow Archmage', 
    level: 5,
    health: 200, 
    damage: 20, 
    defense: 10, 
    speed: 10,
    sprite: 'dark_wizard',
    tint: '#2F2F2F', // Dark gray
    scale: 2,
    minEncounterNumber: 10,
    resistances: ['magic'],
    specialAbilities: [
      {
        id: 'shadow_weave',
        name: 'Shadow Weave',
        damage: 15,
        damageType: 'magic',
        target: 'all_players',
        weight: 20, 
        animType: 'spell',
        sprite: 'shadow_bolt',
        tint: '#8B008B',
        sound: 'sound_zap'
      },
      {
        id: 'summon_fiend',
        name: 'Summon Fiend',
        type: 'summon',
        summonEnemyId: 'fiend_imp',
        target: 'none',
        weight: 8,
        animType: 'spell',
        sprite: 'raise_dead',
        sound: 'sound_magicimpact'
      }
    ]
  },
  { 
    id: 'orc_warlord', 
    name: 'Orc Warlord', 
    level: 4,
    health: 180, 
    damage: 22, 
    defense: 20, 
    speed: 8,
    sprite: 'orc',
    tint: '#8B0000', // Dark red
    scale: 2.2,
    minEncounterNumber: 8,
    resistances: ['physical'],
    specialAbilities: [
      {
        id: 'warlord_roar',
        name: 'Warlord Roar',
        type: 'buff',
        physicalBuff: true,
        damageType: 'physical',
        target: 'all_friends',
        weight: 15, 
        sprite: 'damagebuff',
        tint: '#DC143C',
        animType: 'cast',
        applyStatus: true, duration: 4, statusEffect: 'physical_buff', points: 15,
        sound: 'sound_magicbuff'
      },
      {
        id: 'devastating_blow',
        name: 'Devastating Blow',
        damage: 35,
        damageType: 'physical',
        target: 'single_player',
        weight: 12, 
        animType: 'melee',
        sprite: 'impact_right',
        sound: 'sound_explode'
      }
    ]
  },
  {
    id: 'dragon_whelp', 
    name: 'Dragon Whelp', 
    level: 5,
    health: 140, 
    damage: 20, 
    defense: 12, 
    speed: 8,
    sprite: 'dragonling',
    scale: 2,
    minEncounterNumber: 50,
    specialAbilities: [
      {
        id: 'dragon_breath',
        name: 'Breath of Fire',
        type: 'attack',
        damage: 20,
        damageType: 'magic',
        target: 'all_players',
        weight: 15, 
        sprite: 'flamestrike',
        animType: 'spell',
        sound: 'sound_fireball'
      },
      {
        id: 'dragon_blast',
        name: 'Flame Blast',
        type: 'attack',
        damage: 30,
        damageType: 'magic',
        target: 'single_player',
        weight: 15, 
        sprite: 'fireball',
        animType: 'projectile',
        sound: 'sound_fireball',
        applyStatus: true, duration: 1, statusEffect: 'stun', points: 1,
      },
      {
        id: 'dragon_scales',
        name: 'Dragonscales',
        type: 'buff',
        target: 'self',
        weight: 12, 
        animType: 'spell',
        sprite: 'defend',
        tint: '#fc4103',
        applyStatus: true, duration: 2, statusEffect: 'defense_buff', points: 30,
        sound: 'sound_explode'
      }
    ]
  },
  {
    id: 'dragon', 
    name: 'Greater Dragon', 
    level: 15,
    health: 300, 
    damage: 25, 
    defense: 14, 
    speed: 8,
    sprite: 'bigdragon',
    scale: 3.5,
    minEncounterNumber: 50,
    resistances: ['physical'],
    specialAbilities: [
      {
        id: 'dragon_breath',
        name: 'Breath of Fire',
        type: 'attack',
        damage: 40,
        damageType: 'magic',
        target: 'all_players',
        weight: 15, 
        sprite: 'flamestrike',
        animType: 'spell',
        sound: 'sound_fireball'
      },
      {
        id: 'dragon_blast',
        name: 'Flame Blast',
        type: 'attack',
        damage: 50,
        damageType: 'magic',
        target: 'single_player',
        weight: 15, 
        sprite: 'fireball',
        animType: 'projectile',
        sound: 'sound_fireball',
        applyStatus: true, duration: 1, statusEffect: 'stun', points: 1,
      },
      {
        id: 'dragon_scales',
        name: 'Dragonscales',
        type: 'buff',
        target: 'self',
        weight: 12, 
        animType: 'spell',
        sprite: 'defend',
        tint: '#fc4103',
        applyStatus: true, duration: 2, statusEffect: 'defense_buff', points: 50,
        sound: 'sound_explode'
      }
    ]
  },
  {
    id: 'lich', 
    name: 'Frost Lich', 
    level: 10,
    health: 240, 
    damage: 25, 
    defense: 5, 
    speed: 8,
    sprite: 'lich',
    scale: 2,
    minEncounterNumber: 50,
    resistances: ['magic'],
    specialAbilities: [
      {
        id: 'frost_nova',
        name: 'Ice Nova',
        type: 'attack',
        damage: 20,
        damageType: 'magic',
        target: 'all_players',
        weight: 15, 
        sprite: 'frost',
        animType: 'spell',
        sound: 'sound_zap',
        applyStatus: true, duration: 3, statusEffect: 'slow', points: 10,
      },
      {
        id: 'ice_shard',
        name: 'Cold Snap',
        type: 'attack',
        damage: 40,
        damageType: 'magic',
        target: 'single_player',
        weight: 20, 
        sprite: 'rock',
        animType: 'spell',
        tint: '#43aeb0',
        sound: 'sound_zap',
        applyStatus: true, duration: 1, statusEffect: 'stun', points: 1,
      },
      {
        id: 'frost_fever',
        name: 'Frost Fever',
        type: 'attack',
        damage: 20,
        damageType: 'magic',
        target: 'single_player',
        weight: 12, 
        animType: 'spell',
        sprite: 'poison',
        tint: '#43aeb0',
        applyStatus: true, duration: 2, statusEffect: 'poison', points: 10,
        sound: 'sound_magicimpact'
      },
      {
        id: 'summon_skeleton1',
        name: 'Summon Skeleton Mage',
        type: 'summon',
        summonEnemyId: 'skeleton_mage',
        target: 'none',
        weight: 5,
        animType: 'spell',
        sprite: 'raise_dead',
        sound: 'sound_magicimpact'
      }
    ]
  },
  {
    id: 'death_lich', 
    name: 'Death Lich', 
    level: 10,
    health: 400, 
    damage: 30, 
    defense: 5, 
    speed: 8,
    sprite: 'lich',
    scale: 3,
    tint: '#524269',
    minEncounterNumber: 50,
    resistances: ['magic'],
    specialAbilities: [
      {
        id: 'death_nova',
        name: 'Death Nova',
        type: 'attack',
        damage: 20,
        damageType: 'magic',
        target: 'all_players',
        weight: 20, 
        sprite: 'hex',
        animType: 'spell',
        sound: 'sound_zap',
        applyStatus: true, duration: 3, statusEffect: 'poison', points: 20,
      },
      {
        id: 'lifesteal',
        name: 'Lifesteal',
        type: 'buff',
        damageType: 'magic',
        target: 'all_friends',
        weight: 15, 
        animType: 'spell',
        sprite: 'poison',
        tint: '#503554',
        applyStatus: true, duration: 3, statusEffect: 'lifesteal', points: 50,
        sound: 'sound_magicimpact'
      },
      {
        id: 'summon_horror',
        name: 'Summon Horror',
        type: 'summon',
        summonEnemyId: 'horror',
        target: 'none',
        weight: 20,
        animType: 'spell',
        sprite: 'raise_dead',
        sound: 'sound_magicimpact'
      }
    ]
  },
  {
    id: 'dark_knight', 
    name: 'The Dark Knight', 
    level: 10,
    health: 500, 
    damage: 30, 
    defense: 11, 
    speed: 8,
    sprite: 'knight',
    scale: 2.5,
    minEncounterNumber: 50,
    resistances: ['magic'],
    specialAbilities: [
      {
        id: 'wicked_charge',
        name: 'Wicked Charge',
        type: 'attack',
        damage: 40,
        damageType: 'magic',
        target: 'single_player',
        weight: 30, 
        sprite: 'hex',
        animType: 'melee',
        sound: 'sound_bash'
      },
      {
        id: 'dark_shield',
        name: 'Dark Shield',
        type: 'buff',
        damageType: 'magic',
        target: 'self',
        weight: 20,
        animType: 'spell',
        sprite: 'poison',
        applyStatus: true, duration: 2, statusEffect: 'defense_buff', points: 20,
        sound: 'sound_magicimpact'
      },
      {
        id: 'suffocate',
        name: 'Suffocate',
        type: 'attack',
        damage: 25,
        damageType: 'magic',
        target: 'single_player',
        weight: 10, 
        sprite: 'hex',
        animType: 'spell',
        sound: 'sound_magicimpact',
        applyStatus: true, duration: 1, statusEffect: 'stun', points: 1,
      },
    ]
  },
];

// Boss battle configurations
const BOSS_BATTLES = {
  // User will populate this
  // Example structure:
  // 5: [{ enemy: 'goblin_shaman', count: 1 }, { enemy: 'goblin_warrior', count: 2 }],
  // 10: [{ enemy: 'skeleton_mage', count: 1 }]
  5: [{ enemy: 'dragon_whelp', count: 1 }],
  10: [{ enemy: 'lich', count: 1 }],
  15: [{ enemy: 'dragon', count: 1 }],
  20: [{ enemy: 'death_lich', count: 1 }],
  25: [{ enemy: 'dark_knight', count: 1 }],
  30: [{ enemy: 'death_lich', count: 2 }],
};

// Puzzle encounter configurations
const PUZZLE_TYPES = {
  button_puzzle: {
    name: 'Ancient Mechanism',
    maximumRounds: 10,
    enemies: ['puzzle_statue'], // Decorative only
    actions: ['press_red_button', 'press_blue_button', 'press_green_button'],
    onMaxRounds: (lobby, api) => {
      // Puzzle failed - deal damage to all players
      Object.values(lobby.state.players).forEach(player => {
        if (player.health > 0) {
          const damage = Math.floor(player.maxHealth * 0.1); // 25% max health damage
          player.health = Math.max(1, player.health - damage);
        }
      });
      
      // Send custom combat message
      api.sendToHost('animateAction', {
        actor: 'Ancient Mechanism',
        action: 'The Mechanism Overloads',
        type: 'popup',
        message: 'The mechanism overloads! All players take damage!',
        color: '#ff4444'
      });
    }
  },
  riddlemaster: {
    name: 'The Riddlemaster',
    maximumRounds: 2,
    enemies: ['riddlemaster_statue'], // Decorative only
    actions: ['option_a', 'option_b', 'option_c'],
    onMaxRounds: (lobby, api) => {
      // Puzzle failed - deal damage to all players
      Object.values(lobby.state.players).forEach(player => {
        if (player.health > 0) {
          const damage = Math.floor(player.maxHealth * 0.25); // 25% max health damage
          player.health = Math.max(1, player.health - damage);
        }
      });
      
      // Send custom combat message
      api.sendToHost('animateAction', {
        actor: 'The Riddlemaster',
        action: 'The Riddlemaster',
        type: 'popup',
        message: "Time's up! All players take damage!",
        color: '#ff4444'
      });
    }
  },
  door_puzzle: {
    name: 'Locked Door',
    maximumRounds: 5,
    enemies: ['puzzle_door'], // Decorative only
    actions: ['bash_door', 'pick_lock', 'observe'],
    onMaxRounds: (lobby, api) => {
      // Puzzle failed - deal damage to all players
      Object.values(lobby.state.players).forEach(player => {
        if (player.health > 0) {
          const damage = Math.floor(player.maxHealth * 0.25); // 25% max health damage
          player.health = Math.max(1, player.health - damage);
        }
      });
      
      // Send custom combat message
      api.sendToHost('animateAction', {
        actor: 'Locked Door',
        action: 'Locked Door',
        type: 'popup',
        message: "The door still stands! All players take damage!",
        color: '#ff4444'
      });
    }
  }
};

const PUZZLE_ACTIONS = {
  bash_door: { id: 'bash_door', 
    sound: 'enemy_attack', 
    name: 'Brute Force', 
    damage: 15, 
    desc: '15 damage to door. Lose 10% health on fail',
    damageType: 'none', 
    hitChanceModifier: 10, 
    type: 'attack', 
    failDamage: 10,
    target: 'enemy', 
    animType: 'melee'
  },
  pick_lock: { id: 'pick_lock', 
    sound: 'enemy_attack', 
    name: 'Pick Lock', 
    damage: 40, 
    desc: '40 damage to door. Lose 35% health on fail',
    damageType: 'none', 
    hitChanceModifier: -30, 
    type: 'attack', 
    failDamage: 35,
    target: 'enemy', 
    animType: 'melee'
  },
  observe: { id: 'observe', 
    name: 'Observe', 
    desc: 'Do nothing this round',
    damageType: 'none', 
    hitChanceModifier: 0, 
    type: 'puzzle', 
    target: 'self', 
    animType: 'support'
  },
  press_red_button: {
    id: 'press_red_button',
    name: 'Press Red Button',
    desc: 'Press the red button on the ancient mechanism',
    type: 'puzzle',
    target: 'self',
    animType: 'melee',
    buttonColor: 'red',
    customEffect: (lobby, api, player, targetId, targets) => {
      return handleButtonPress(lobby, api, player, 'red');
    }
  },
  press_blue_button: {
    id: 'press_blue_button',
    name: 'Press Blue Button',
    desc: 'Press the blue button on the ancient mechanism',
    type: 'puzzle',
    target: 'self',
    buttonColor: 'blue',
    customEffect: (lobby, api, player, targetId, targets) => {
      return handleButtonPress(lobby, api, player, 'blue');
    }
  },
  press_green_button: {
    id: 'press_green_button',
    name: 'Press Green Button',
    desc: 'Press the green button on the ancient mechanism',
    type: 'puzzle',
    target: 'self',
    buttonColor: 'green',
    customEffect: (lobby, api, player, targetId, targets) => {
      return handleButtonPress(lobby, api, player, 'green');
    }
  },
  option_a: {
    id: 'option_a',
    name: 'Option A',
    desc: 'Choose option A for the riddle',
    type: 'puzzle',
    target: 'self',
    option: 'A',
    customEffect: (lobby, api, player, targetId, targets) => {
      return handleRiddleAnswer(lobby, api, player, 'A');
    }
  },
  option_b: {
    id: 'option_b',
    name: 'Option B',
    desc: 'Choose option B for the riddle',
    type: 'puzzle',
    target: 'self',
    option: 'B',
    customEffect: (lobby, api, player, targetId, targets) => {
      return handleRiddleAnswer(lobby, api, player, 'B');
    }
  },
  option_c: {
    id: 'option_c',
    name: 'Option C',
    desc: 'Choose option C for the riddle',
    type: 'puzzle',
    target: 'self',
    option: 'C',
    customEffect: (lobby, api, player, targetId, targets) => {
      return handleRiddleAnswer(lobby, api, player, 'C');
    }
  }
};

const PUZZLE_ENEMIES = {
  puzzle_statue: {
    id: 'puzzle_statue',
    name: 'Ancient Statue',
    level: 1,
    maxHealth: 100, // High health so it can be "defeated" when puzzle is solved
    defense: 0,
    damage: 0, // Doesn't attack
    sprite: 'statue',
    scale: 1.2,
    tint: '#8B4513', // Brown color for stone statue
    resistances: [],
    specialAbilities: [], // No special abilities
    budget: 0 // Doesn't count toward encounter budget
  },
  riddlemaster_statue: {
    id: 'riddlemaster_statue',
    name: 'The Riddlemaster',
    level: 1,
    maxHealth: 100, // High health so it can be "defeated" when puzzle is solved
    defense: 0,
    damage: 0, // Doesn't attack
    sprite: 'riddlemaster',
    scale: 1.3,
    tint: '#6A0DAD', // Purple color for mystical entity
    resistances: [],
    specialAbilities: [], // No special abilities
    budget: 0 // Doesn't count toward encounter budget
  },
  puzzle_door: {
    id: 'puzzle_door',
    name: 'Locked Door',
    level: 1,
    maxHealth: 100, // High health so it can be "defeated" when puzzle is solved
    defense: 0,
    damage: 0, // Doesn't attack
    sprite: 'door',
    scale: 2,
    tint: '#8B4513', // Brown color for stone statue
    resistances: [],
    specialAbilities: [], // No special abilities
    budget: 0 // Doesn't count toward encounter budget
  }
};

// Riddles database
const RIDDLES = [
  {
    id: 'what_am_i_1',
    question: 'I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?',
    options: {
      A: 'A whisper',
      B: 'An echo', 
      C: 'A shadow'
    },
    correct: 'B'
  },
  {
    id: 'what_am_i_2', 
    question: 'The more you take, the more you leave behind. What am I?',
    options: {
      A: 'Footsteps',
      B: 'Memories',
      C: 'Time'
    },
    correct: 'A'
  },
  {
    id: 'what_am_i_3',
    question: 'I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?',
    options: {
      A: 'A map',
      B: 'A dream',
      C: 'A painting'
    },
    correct: 'A'
  },
  {
    id: 'what_am_i_4',
    question: 'What gets wetter and wetter the more it dries?',
    options: {
      A: 'A sponge',
      B: 'A towel',
      C: 'The ocean'
    },
    correct: 'B'
  },
  {
    id: 'what_am_i_5',
    question: 'I am not alive, but I can grow. I don\'t have lungs, but I need air. I don\'t have a mouth, but water kills me. What am I?',
    options: {
      A: 'A tree',
      B: 'Fire',
      C: 'A flower'
    },
    correct: 'B'
  },
  {
    id: 'riddle6', 
    question: 'I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?',
    options: {
      A: 'An Echo',
      B: 'A Spirit',
      C: 'A Song'
    },
    correct: 'A'
  },
  {
    id: 'riddle7', 
    question: 'I am born in fire, live in air, and die in water. What am I?',
    options: {
      A: 'Steam',
      B: 'Ash',
      C: 'Lightning'
    },
    correct: 'A'
  },
  {
    id: 'riddle8', 
    question: 'I can fly without wings, cry without eyes, and whisper without a mouth. What am I?',
    options: {
      A: 'The Wind',
      B: 'A Ghost',
      C: 'A Thought'
    },
    correct: 'A'
  },
  {
    id: 'riddle9', 
    question: 'The poor have me, the rich need me, and if you eat me, you die. What am I?',
    options: {
      A: 'Nothing',
      B: 'Gold',
      C: 'Fire'
    },
    correct: 'A'
  },
  {
    id: 'riddle10', 
    question: 'I guard treasures but have no lock or key. My scales gleam, yet I am no fish. What am I?',
    options: {
      A: 'A Dragon',
      B: 'A Serpent',
      C: 'A Chest'
    },
    correct: 'A'
  },
  {
    id: 'riddle11', 
    question: 'I am taken before you see me, and once revealed, I am gone. What am I?',
    options: {
      A: 'A Photograph',
      B: 'A Secret',
      C: 'A Breath'
    },
    correct: 'A'
  },
  {
    id: 'riddle12', 
    question: 'Feed me and I live, give me a drink and I die. What am I?',
    options: {
      A: 'Fire',
      B: 'A Candle',
      C: 'A Forge'
    },
    correct: 'A'
  },
  {
    id: 'riddle13', 
    question: 'I have a heart that never beats, a home but no walls, and I can be stolen but never held. What am I?',
    options: {
      A: 'An Art',
      B: 'A Treasure',
      C: 'Love'
    },
    correct: 'C'
  },
  {
    id: 'what_am_i_19', 
    question: 'Break me and I still stand. Burn me and I will grow. What am I?',
    options: {
      A: 'A Secret',
      B: 'A Lie',
      C: 'The Forest'
    },
    correct: 'C'
  },
  {
    id: 'what_am_i_20', 
    question: 'I’m not alive, but I remember. I keep what I’m given and share it when asked. What am I?',
    options: {
      A: 'A Book',
      B: 'A Mirror',
      C: 'A Well'
    },
    correct: 'A'
  },
  {
    id: 'riddle21',
    question: 'I have keys but no locks. I have space but no rooms. You can enter but can’t go outside. What am I?',
    options: {
      A: 'A Keyboard',
      B: 'A Map',
      C: 'A Safe'
    },
    correct: 'A'
  },
  {
    id: 'riddle22',
    question: 'What has many teeth, but cannot bite?',
    options: {
      A: 'A Zipper',
      B: 'A Comb',
      C: 'A Saw'
    },
    correct: 'B'
  },
  {
    id: 'riddle23',
    question: 'What can travel around the world while staying in a corner?',
    options: {
      A: 'A Shadow',
      B: 'A Stamp',
      C: 'A Compass'
    },
    correct: 'B'
  },
  {
    id: 'riddle24',
    question: 'What has a head, a tail, is brown, and has no legs?',
    options: {
      A: 'A Worm',
      B: 'A Coin',
      C: 'A Lizard'
    },
    correct: 'B'
  },
  {
    id: 'riddle25',
    question: 'The more you have of it, the less you see. What is it?',
    options: {
      A: 'Fog',
      B: 'Darkness',
      C: 'Snow'
    },
    correct: 'B'
  },
  {
    id: 'riddle26',
    question: 'What runs but never walks, has a mouth but never talks, has a head but never weeps, has a bed but never sleeps?',
    options: {
      A: 'A River',
      B: 'A Clock',
      C: 'The Wind'
    },
    correct: 'A'
  },
  {
    id: 'riddle27',
    question: 'What has one eye but cannot see?',
    options: {
      A: 'A Needle',
      B: 'A Hurricane',
      C: 'A Potato'
    },
    correct: 'A'
  },
  {
    id: 'riddle28',
    question: 'What building has the most stories?',
    options: {
      A: 'A Library',
      B: 'A Castle',
      C: 'A Skyscraper'
    },
    correct: 'A'
  },
  {
    id: 'riddle29',
    question: 'I shave every day, but my beard stays the same. What am I?',
    options: {
      A: 'A Statue',
      B: 'A Barber',
      C: 'A Soldier'
    },
    correct: 'B'
  },
  {
    id: 'riddle30',
    question: 'What invention lets you look right through a wall?',
    options: {
      A: 'A Mirror',
      B: 'A Window',
      C: 'A Periscope'
    },
    correct: 'B'
  },
];

// Riddle puzzle logic
function generateRandomRiddle() {
  const randomIndex = Math.floor(Math.random() * RIDDLES.length);
  return RIDDLES[randomIndex];
}

function handleRiddleAnswer(lobby, api, player, selectedOption) {
  const combat = lobby.state.combat;
  
  // If no riddle is set yet, generate one (fallback for non-riddlemaster puzzles)
  if (!combat.currentRiddle) {
    combat.currentRiddle = generateRandomRiddle();
    combat.riddleAnswered = false;
    
    // Send riddle to host for display
    api.sendToHost('riddleDisplay', {
      question: combat.currentRiddle.question,
      options: combat.currentRiddle.options,
      riddleId: combat.currentRiddle.id
    });
    
    api.sendToHost('animateAction', {
      actor: 'The Riddlemaster',
      action: 'The Riddlemaster',
      type: 'popup',
      message: 'Solve the riddle to pass.',
      color: '#ffaa00'
    });
  }
  
  // Check if already answered
  if (combat.riddleAnswered) {
    return {
      actor: player.username,
      action: `Choose Option ${selectedOption}`,
      results: [`${player.username} chooses option ${selectedOption}, but the riddle has already been answered!`],
      hit: false,
      crit: false,
      damage: 0,
      heal: 0
    };
  }
  
  // Check if answer is correct
  const isCorrect = selectedOption === combat.currentRiddle.correct;
  
  if (isCorrect) {
    // Correct answer - puzzle solved!
    combat.puzzleSuccess = true;
    combat.riddleAnswered = true;
    
    // Kill the riddlemaster statue
    const riddlemaster = combat.enemies.find(e => e.id.includes('riddlemaster_statue'));
    if (riddlemaster) {
      killEnemy(riddlemaster, 'Riddle answered correctly');
    }
    
    api.sendToHost('animateAction', {
      actor: 'The Riddlemaster',
      type: 'popup',
      action: 'CORRECT!',
      message: `"${combat.currentRiddle.options[selectedOption]}" - nods approvingly!`,
      color: '#00ff00'
    });
    
    return {
      actor: player.username,
      action: `Choose Option ${selectedOption}`,
      results: [`${player.username} correctly answers: "${combat.currentRiddle.options[selectedOption]}"`],
      hit: true,
      crit: false,
      damage: 0,
      heal: 0
    };
  } else {
    // Wrong answer - deal damage to the player
    const damage = Math.floor(player.maxHealth * 0.20); // 20% max health damage
    player.health = Math.max(1, player.health - damage);
    
    api.sendToHost('animateAction', {
      actor: 'The Riddlemaster',
      action: 'INCORRECT!',
      type: 'popup',
      message: `"${combat.currentRiddle.options[selectedOption]}" - ${player.username} takes ${damage} damage!`,
      color: '#ff4444'
    });
    
    return {
      actor: player.username,
      action: `Choose Option ${selectedOption}`,
      results: [`${player.username} incorrectly answers: "${combat.currentRiddle.options[selectedOption]}" and takes ${damage} damage!`],
      hit: false,
      crit: false,
      damage: damage,
      heal: 0
    };
  }
}

// Button puzzle logic
function generateButtonSequence(numPlayers) {
  const colors = ['red', 'blue', 'green'];
  const sequence = [];
  
  // Generate sequence equal to number of players
  for (let i = 0; i < numPlayers; i++) {
    sequence.push(colors[Math.floor(Math.random() * colors.length)]);
  }
  
  return sequence;
}

function handleButtonPress(lobby, api, player, buttonColor) {
  const combat = lobby.state.combat;
  
  // Initialize button sequence if not exists
  if (!combat.buttonSequence) {
    const numPlayers = Object.values(lobby.state.players).filter(p => p.health > 0).length;
    combat.buttonSequence = generateButtonSequence(numPlayers);
    combat.buttonSequenceProgress = 0;
    console.log(`[PUZZLE] Generated button sequence: ${combat.buttonSequence.join(' -> ')}`);
    
    // Send initial puzzle message via action popup
    api.sendToHost('animateAction', {
      actor: 'Ancient Mechanism',
      type: 'popup',
      action: 'Ancient Mechanism',
      message: 'Press the buttons in the correct sequence!',
      color: '#ffaa00'
    });
  }
  
  // Check if this button press is correct
  const expectedColor = combat.buttonSequence[combat.buttonSequenceProgress];
  let isCorrect = buttonColor === expectedColor;

  if(!isCorrect) {
    api.sendToPlayer(player.id, 'playerAlert', { title: 'Wrong!', text: 'Your button press was WRONG! Sequence reset.' });
  }
  
  if (isCorrect) {
    combat.buttonSequenceProgress++;
    api.sendToPlayer(player.id, 'playerAlert', { title: 'Correct!', text: 'Your button press was CORRECT!' });
    
    // Check if sequence is complete
    if (combat.buttonSequenceProgress >= combat.buttonSequence.length) {
      // Puzzle solved!
      combat.puzzleSuccess = true;
      
      // Kill the puzzle statue
      const statue = combat.enemies.find(e => e.id.includes('puzzle_statue'));
      if (statue) {
        killEnemy(statue, 'Puzzle solved');
      }
      
      // Send success message via action popup
      api.sendToHost('animateAction', {
        actor: 'Ancient Mechanism',
        action: 'SUCCESS!',
        type: 'popup',
        message: 'The mechanism activates! You win!',
        color: '#00ff00'
      });
      
      return {
        actor: player.username,
        action: `Press ${buttonColor} Button`,
        results: [`${player.username} presses the ${buttonColor} button correctly!`],
        hit: true,
        crit: false,
        damage: 0,
        heal: 0
      };
    } else {
      // Correct but sequence not complete
      api.sendToHost('animateAction', {
        actor: 'Ancient Mechanism',
        action: 'Correct!',
        type: 'popup',
        message: `${combat.buttonSequenceProgress}/${combat.buttonSequence.length} buttons pressed`,
        color: '#00ff00'
      });
      
      return {
        actor: player.username,
        action: `Press ${buttonColor} Button`,
        results: [`${player.username} presses the ${buttonColor} button correctly!`],
        hit: true,
        crit: false,
        damage: 0,
        heal: 0
      };
    }
  } else {
    // Wrong button - reset progress and deal damage to all players
    combat.buttonSequenceProgress = 0;
    
    // Deal 5% max health damage to all players
    Object.values(lobby.state.players).forEach(player => {
      if (player.health > 0) {
        const damage = Math.floor(player.maxHealth * 0.05); // 5% max health damage
        player.health = Math.max(1, player.health - damage);
      }
    });
    
    // Send failure message via action popup
    api.sendToHost('animateAction', {
      actor: 'Ancient Mechanism',
      action: 'Wrong button!',
      type: 'popup',
      message: 'All players take damage! Sequence reset.',
      color: '#ff4444'
    });
    
    return {
      actor: player.username,
      action: `Press ${buttonColor} Button`,
      results: [`${player.username} presses the ${buttonColor} button, but it's wrong! All players take 5% max health damage and the sequence resets.`],
      hit: false,
      crit: false,
      damage: 0,
      heal: 0
    };
  }
}


// ============= RECONNECTION HELPER FUNCTIONS =============

function sendFullGameState(lobby, api, player) {
  console.log(`[RPG] sendFullGameState called for ${player.username}, phase: ${lobby.state.phase}, socketId: ${player.id}`);
  const playerData = lobby.state.players[player.username];
  
  if (!playerData) {
    console.error(`[RPG] Cannot send game state - player ${player.username} not found`);
    return;
  }
  
  const classData = playerData.class ? CLASSES[playerData.class] : null;
  
  const payload = {
    phase: lobby.state.phase,
    playerData: {
      ...playerData,
      baseHealth: classData ? classData.baseHealth : 0,
      baseDefense: classData ? classData.baseDefense : 0
    },
    availableClasses: Object.keys(CLASSES),
    selectedClasses: lobby.state.selectedClasses
  };
  
  console.log(`[RPG] Constructed payload for ${player.username}: phase=${payload.phase}, class=${playerData.class}`);
  
  // Add phase-specific data
  if (lobby.state.phase === 'combat' && lobby.state.combat) {
    payload.combat = {
      enemies: lobby.state.combat.enemies.map(e => ({
        id: e.id,
        name: e.name,
        health: e.currentHealth,
        maxHealth: e.maxHealth,
        defense: e.currentDefense,
        sprite: e.sprite,
        scale: e.scale,
        tint: e.tint
      })),
      round: lobby.state.round,
      encounterType: lobby.state.combat.encounterType,
      turnOrder: lobby.state.combat.turnOrder
    };
    
    console.log(`[RPG] Sending combat state to ${player.username}`);
  }
  
  if (lobby.state.phase === 'camp' && lobby.state.camp) {
    payload.camp = {
      round: lobby.state.camp.round,
      maxRounds: lobby.state.camp.maxRounds
    };
    // Include current actions if available
    if (lobby.state.camp.currentActions && lobby.state.camp.currentActions.length > 0) {
      payload.camp.currentActions = lobby.state.camp.currentActions;
    }
    console.log(`[RPG] Sending camp state to ${player.username}`);
  }
  
  if (lobby.state.phase === 'skill_learning' && lobby.state.skillLearning) {
    const availableSkills = lobby.state.skillLearning.availableSkills[player.username];
    if (availableSkills) {
      payload.skillLearning = {
        availableSkills: availableSkills
      };
      console.log(`[RPG] Sending skill learning state to ${player.username}`);
    }
  }
  
  if (lobby.state.phase === 'talent_learning' && lobby.state.talentLearning) {
    const availableTalents = lobby.state.talentLearning.availableTalents[player.username];
    if (availableTalents) {
      payload.talentLearning = {
        availableTalents: availableTalents
      };
      console.log(`[RPG] Sending talent learning state to ${player.username}`);
    }
  }
  
  if (lobby.state.phase === 'pick_a_path' && lobby.state.pickAPath) {
    payload.pickAPath = {
      leftDescription: lobby.state.pickAPath.leftDescription,
      rightDescription: lobby.state.pickAPath.rightDescription,
      votes: lobby.state.pickAPath.votes
    };
    console.log(`[RPG] Sending pick a path state to ${player.username}`);
  }
  
  if (lobby.state.phase === 'loot' && lobby.state.loot) {
    const currentItemId = lobby.state.loot.items[lobby.state.loot.currentItemIndex];
    const currentItem = currentItemId ? ITEMS[currentItemId] : null;
    
    if (currentItem) {
      payload.loot = {
        currentItemId: currentItemId,
        currentItem: {
          id: currentItem.id,
          name: currentItem.name,
          description: currentItem.description,
          icon: currentItem.icon,
          iconFallback: currentItem.iconFallback,
          rarity: currentItem.rarity
        },
        currentItemIndex: lobby.state.loot.currentItemIndex,
        totalItems: lobby.state.loot.items.length
      };
      console.log(`[RPG] Sending loot state to ${player.username}`);
    }
  }
  
  // Send the game state
  console.log(`[RPG] Sending gameState event to socketId: ${player.id} for ${player.username}`);
  api.sendToPlayer(player.id, 'gameState', payload);
  
  // If in combat and it's this player's turn, resend action options
  if (lobby.state.phase === 'combat' && lobby.state.combat) {
    const pending = lobby.state.combat.pendingActions[player.username];
    if (pending && pending.actions.length < pending.totalActions) {
      // Player was in the middle of selecting actions - resend options
      console.log(`[RPG] Resending action options to ${player.username} (${pending.actions.length}/${pending.totalActions} actions selected)`);
      setTimeout(() => {
        showNextActionOptions(lobby, api, player);
      }, 500);
    }
  }
  
  console.log(`[RPG] Full game state sent to ${player.username} (phase: ${lobby.state.phase})`);
}

module.exports = {
  meta: {
    id: 'rpg',
    name: 'Co-op RPG Quest',
    minPlayers: 2,
    maxPlayers: 6,
    description: 'Team up with friends in an epic RPG adventure!'
  },

  onInit(lobby, api) {
    lobby.state = {
      phase: 'class_selection',
      players: {},
      selectedClasses: {},
      combat: null,
      round: 0
    };

    api.sendToAll('gameState', {
      phase: 'class_selection',
      availableClasses: Object.keys(CLASSES)
    });

    api.sendToHost('hostGameUpdate', {
      phase: 'class_selection',
      message: 'Players are choosing their classes...',
      players: []
    });
  },

  onPlayerJoin(lobby, api, player, isReconnection = false) {
    // Standardized reconnection handling - system level detects reconnections
    // This function now only handles new player joins
    if (isReconnection) {
      // This shouldn't happen - system should call onPlayerReconnect instead
      // But fallback to reconnection logic for backward compatibility
      console.log(`[RPG] onPlayerJoin called with isReconnection=true for ${player.username} - should use onPlayerReconnect`);
      return this.onPlayerReconnect(lobby, api, player, player.previousSocketId);
    }
    
    // NEW PLAYER: First time joining this game
    console.log(`[RPG] New player ${player.username} joining game`);
    
    // Check if player already exists (shouldn't happen for new players, but safety check)
    if (lobby.state.players[player.username]) {
      console.log(`[RPG] Warning: Player ${player.username} already exists in game state - treating as reconnection`);
      return this.onPlayerReconnect(lobby, api, player, null);
    }
    
    lobby.state.players[player.username] = {
      id: player.id,
      username: player.username,
      userId: player.userId,
      class: null,
      health: 0,
      maxHealth: 0,
      defense: 0,
      actions: [],
      items: [],
      learnedSkills: [],
      learnedTalents: [],
      statusEffects: [], // Array of { effectId, duration, appliedBy }
      abilityUses: {}, // Track uses per combat: { abilityId: remainingUses }
      itemEffects: {}
    };
    
    // Initialize item effects for the new player
    applyItemEffects(lobby, player.username);
    
    // Send initial game state
    sendFullGameState(lobby, api, player);
  },

  onPlayerReconnect(lobby, api, player, previousSocketId) {
    // Standardized reconnection handler
    console.log(`[RPG] onPlayerReconnect called for ${player.username}, phase: ${lobby.state.phase}, socketId: ${player.id}`);
    const existingPlayer = lobby.state.players[player.username];
    
    if (!existingPlayer) {
      console.log(`[RPG] Warning: onPlayerReconnect called for ${player.username} but player not found in game state`);
      // Treat as new player
      return this.onPlayerJoin(lobby, api, player, false);
    }
    
    // RECONNECTION: Player already exists in game state
    console.log(`[RPG] Player ${player.username} reconnecting (old socket: ${previousSocketId || existingPlayer.id}, new socket: ${player.id})`);
    
    // Update socket.id for message routing (system should have already done this, but ensure it's correct)
    existingPlayer.id = player.id;
    existingPlayer.userId = player.userId; // Update userId in case it changed
    
    // Send full game state to reconnected player after a delay to ensure client is ready
    // This prevents the client from showing wrong UI before gameState arrives
    console.log(`[RPG] Scheduling sendFullGameState for ${player.username}, will be sent in 1500ms`);
    setTimeout(() => {
      console.log(`[RPG] Sending full game state to ${player.username} now`);
      sendFullGameState(lobby, api, player);
    }, 1500);
    
    // Notify other players of reconnection (system also sends this, but game can add game-specific info)
    api.sendToAll('playerReconnected', {
      player: { username: player.username, id: player.id },
      message: `${player.username} has reconnected`
    });
    
    console.log(`[RPG] Player ${player.username} successfully reconnected with character data intact`);
  },

  onAction(lobby, api, player, data) {
    const { action, payload } = data;
    console.log(`[ACTION] Received action: ${action} from player: ${player?.username}`);

    switch (action) {
      case 'selectTalent':
        handleTalentSelection(lobby, api, player, payload);
        break;
      case 'selectClass':
        handleClassSelection(lobby, api, player, payload);
        break;
      
      case 'selectAction':
        handleActionSelection(lobby, api, player, payload);
        break;

      case 'selectTarget':
        handleTargetSelection(lobby, api, player, payload);
        break;
      
      case 'selectCampAction':
        handleCampActionSelection(lobby, api, player, payload);
        break;
      
      case 'selectSkill':
        handleSkillSelection(lobby, api, player, payload);
        break;
      
      case 'lootRoll':
        handleLootRoll(lobby, api, player, payload);
        break;
      
      case 'lootPass':
        handleLootPass(lobby, api, player, payload);
        break;
      
      case 'lootPhaseComplete':
        handleLootPhaseComplete(lobby, api);
        break;
      
      case 'requestActionOptions':
        handleRequestActionOptions(lobby, api, player);
        break;
      
      case 'requestCampOptions':
        handleRequestCampOptions(lobby, api, player);
        break;
      
      case 'requestHostState':
        handleRequestHostState(lobby, api);
        break;
      
      case 'pathVote':
        handlePathVote(lobby, api, player, payload);
        break;

      default:
        console.log(`Unknown action: ${action}`);
    }
  },

  onEnd(lobby, api) {
    // Cleanup
    lobby.state = null;
  },
  
  playerResync(lobby, api, player) {
    // Check if this player exists in the game state by username
    const existingPlayer = lobby.state.players[player.username];
    
    if (!existingPlayer) {
      console.log(`[RPG RESYNC] Player ${player.username} not found in game state`);
      return false;
    }
    
    console.log(`[RPG RESYNC] Player ${player.username} found in game state, resyncing...`);
    
    // Update socket.id for message routing
    existingPlayer.id = player.id;
    existingPlayer.userId = player.userId;
    
    // Send full game state to reconnected player
    sendFullGameState(lobby, api, player);
    
    // Notify other players of reconnection
    api.sendToAll('playerReconnected', {
      player: { username: player.username, id: player.id },
      message: `${player.username} has reconnected`
    });
    
    console.log(`[RPG RESYNC] Player ${player.username} successfully resynced`);
    
    return true; // Successfully reconnected
  }
};

// ============= ITEM FUNCTIONS =============

function applyItemEffects(lobby, usernameOrId) {
  // Support both username (new) and id (legacy during migration)
  let player = lobby.state.players[usernameOrId];
  if (!player) {
    // Try to find by socket id (backwards compatibility)
    player = Object.values(lobby.state.players).find(p => p.id === usernameOrId);
  }
  if (!player) return;
  
  // Reset item effects
  player.itemEffects = {
    maxHealth: 0,
    physicalDamage: 0,
    magicDamage: 0,
    critChance: 0,
    defense: 0,
    healingBonus: 0,
    speed: 0,
    speedRoll: 0,
    hitChance: 0,
    physicalVamp: 0,
    magicVamp: 0,
    threat: 0,
    grantAdditionalActions: 0,
    abilityBuffs: {}, // { abilityId: { damage: percentage, healing: percentage } }
    addBonusUses: {}, // { abilityId: additionalUses }
    statusDamageBonus: {} // { statusEffectId: percentage }
  };
  
  // Apply effects from each item
  player.items.forEach(itemId => {
    const item = ITEMS[itemId];
    if (!item || !item.effects) return;
    
    Object.entries(item.effects).forEach(([effect, value]) => {
      if (effect === 'abilityBuffs') {
        // Handle ability-specific buffs
        if (typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([abilityId, buffs]) => {
            if (!player.itemEffects.abilityBuffs[abilityId]) {
              player.itemEffects.abilityBuffs[abilityId] = { damage: 0, healing: 0, repeats: 0 };
            }
            if (buffs.damage) player.itemEffects.abilityBuffs[abilityId].damage += buffs.damage;
            if (buffs.healing) player.itemEffects.abilityBuffs[abilityId].healing += buffs.healing;
            if (buffs.repeats) player.itemEffects.abilityBuffs[abilityId].repeats += buffs.repeats;
          });
        }
               } else if (effect === 'statusDamageBonus') {
                 // Handle status effect damage bonuses
                 if (typeof value === 'object' && value !== null) {
                   Object.entries(value).forEach(([statusEffectId, bonus]) => {
                     if (!player.itemEffects.statusDamageBonus[statusEffectId]) {
                       player.itemEffects.statusDamageBonus[statusEffectId] = 0;
                     }
                     player.itemEffects.statusDamageBonus[statusEffectId] += bonus;
                   });
                 }
               } else if (effect === 'addBonusUses') {
                 // Handle bonus uses for specific abilities
                 if (typeof value === 'object' && value !== null) {
                   Object.entries(value).forEach(([abilityId, bonusUses]) => {
                     if (!player.itemEffects.addBonusUses[abilityId]) {
                       player.itemEffects.addBonusUses[abilityId] = 0;
                     }
                     player.itemEffects.addBonusUses[abilityId] += bonusUses;
                   });
                 }
               } else if (player.itemEffects.hasOwnProperty(effect)) {
                 player.itemEffects[effect] += value;
               }
    });
  });
  
  // Apply effects to player stats
  const classData = CLASSES[player.class];
  if (classData) {
    player.maxHealth = classData.baseHealth + player.itemEffects.maxHealth;
    player.health = Math.min(player.health, player.maxHealth); // Cap current health
    player.defense = classData.baseDefense + player.itemEffects.defense;
    player.speed = (player.speed || 15) + player.itemEffects.speed;
  } else {
    console.warn(`[ITEM EFFECTS] No class data found for player ${player.username} with class ${player.class}`);
  }
  
  return player.itemEffects;
}

function getRandomConsumableItem(encounterNumber = 0) {
  // Get all consumable items from ITEMS
  let consumables = Object.values(ITEMS).filter(item => {
    if (!item.consumable) return false;
    
    // Check minEncounterNumber if it exists
    if (item.minEncounterNumber !== undefined && encounterNumber < item.minEncounterNumber) {
      return false;
    }
    
    return true;
  });
  
  if (consumables.length === 0) {
    console.warn('[LOOT] No consumable items found in ITEMS database');
    return null;
  }
  
  // Rarity weights (higher = more common)
  const rarityWeights = {
    common: 100,
    uncommon: 40,
    rare: 15,
    epic: 5,
    legendary: 1
  };
  
  // Calculate total weight
  let totalWeight = 0;
  consumables.forEach(item => {
    const rarity = item.rarity || 'common';
    totalWeight += rarityWeights[rarity] || 10;
  });
  
  // Weighted random selection
  let random = Math.random() * totalWeight;
  let cumulativeWeight = 0;
  
  for (const item of consumables) {
    const rarity = item.rarity || 'common';
    cumulativeWeight += rarityWeights[rarity] || 10;
    
    if (random <= cumulativeWeight) {
      return item.id;
    }
  }
  
  // Fallback (shouldn't reach here)
  return consumables[0].id;
}

function generateLoot(encounterDifficulty = 'medium', lobby, encounterNumber, lootModifier = 'Normal') {
  console.log(`[LOOT] generateLoot called with encounterNumber: ${encounterNumber}, lootModifier: ${lootModifier}`);
  const lootTable = LOOT_TABLES.items;
  // Drop 1 item per player in the game
  const alivePlayers = Object.values(lobby.state.players).filter(p => p.health > 0);
  let numItems = Math.max(1, alivePlayers.length); // At least 1 item, or 1 per alive player
  
  // Apply loot modifier
  if (lootModifier === 'Plentiful') {
    numItems = numItems * 2; // Double the items
  }
  
  const loot = [];
  
  // Get all talent item IDs to exclude from loot
  const talentItemIds = new Set();
  Object.values(CLASSES).forEach(classData => {
    if (classData.talents) {
      classData.talents.forEach(talent => {
        talentItemIds.add(talent.id);
      });
    }
  });
  
  // Filter loot table to exclude talent items
  const filteredLootTable = lootTable.filter(item => !talentItemIds.has(item.id));
  
  // Calculate total weight for filtered predetermined items
  const totalWeight = filteredLootTable.reduce((sum, item) => sum + item.weight, 0);

  if(Math.random() < 0.5) {
    const numConsumables = Math.floor(Math.random() * 1) + 1;
    for(let i = 0; i < numConsumables; i++) {
      const consumableItem = getRandomConsumableItem(encounterNumber);
      if(consumableItem) {
        loot.push(consumableItem);
      }
    }
  }

  if(encounterNumber == 5) {
    console.log(`[LOOT] Boss encounter 5: Adding dragon_fang`);
    loot.push('dragon_fang')
  }
  if(encounterNumber == 10) {
    console.log(`[LOOT] Boss encounter 10: Adding lich_scepter`);
    loot.push('lich_scepter')
  }
  if(encounterNumber == 15) {
    console.log(`[LOOT] Boss encounter 15: Adding 2x dragon_fang`);
    loot.push('dragon_fang')
    loot.push('dragon_fang')
  }
  if(encounterNumber == 20) {
    console.log(`[LOOT] Boss encounter 20: Adding lich_scepter`);
    loot.push('lich_scepter')
  }
  if(encounterNumber == 25) {
    console.log(`[LOOT] Boss encounter 25: Adding black_blade`);
    loot.push('black_blade')
  }
  if(encounterNumber == 30) {
    console.log(`[LOOT] Boss encounter 30: Adding lich_scepter`);
    loot.push('lich_scepter')
  }
  
  for (let i = 0; i < numItems; i++) {
    const randomItem = createItem(encounterNumber, false, lootModifier);
    /*const isRandomItem = Math.random() < 0.3; // 30% chance for random item
    
    if (isRandomItem) {
      // Generate random item with rarity distribution
      const rarityRoll = Math.random();
      let rarity;
      if (rarityRoll < 0.6) rarity = 'common';      // 60%
      else if (rarityRoll < 0.85) rarity = 'uncommon'; // 25%
      else if (rarityRoll < 0.95) rarity = 'rare';     // 10%
      else rarity = 'legendary';                        // 5%
      
      const randomItem = generateRandomItemForLobby(lobby, rarity);
      console.log(`[LOOT] Generated random item: ${randomItem.name} (ID: ${randomItem.id})`);
      
      // Ensure item has required properties
      if (!randomItem || !randomItem.id || !randomItem.name) {
        console.error(`[LOOT] ERROR: Generated item is invalid:`, randomItem);
        continue; // Skip this item and try again
      }
      
      // Add the generated item to ITEMS database if not already there
      if (!ITEMS[randomItem.id]) {
        ITEMS[randomItem.id] = randomItem;
        console.log(`[LOOT] Added random item to ITEMS database: ${randomItem.name} (${randomItem.id})`);
      } else {
        console.log(`[LOOT] Random item already exists in database: ${randomItem.name} (${randomItem.id})`);
      }
      
      // Verify the item was added correctly*/
      if (!ITEMS[randomItem.id]) {
        console.error(`[LOOT] ERROR: Failed to add item to database!`);
        continue; // Skip this item
      }
      
      // Push the item ID to loot
      loot.push(randomItem.id);
      console.log(`[LOOT] Added item ID to loot array: ${randomItem.id}`);
    /*} else {
      // Use filtered predetermined loot table (70% chance)
      const random = Math.random() * totalWeight;
      let cumulativeWeight = 0;
      
      for (let j = 0; j < filteredLootTable.length; j++) {
        cumulativeWeight += filteredLootTable[j].weight;
        if (random <= cumulativeWeight) {
          loot.push(filteredLootTable[j].id);
          break;
        }
      }
    }*/
  }
  
  console.log(`[LOOT] Generated ${loot.length} items:`, loot);
  console.log(`[LOOT] Final loot array contains:`, loot.map(id => ({ id, name: ITEMS[id]?.name || 'MISSING' })));
  return loot;
}

function processLootRolls(lobby, itemId, rolls, api) {
  // Find highest roll
  let highestRoll = 0;
  let winner = null;
  
  Object.entries(rolls).forEach(([playerId, roll]) => {
    if (roll > highestRoll) {
      highestRoll = roll;
      winner = playerId;
    }
  });
  
  if (winner && lobby.state.players[winner]) {
    // Give item to winner
    lobby.state.players[winner].items.push(itemId);
    
    console.log(`[LOOT] Item ${itemId} awarded to ${lobby.state.players[winner].username}`);
    
    // Recalculate item effects
    applyItemEffects(lobby, winner);
    
    // Send item data to winner so they can see it in inventory
    const item = ITEMS[itemId];
    const winnerPlayer = lobby.state.players[winner];
    if (item && winnerPlayer) {
      api.sendToPlayer(winnerPlayer.id, 'itemAwarded', {
        itemId: itemId,
        name: item.name,
        description: item.description,
        icon: item.icon,
        iconFallback: item.iconFallback,
        rarity: item.rarity,
        talent: item.talent === true
      });
    }
    
    // Send updated player data to the winner so their item list updates
  if (winnerPlayer) {
    api.sendToPlayer(winnerPlayer.id, 'gameState', {
      phase: lobby.state.phase,
      playerData: {
        items: lobby.state.players[winner].items,
        health: lobby.state.players[winner].health,
      maxHealth: lobby.state.players[winner].maxHealth,
      defense: lobby.state.players[winner].defense,
      itemEffects: lobby.state.players[winner].itemEffects,
      baseHealth: lobby.state.players[winner].class ? CLASSES[lobby.state.players[winner].class].baseHealth : 0,
      baseDefense: lobby.state.players[winner].class ? CLASSES[lobby.state.players[winner].class].baseDefense : 0
      }
    });
  }
    
    return {
      winner: lobby.state.players[winner].username,
      winnerId: winner,
      roll: highestRoll,
      item: ITEMS[itemId]
    };
  }
  
  return null;
}

// ============= LOOT HANDLERS =============

function handleLootRoll(lobby, api, player, payload) {
  console.log('[LOOT] handleLootRoll called:', { playerName: player.username, payload });
  
  if (!lobby.state.loot) {
    console.log('[LOOT] ERROR: No loot state found!');
    return;
  }
  
  const { itemId } = payload;
  const roll = Math.floor(Math.random() * 100) + 1;
  
  console.log('[LOOT] Player rolled:', { playerName: player.username, roll });
  
  // Store player's roll
  lobby.state.loot.rolls[player.username] = roll;
  lobby.state.loot.playerActions[player.username] = 'roll';
  
  console.log('[LOOT] Current player actions:', lobby.state.loot.playerActions);
  
  // Notify all players of the roll
  api.sendToAll('playerLootAction', {
    playerId: player.id,
    playerName: player.username,
    action: 'roll',
    roll: roll,
    itemId: itemId
  });
  
  // Check if all players have acted
  checkLootCompletion(lobby, api, itemId);
}

function handleLootPass(lobby, api, player, payload) {
  console.log('[LOOT] handleLootPass called:', { playerName: player.username, payload });
  
  if (!lobby.state.loot) {
    console.log('[LOOT] ERROR: No loot state found!');
    return;
  }
  
  const { itemId } = payload;
  
  // Store player's pass
  lobby.state.loot.playerActions[player.username] = 'pass';
  
  console.log('[LOOT] Current player actions:', lobby.state.loot.playerActions);
  
  // Notify all players of the pass
  api.sendToAll('playerLootAction', {
    playerId: player.id,
    playerName: player.username,
    action: 'pass',
    itemId: itemId
  });
  
  // Check if all players have acted
  checkLootCompletion(lobby, api, itemId);
}

function checkLootCompletion(lobby, api, itemId) {
  const alivePlayers = Object.values(lobby.state.players).filter(p => p.health > 0);
  const playersActed = Object.keys(lobby.state.loot.playerActions).length;
  
  console.log(`[LOOT] Loot completion check: ${playersActed}/${alivePlayers.length} players acted`);
  console.log(`[LOOT] Alive players:`, alivePlayers.map(p => ({ id: p.id, username: p.username, health: p.health })));
  console.log(`[LOOT] Player actions:`, lobby.state.loot.playerActions);
  
  // If all alive players have acted, process the item
  if (playersActed >= alivePlayers.length) {
    console.log('[LOOT] All players have acted, processing loot item');
    processCurrentLootItem(lobby, api, itemId);
  } else {
    console.log(`[LOOT] Waiting for ${alivePlayers.length - playersActed} more player(s)`);
  }
}

function processCurrentLootItem(lobby, api, itemId) {
  const rolls = {};
  
  // Collect all rolls
  Object.entries(lobby.state.loot.playerActions).forEach(([playerId, action]) => {
    if (action === 'roll' && lobby.state.loot.rolls[playerId]) {
      rolls[playerId] = lobby.state.loot.rolls[playerId];
    }
  });
  
  // Process rolls and determine winner
  const result = processLootRolls(lobby, itemId, rolls, api);
  
  // Show rolls to all players
  api.sendToAll('lootRolls', {
    itemId: itemId,
    rolls: Object.entries(rolls).map(([playerId, roll]) => ({
      playerId: playerId,
      playerName: lobby.state.players[playerId].username,
      roll: roll
    }))
  });
  
  // Show winner
  if (result) {
    api.sendToAll('lootWinner', result);
  }
  
  // Move to next item after delay
  setTimeout(() => {
    lobby.state.loot.currentItemIndex++;
    
    if (lobby.state.loot.currentItemIndex >= lobby.state.loot.items.length) {
      // All items processed, complete loot phase
      console.log('[LOOT] All items processed, starting new combat');
      api.sendToAll('lootComplete');
      api.sendToHost('lootComplete');
      
      // Clean up loot state and start camp phase after a brief delay
      setTimeout(() => {
        lobby.state.loot = null;
        startCampPhase(lobby, api);
      }, 2000);
    } else {
      // Show next item
      const nextItemId = lobby.state.loot.items[lobby.state.loot.currentItemIndex];
      const nextItem = ITEMS[nextItemId];
      
      // Debug logging and safety check
      console.log(`[LOOT] Next item ID: ${nextItemId}`);
      console.log(`[LOOT] Item exists in ITEMS: ${!!nextItem}`);
      console.log(`[LOOT] Available ITEMS keys: ${Object.keys(ITEMS).slice(0, 10).join(', ')}...`);
      
      if (!nextItem) {
        console.error(`[LOOT] ERROR: Item with ID '${nextItemId}' not found in ITEMS database!`);
        // Skip this item and try the next one
        lobby.state.loot.currentItemIndex++;
        if (lobby.state.loot.currentItemIndex >= lobby.state.loot.items.length) {
          // No more items, end loot phase
          lobby.state.loot = null;
          lobby.state.phase = 'camp';
          setTimeout(() => {
            startCampPhase(lobby, api);
          }, 2000);
          return;
        } else {
          // Try the next item
          setTimeout(() => {
            processLootRolls(lobby, api);
          }, 1000);
          return;
        }
      }
      
      console.log(`[LOOT] Showing next item: ${nextItem.name}`);
      
      // Reset for next item
      lobby.state.loot.playerActions = {};
      lobby.state.loot.rolls = {};
      
      api.sendToAll('lootItem', {
        itemId: nextItemId,
        icon: nextItem.icon,
        iconFallback: nextItem.iconFallback,
        name: nextItem.name,
        description: nextItem.description,
        rarity: nextItem.rarity
      });
      
      // Also send to host
      api.sendToHost('lootItem', {
        itemId: nextItemId,
        icon: nextItem.icon,
        iconFallback: nextItem.iconFallback,
        name: nextItem.name,
        description: nextItem.description,
        rarity: nextItem.rarity
      });
    }
  }, 3000);
}

function handleLootPhaseComplete(lobby, api) {
  // Clean up loot state
  lobby.state.loot = null;
  
  // Start new combat encounter
  startCombatPhase(lobby, api);
}

// ============= CLIENT STATE REQUEST HANDLERS =============

function handleRequestActionOptions(lobby, api, player) {
  console.log(`[REQUEST] Player ${player.username} requesting action options`);
  
  // Verify we're in combat phase
  if (lobby.state.phase !== 'combat' || !lobby.state.combat) {
    console.log(`[REQUEST] Not in combat phase, ignoring request`);
    return;
  }
  
  // Get player from state
  const playerData = lobby.state.players[player.username];
  if (!playerData) {
    console.log(`[REQUEST] Player ${player.username} not found in state`);
    return;
  }
  
  // Check if player is alive and has a class
  if (playerData.health <= 0 || !playerData.class) {
    console.log(`[REQUEST] Player ${player.username} is dead or has no class`);
    return;
  }
  
  // Check if we're in the selecting phase
  if (lobby.state.combat.roundPhase !== 'selecting') {
    console.log(`[REQUEST] Combat is in ${lobby.state.combat.roundPhase} phase, not selecting`);
    return;
  }
  
  // Check if player has already selected all their actions
  const pending = lobby.state.combat.pendingActions[player.username];
  if (pending && pending.actions.length >= pending.totalActions) {
    console.log(`[REQUEST] Player ${player.username} has already selected all actions`);
    return;
  }
  
  // If player has partially selected actions, send next action options
  if (pending && pending.actions.length < pending.totalActions) {
    console.log(`[REQUEST] Sending next action options to ${player.username} (${pending.actions.length}/${pending.totalActions} selected)`);
    showNextActionOptions(lobby, api, playerData);
    return;
  }
  
  // Player hasn't started selecting yet - send initial action options
  console.log(`[REQUEST] Sending initial action options to ${player.username}`);
  
  let actionOptions = [];
  
  // Check if puzzle encounter
  if (lobby.state.combat.encounterType === ENCOUNTER_TYPE_PUZZLE) {
    const puzzleConfig = lobby.state.combat.puzzleConfig;
    const puzzleActions = puzzleConfig.actions.map(actionId => PUZZLE_ACTIONS[actionId]).filter(a => a);
    actionOptions = getRandomActions(puzzleActions, 3);
  } else {
    // Regular combat actions
    const encounterNumber = lobby.state.encounterNumber || 1;
    const unlockedActions = playerData.actions.filter(action => {
      const requiredLevel = action.level || 1;
      return encounterNumber >= requiredLevel;
    });
    
    // Filter out abilities that have no remaining uses
    const availableActions = unlockedActions.filter(action => {
      if (action.usesPerCombat) {
        const remainingUses = playerData.abilityUses[action.id] || 0;
        return remainingUses > 0;
      }
      return true;
    });
    
    actionOptions = getRandomActions(availableActions, 3);
  }
  
  // Store the action options
  if (!lobby.state.combat.playerActionOptions) {
    lobby.state.combat.playerActionOptions = {};
  }
  lobby.state.combat.playerActionOptions[player.username] = [...actionOptions];
  
  // Scale actions for this player
  const scaledActions = [...actionOptions].map(action => scaleActionForPlayer(action, playerData, lobby));
  
  // Get consumable item actions (always available, separate from random actions)
  const items = getPlayerItems(playerData);
  const consumableActions = [];
  const seenConsumables = new Set();
  items.forEach(item => {
    if (item.consumable && item.on_use && !seenConsumables.has(item.id)) {
      seenConsumables.add(item.id);
      const itemCount = playerData.items.filter(id => id === item.id).length;
      consumableActions.push({
        ...item.on_use,
        consumableItemId: item.id,
        isConsumable: true,
        consumableCount: itemCount
      });
    }
  });
  const scaledConsumables = consumableActions.map(action => scaleActionForPlayer(action, playerData, lobby));
  
  // Send to player
  api.sendToPlayer(player.id, 'actionOptions', {
    actions: scaledActions,
    consumables: scaledConsumables,
    yourTurn: lobby.state.combat.turnOrder ? lobby.state.combat.turnOrder.findIndex(t => t.username === player.username) : -1,
    selectedActionIds: []
  });
  
  console.log(`[REQUEST] Sent ${scaledActions.length} action options + ${scaledConsumables.length} consumables to ${player.username}`);
}

function handleRequestHostState(lobby, api) {
  console.log(`[REQUEST] Host requesting current game state`);
  
  if (lobby.state.phase === 'class_selection') {
    api.sendToHost('hostGameUpdate', {
      phase: 'class_selection',
      message: 'Players are choosing their classes...',
      players: Object.values(lobby.state.players).map(p => ({
        username: p.username,
        class: p.class || null
      }))
    });
  } else if (lobby.state.phase === 'combat' && lobby.state.combat) {
    // Send combat state
    api.sendToHost('hostGameUpdate', {
      phase: 'combat',
      round: lobby.state.round,
      players: Object.values(lobby.state.players).map(p => ({
        id: p.id,
        username: p.username,
        class: p.class,
        health: p.health,
        maxHealth: p.maxHealth,
        defense: p.defense
      })),
      enemies: lobby.state.combat.enemies.map(e => ({
        id: e.id,
        name: e.name,
        health: e.currentHealth,
        maxHealth: e.maxHealth,
        defense: e.currentDefense,
        sprite: e.sprite,
        scale: e.scale,
        tint: e.tint
      })),
      turnOrder: lobby.state.combat.turnOrder || [],
      message: 'Combat in progress...',
      encounterType: lobby.state.combat.encounterType,
      puzzleMaxRounds: lobby.state.combat.puzzleMaxRounds,
      puzzleType: lobby.state.combat.puzzleType
    });
  } else if (lobby.state.phase === 'camp' && lobby.state.camp) {
    // Send camp state
    api.sendToHost('hostGameUpdate', {
      phase: 'camp',
      players: Object.values(lobby.state.players),
      round: lobby.state.camp.round,
      maxRounds: lobby.state.camp.maxRounds
    });
  }
}

function handleRequestCampOptions(lobby, api, player) {
  console.log(`[REQUEST] Player ${player.username} requesting camp options`);
  
  // Verify we're in camp phase
  if (lobby.state.phase !== 'camp' || !lobby.state.camp) {
    console.log(`[REQUEST] Not in camp phase, ignoring request`);
    return;
  }
  
  // Get player from state
  const playerData = lobby.state.players[player.username];
  if (!playerData) {
    console.log(`[REQUEST] Player ${player.username} not found in state`);
    return;
  }
  
  // Check if player has already selected a camp action
  if (lobby.state.camp.pendingActions[player.username]) {
    console.log(`[REQUEST] Player ${player.username} has already selected a camp action`);
    return;
  }
  
  // Get current camp actions
  const currentActions = lobby.state.camp.currentActions || [];
  
  if (currentActions.length === 0) {
    console.log(`[REQUEST] No camp actions available`);
    return;
  }
  
  // Send camp options to player
  api.sendToPlayer(player.id, 'campRoundStarted', {
    round: lobby.state.camp.round,
    maxRounds: lobby.state.camp.maxRounds,
    actions: currentActions.map(action => ({
      id: action.id,
      name: action.name,
      description: action.description,
      icon: action.icon
    }))
  });
  
  console.log(`[REQUEST] Sent ${currentActions.length} camp options to ${player.username}`);
}

// ============= TALENT HELPER FUNCTION =============

const ITEMS = {
  // Consumable items
  health_potion: {
    id: 'health_potion',
    name: 'Health Potion',
    description: 'Use to restore 30 health',
    type: 'consumable',
    rarity: 'common',
    consumable: true,
    on_use: {
      id: 'use_health_potion',
      name: 'Use Health Potion',
      sound: 'sound_heal',
      sprite: 'heal',
      heal: 30,
      type: 'heal',
      target: 'self',
      animType: 'support',
      animTime: 1200,
      description: 'Heal $h health to self',
    },
    icon: '/games/rpg/assets/items/health_potion.png',
    iconFallback: '🧪'
  },

  health_potion_1: {
    id: 'health_potion_1',
    name: 'Greater Health Potion',
    description: 'Use to restore 50 health',
    type: 'consumable',
    rarity: 'uncommon',
    minEncounterNumber: 5,
    consumable: true,
    on_use: {
      id: 'use_health_potion_1',
      name: 'Use Greater Health Potion',
      sound: 'sound_heal',
      sprite: 'heal',
      heal: 50,
      type: 'heal',
      target: 'self',
      animType: 'support',
      animTime: 1200,
      description: 'Heal $h health to self',
    },
    icon: '/games/rpg/assets/items/health_potion.png',
    iconFallback: '🧪'
  },

  health_potion_2: {
    id: 'health_potion_2',
    name: 'Superior Health Potion',
    description: 'Use to restore 100 health',
    type: 'consumable',
    rarity: 'rare',
    minEncounterNumber: 10,
    consumable: true,
    on_use: {
      id: 'use_health_potion_2',
      name: 'Use Superior Health Potion',
      sound: 'sound_heal',
      sprite: 'heal',
      heal: 100,
      type: 'heal',
      target: 'self',
      animType: 'support',
      animTime: 1200,
      description: 'Heal $h health to self',
    },
    icon: '/games/rpg/assets/items/health_potion.png',
    iconFallback: '🧪'
  },

  dust_pouch: {
    id: 'dust_pouch',
    name: 'Dust Pouch',
    description: 'Use to stun an enemy',
    type: 'consumable',
    rarity: 'uncommon',
    consumable: true,
    on_use: {
      id: 'use_dust_pouch',
      name: 'Use Dust Pouch',
      sound: 'sound_zap',
      sprite: 'smoke_bomb',
      type: 'debuff',
      target: 'enemy',
      animType: 'spell',
      description: 'Stun an enemy',
      applyStatus: true, statusEffect: 'stun', points: 1, duration: 1,
      animTime: 1200
    },
    icon: '/games/rpg/assets/items/health_potion.png',
    iconFallback: '💨'
  },

  wicked_idol: {
    id: 'wicked_idol',
    name: 'Wicked Idol',
    description: 'Use to curse an enemy, reducing damage by 50% for 3 rounds',
    type: 'consumable',
    rarity: 'uncommon',
    consumable: true,
    on_use: {
      id: 'use_wicked_idol',
      name: 'Use Wicked Idol',
      sound: 'sound_zap',
      sprite: 'hex',
      type: 'debuff',
      target: 'enemy',
      animType: 'spell',
      description: 'Curse en enemy, reducing damage by 50% for 3 rounds',
      applyStatus: true, statusEffect: 'curse', points: 50, duration: 3,
      animTime: 1200
    },
    icon: '/games/rpg/assets/items/health_potion.png',
    iconFallback: '🔮'
  },

  dragon_fang: {
    id: 'dragon_fang',
    name: 'Dragon Fang',
    description: 'Use to deal 20 Magic Damage to all enemies',
    type: 'consumable',
    rarity: 'rare',
    consumable: true,
    minEncounterNumber: 6,
    on_use: {
      id: 'use_dragon_fang',
      name: 'Use Dragon Fang',
      sound: 'sound_flamestrike',
      sprite: 'flamestrike',
      type: 'attack',
      target: 'all_enemies',
      animType: 'spell',
      damage: 20,
      description: 'Deal $d Magic Damage to all enemies',
      damageType: 'magic',
      animTime: 1200
    },
    icon: '/games/rpg/assets/items/health_potion.png',
    iconFallback: '🐉'
  },

  lich_scepter: {
    id: 'lich_scepter',
    name: 'Lich Skull',
    description: 'Use to stun all enemies',
    type: 'consumable',
    rarity: 'epic',
    consumable: true,
    minEncounterNumber: 11,
    on_use: {
      id: 'lich_scepter',
      name: 'Use Lich Skull',
      sound: 'sound_flamestrike',
      sprite: 'frost',
      sound: 'sound_explode',
      type: 'attack',
      target: 'all_enemies',
      description: 'Stun all enemies',

      animType: 'spell',
      applyStatus: true, statusEffect: 'stun', points: 1, duration: 1,
      animTime: 1200
    },
    icon: '/games/rpg/assets/items/health_potion.png',
    iconFallback: '💀'
  },

  black_blade: {
    id: 'black_blade',
    name: 'The Black Blade',
    description: 'Use to deal 80 Magic Damage to an enemy',
    type: 'consumable',
    rarity: 'rare',
    consumable: true,
    minEncounterNumber: 6,
    on_use: {
      id: 'use_black_blade',
      name: 'Use The Black Blade',
      sound: 'sound_flamestrike',
      sprite: 'hex',
      type: 'attack',
      target: 'enemy',
      animType: 'spell',
      damage: 80,
      damageType: 'magic',
      hitChanceModifier: 20,
      description: 'Deal $d Magic Damage to an enemy',
      animTime: 1200
    },
    icon: '/games/rpg/assets/items/health_potion.png',
    iconFallback: '⚔️'
  },

  // Health items
  
  vitality_ring: {
    id: 'vitality_ring',
    name: 'Ring of Vitality',
    description: 'Increases maximum health by 30',
    type: 'accessory',
    rarity: 'uncommon',
    effects: {
      maxHealth: 20
    },
    icon: '/games/rpg/assets/items/vitality_ring.png',
    iconFallback: '💍'
  },
  hp_buff: {
    id: 'hp_buff',
    name: 'Inner Peace',
    description: 'Increases maximum health by 20',
    type: 'accessory',
    rarity: 'uncommon',
    effects: {
      maxHealth: 20
    },
    icon: '/games/rpg/assets/items/hp_buff.png',
    iconFallback: '🧘'
  },
  
  // Damage items
  sharp_sword: {
    id: 'sharp_sword',
    name: 'Sharpened Blade',
    description: 'Increases physical damage by 5',
    type: 'weapon',
    rarity: 'common',
    effects: {
      physicalDamage: 5
    },
    icon: '/games/rpg/assets/items/sharp_sword.png',
    iconFallback: '⚔️'
  },
  
  fire_wand: {
    id: 'fire_wand',
    name: 'Wand of Fire',
    description: 'Increases magic damage by 8',
    type: 'weapon',
    rarity: 'common',
    effects: {
      magicDamage: 5
    },
    icon: '/games/rpg/assets/items/fire_wand.png',
    iconFallback: '🔥'
  },

  vamp_sword: {
    id: 'vamp_sword',
    name: 'Vampiric Sword',
    description: '5% physical lifesteal',
    type: 'weapon',
    rarity: 'uncommon',
    effects: {
      physicalVamp: 5
    },
    icon: '/games/rpg/assets/items/fire_wand.png',
    iconFallback: '🔪'
  },

  vamp_wand: {
    id: 'vamp_wand',
    name: 'Vampiric Wand',
    description: '5% magic lifesteal',
    type: 'weapon',
    rarity: 'uncommon',
    effects: {
      magicVamp: 5
    },
    icon: '/games/rpg/assets/items/fire_wand.png',
    iconFallback: '🩸'
  },
  
  sharpened_weapons: {
    id: 'sharpened_weapons',
    name: 'Sharpened Weapons',
    description: 'Increases physical damage by 3',
    type: 'weapon',
    rarity: 'common',
    effects: {
      physicalDamage: 3
    },
    icon: '/games/rpg/assets/items/sharpened_weapons.png',
    iconFallback: '⚔️'
  },
  
  sharpened_mind: {
    id: 'sharpened_mind',
    name: 'Sharpened Mind',
    description: 'Increases magic damage by 3',
    type: 'accessory',
    rarity: 'common',
    effects: {
      magicDamage: 3
    },
    icon: '/games/rpg/assets/items/sharpened_mind.png',
    iconFallback: '🧠'
  },

  agility_training: {
    id: 'agility_training',
    name: 'Agility Training',
    description: 'Increases speed by 3',
    type: 'accessory',
    rarity: 'common',
    effects: {
      speed: 3
    },
    icon: '/games/rpg/assets/items/sharpened_mind.png',
    iconFallback: '💡'
  },

  accuracy_training: {
    id: 'accuracy_training',
    name: 'Accuracy Training',
    description: 'Increases hit chance by 2',
    type: 'accessory',
    rarity: 'common',
    effects: {
      hitChance: 2
    },
    icon: '/games/rpg/assets/items/sharpened_mind.png',
    iconFallback: '💡'
  },
  
  // Critical strike items
  assassin_hood: {
    id: 'assassin_hood',
    name: 'Assassin\'s Hood',
    description: 'Increases critical strike chance by 10%',
    type: 'armor',
    rarity: 'rare',
    effects: {
      critChance: 10
    },
    icon: '/games/rpg/assets/items/assassin_hood.png',
    iconFallback: '🎭'
  },
  
  // Defense items
  iron_armor: {
    id: 'iron_armor',
    name: 'Iron Armor',
    description: 'Increases defense by 3',
    type: 'armor',
    rarity: 'common',
    effects: {
      defense: 3
    },
    icon: '/games/rpg/assets/items/iron_armor.png',
    iconFallback: '🛡️'
  },
  
  // Healing items
  healer_staff: {
    id: 'healer_staff',
    name: 'Staff of Light',
    description: 'Increases healing done by 50%',
    type: 'weapon',
    rarity: 'rare',
    effects: {
      healingBonus: 50
    },
    icon: '/games/rpg/assets/items/healer_staff.png',
    iconFallback: '🩺'
  },

  healer_wand: {
    id: 'healer_wand',
    name: 'Wand of Healing',
    description: 'Increases healing done by 15%',
    type: 'weapon',
    rarity: 'common',
    effects: {
      healingBonus: 15
    },
    icon: '/games/rpg/assets/items/healer_staff.png',
    iconFallback: '🔮'
  },
  
  // Speed items
  boots_swiftness: {
    id: 'boots_swiftness',
    name: 'Boots of Swiftness',
    description: 'Increases speed by 3',
    type: 'armor',
    rarity: 'uncommon',
    effects: {
      speed: 3
    },
    icon: '/games/rpg/assets/items/boots_swiftness.png',
    iconFallback: '👢'
  },

  bow_accuracy: {
    id: 'bow_accuracy',
    name: 'Elven Bow',
    description: 'Increases hit chance by 3',
    type: 'weapon',
    rarity: 'uncommon',
    effects: {
      hitChance: 3
    },
    icon: '/games/rpg/assets/items/boots_swiftness.png',
    iconFallback: '🏹'
  },
  
  // Speed roll modifier items
  silver_armor: {
    id: 'silver_armor',
    name: 'Silver Platemail',
    description: 'Increases defense by 10',
    type: 'armor',
    rarity: 'rare',
    effects: {
      defense: 10
    },
    icon: '/games/rpg/assets/items/iron_armor.png',
    iconFallback: '🛡️'
  },
  silver_sword: {
    id: 'silver_sword',
    name: 'Enchanted Blade',
    description: 'Increases physical damage by 12',
    type: 'weapon',
    rarity: 'rare',
    effects: {
      physicalDamage: 12
    },
    icon: '/games/rpg/assets/items/iron_armor.png',
    iconFallback: '⚔️'
  },
  silver_wand: {
    id: 'silver_wand',
    name: 'Enchanted Staff',
    description: 'Increases magic damage by 12',
    type: 'weapon',
    rarity: 'rare',
    effects: {
      magicDamage: 12
    },
    icon: '/games/rpg/assets/items/iron_armor.png',
    iconFallback: '🔮'
  },
};

// ============= TALENT HELPER FUNCTION =============

/**
 * Creates a talent and automatically adds it to the ITEMS array
 * @param {string} talentId - Unique ID for the talent
 * @param {string} name - Display name of the talent
 * @param {string} description - Description shown to players
 * @param {number} level - Encounter level when talent becomes available
 * @param {string} rarity - 'common', 'uncommon', 'rare', 'epic', 'legendary'
 * @param {string} icon - Icon emoji or image path
 * @param {string} iconFallback - Fallback emoji if image fails to load
 * @param {object} effects - Item effects object (e.g., { physicalDamage: 15, maxHealth: 20 })
 * @param {string} type - Item type: 'weapon', 'armor', 'accessory', 'consumable' (default: 'accessory')
 * @param {array} procs - Array of proc objects (optional)
 * @returns {object} Talent definition for use in class talents array
 * 
 * Example usage:
 * createTalent('fire_sword', 'Flame Blade', 'A sword wreathed in fire', 3, 'rare', '🔥', '⚔️', { physicalDamage: 20, magicDamage: 10 }, 'weapon')
 * 
 * With procs:
 * createTalent('vampire_blade', 'Vampire Blade', 'A cursed blade that heals on hit', 6, 'rare', '🩸', '⚔️', { physicalDamage: 15 }, 'weapon', [
 *   { trigger: 'onHit', chance: 100, effect: 'heal', value: 5 }
 * ])
 * 
 * With threat and ability buffs:
 * createTalent('tank_armor', 'Tank Armor', 'Heavy armor that draws enemy attention and buffs defensive abilities', 6, 'rare', '🛡️', '🛡️', { 
 *   defense: 15, 
 *   threat: 50, 
 *   abilityBuffs: { 
 *     defend: { damage: 0, healing: 0 }, 
 *     shield_wall: { damage: 25, healing: 0 } 
 *   } 
 * }, 'armor')
 * 
 * With status damage bonus:
 * createTalent('executioner_blade', 'Executioner Blade', 'Deals extra damage to cursed enemies', 9, 'rare', '⚔️', '⚔️', { 
 *   physicalDamage: 20, 
 *   statusDamageBonus: { 
 *     curse: 15  // +15% damage vs cursed enemies
 *   } 
 * }, 'weapon')
 */
function createTalent(talentId, name, description, level, rarity, icon, iconFallback, effects, type = 'accessory', procs = []) {
  // Create the talent definition for the class
  const talent = {
    id: talentId,
    name: name,
    description: description,
    level: level,
    rarity: rarity,
    icon: icon,
    iconFallback: iconFallback,
    // Store the item data for later processing
    _itemData: {
      type: type,
      effects: effects,
      procs: procs,
    }
  };
  
  return talent;
}

// Function to process all talents and add them to ITEMS
function processTalentItems() {
  Object.values(CLASSES).forEach(classData => {
    if (classData.talents) {
      classData.talents.forEach(talent => {
        if (talent._itemData) {
          // Create the corresponding item in ITEMS array
          ITEMS[talent.id] = {
            id: talent.id,
            name: talent.name,
            description: talent.description,
            type: talent._itemData.type,
            rarity: talent.rarity,
            effects: talent._itemData.effects,
            icon: talent.icon.startsWith('/') ? talent.icon : `/games/rpg/assets/items/${talent.id}.png`,
            iconFallback: talent.iconFallback,
            talent: true
          };
          
          // Add procs if provided
          if (talent._itemData.procs && talent._itemData.procs.length > 0) {
            ITEMS[talent.id].procs = talent._itemData.procs;
          }
          
          // Remove the temporary _itemData
          delete talent._itemData;
        }
      });
    }
  });
}

// Process all talent items after both CLASSES and ITEMS are defined
processTalentItems();

// Trigger item procs with PROC_START_OF_COMBAT
function triggerStartOfCombatProcs(lobby, api) {
  Object.values(lobby.state.players).forEach(player => {
    const items = getPlayerItems(player);
    items.forEach(item => {
      if (!item || !item.procs) return;
      // Normalize to array form if older schema had single proc
      const procs = Array.isArray(item.procs) ? item.procs : [item.procs];
      procs.forEach(procDef => {
        if (!procDef || procDef.procTrigger !== PROC_START_OF_COMBAT) return;
        const chance = procDef.procChance ?? 100;
        if (Math.random() * 100 <= chance) {
          // Build an action object from procDef.procAction
          const procAction = { ...procDef.procAction };
          const animationData = {
            actorId: player.id,
            targetId: null,
            action: procAction.name || 'Start of Combat',
            actionId: procAction.id || 'proc_start_of_combat',
            animType: procAction.animType || 'support',
            sound: procAction.sound || procAction.id,
            animTime: procAction.animTime || 1500,
            sprite: procAction.sprite,
            tint: procAction.tint
          };
          // Determine default target if needed
          let targetId = null;
          if (procAction.target === 'self') targetId = player.id;
          if (procAction.target === 'ally') targetId = player.id;
          // Execute
          executePlayerAction(lobby, api, player, procAction, targetId, animationData);
          api.sendToHost('animateAction', animationData);
        }
      });
    });
  });
}

// New actions unlocked by items
const ITEM_ACTIONS = {
  lightning_bolt: {
    id: 'lightning_bolt',
    name: 'Lightning Bolt',
    description: 'Deals 25 magic damage to target',
    type: 'spell',
    damage: 25,
    damageType: 'magic',
    target: 'single_enemy',
    icon: '⚡'
  }
};

// Loot tables for different encounter types
const LOOT_TABLES = {
  items: [
    // Common items (50% drop rate)
    { id: 'health_potion', weight: 12 },
    { id: 'sharp_sword', weight: 10 },
    { id: 'iron_armor', weight: 8 },
    { id: 'fire_wand', weight: 8 },
    { id: 'healer_wand', weight: 8 },
    { id: 'boots_swiftness', weight: 6 },
    
    // Uncommon items (30% drop rate)
    { id: 'vitality_ring', weight: 8 },
    { id: 'assassin_hood', weight: 6 },
    { id: 'bow_accuracy', weight: 6 },
    { id: 'vamp_wand', weight: 5 },
    { id: 'vamp_sword', weight: 5 },
    
    // Rare items (15% drop rate)
    { id: 'silver_armor', weight: 4 },
    { id: 'silver_sword', weight: 4 },
    { id: 'silver_wand', weight: 3 },
  ]
};

// ============= STATUS EFFECT FUNCTIONS =============

function applyStatusEffect(target, effectId, duration, appliedBy, points=0, lobby=null) {
  // Get caster's bonuses if it's a player
  let casterBonuses = null;
  if (appliedBy && lobby) {
    const caster = Object.values(lobby.state.players).find(p => p.username === appliedBy);
    if (caster) {
      casterBonuses = {
        magicDamage: caster.itemEffects?.magicDamage || 0,
        healingBonus: caster.itemEffects?.healingBonus || 0
      };
    }
  }
  
  // Check if effect already exists
  const existingEffect = target.statusEffects.find(e => e.effectId === effectId);
  
  if (existingEffect) {
    // Refresh duration and update bonuses
    existingEffect.duration = duration;
    existingEffect.points = (effectId == 'poison' || effectId == 'sunder') ? existingEffect.points + points : Math.max(existingEffect.points, points);
    existingEffect.casterBonuses = casterBonuses;
  } else {
    target.statusEffects.push({
      effectId: effectId,
      duration: duration,
      appliedBy: appliedBy,
      points: points,
      casterBonuses: casterBonuses
    });
  }
}

function getEffectiveDefense(target) {
  // Calculate defense including status effect bonuses and reductions
  let defense = target.currentDefense || target.defense || 0;
  
  if (target.statusEffects) {
    target.statusEffects.forEach(effect => {
      if (effect.effectId === 'defense') {
        defense += effect.points;
      }
      // Sunder reduces defense
      if (effect.effectId === 'sunder') {
        defense -= effect.points;
      }
    });
  }
  
  return defense; // Defense can't go below 0
}

function getBaseDefense(target) {
  // Get only base defense (from items and class), excluding status effects
  return target.currentDefense || target.defense || 0;
}

function getStatusEffectDefense(target) {
  // Get only defense from status effects (including reductions)
  let statusDefense = 0;
  
  if (target.statusEffects) {
    target.statusEffects.forEach(effect => {
      if (effect.effectId === 'defense') {
        statusDefense += effect.points;
      }
      // Sunder reduces defense
      if (effect.effectId === 'sunder') {
        statusDefense -= effect.points;
      }
    });
  }
  
  return statusDefense;
}

// Utility function to get total item effect value for a character
function getTotalItemEffectValue(character, effect) {
  // Return 0 if character is not a player
  if (!character.itemEffects) {
    return 0;
  }
  
  // Return the total value of the effect from all items
  return character.itemEffects[effect] || 0;
}

// Helper function to get target for enemy attacks, prioritizing taunted players
function getEnemyTarget(alivePlayers) {
  if (alivePlayers.length === 0) return null;
  
  // First, check if any player has taunt status
  const tauntedPlayers = alivePlayers.filter(player => {
    return player.statusEffects && player.statusEffects.some(effect => effect.effectId === 'taunt');
  });
  
  // If there are taunted players, target one of them
  if (tauntedPlayers.length > 0) {
    return tauntedPlayers[Math.floor(Math.random() * tauntedPlayers.length)];
  }
  
  // Calculate threat-based targeting
  const playersWithThreat = alivePlayers.map(player => {
    const threat = getTotalItemEffectValue(player, 'threat') || 0;
    // Ensure minimum threat of 1% so no player is completely immune to targeting
    const effectiveThreat = Math.max(5, threat);
    return { player, threat: effectiveThreat };
  });
  
  // Calculate total threat
  const totalThreat = playersWithThreat.reduce((sum, p) => sum + p.threat, 0);
  
  // Weighted random selection based on threat
  const random = Math.random() * totalThreat;
  let currentThreat = 0;
  
  for (const { player, threat } of playersWithThreat) {
    currentThreat += threat;
    if (random <= currentThreat) {
      return player;
    }
  }
  
  // Fallback to first player (should never reach here)
  return alivePlayers[0];
}

// Helper function to apply damage reduction for taunt status
function applyDamageToTarget(target, damage, log, attacker = null) {
  let finalDamage = damage;
  
  // Check if target has taunt status for 50% damage reduction
  if (target.statusEffects && target.statusEffects.some(effect => effect.effectId === 'taunt')) {
    finalDamage = Math.floor(damage * 0.5); // 50% damage reduction
    log.results.push(`${target.username || target.name} is taunted and takes reduced damage!`);
  }
  
  // Check if target has vulnerable status for increased damage taken
  if (target.statusEffects) {
    target.statusEffects.forEach(effect => {
      const statusEffect = STATUS_EFFECTS[effect.effectId];
      if (statusEffect && statusEffect.damageAmplification && effect.points) {
        const originalDamage = finalDamage;
        // Use the effect points as the percentage increase (e.g., 50 points = 50% increase)
        finalDamage = Math.floor(finalDamage * (1 + effect.points / 100));
        console.log(`Vulnerability applied in applyDamageToTarget: damage amplified from ${originalDamage} to ${finalDamage} (${effect.points}% increase)`);
      }
    });
  }
  
  // Check for thorns damage reflection
  if (attacker && target.statusEffects) {
    const thornsEffect = target.statusEffects.find(effect => effect.effectId === 'thorns');
    if (thornsEffect) {
      const thornsDamage = thornsEffect.points;
      
      // Apply thorns damage to attacker
      if (attacker.currentHealth !== undefined) {
        // Enemy attacker
        attacker.currentHealth = Math.max(0, attacker.currentHealth - thornsDamage);
      } else {
        // Player attacker
        attacker.health = Math.max(0, attacker.health - thornsDamage);
      }
      
      log.results.push(`${attacker.username || attacker.name} takes ${thornsDamage} thorns damage!`);
    }
  }

  const defense = getEffectiveDefense(target);
  // Exponentially decreasing damage reduction: each point adds less than the previous
  // Formula: damageReduction = 1 - (0.99^defense), capped at 95%
  // At 1 defense: ~1%, at 2 defense: ~1.99%, at 10: ~9.56%, at 50: ~39.5%, at 100: ~63.4%
  let damageReduction = 1 - Math.pow(0.99, defense);
  // Cap at 95% damage reduction
  damageReduction = Math.min(0.95, damageReduction);
  finalDamage = Math.round(finalDamage * (1 - damageReduction));
  
  // Apply damage to health
  if (target.currentHealth !== undefined) {
    // Enemy target (clamp to [0, maxHealth])
    const newHealth = (target.currentHealth || 0) - finalDamage;
    const maxHp = target.maxHealth || newHealth;
    target.currentHealth = Math.min(maxHp, Math.max(0, newHealth));
  } else {
    // Player target (clamp to [0, maxHealth])
    const newHealth = (target.health || 0) - finalDamage;
    const maxHp = target.maxHealth || newHealth;
    target.health = Math.min(maxHp, Math.max(0, newHealth));
  }
  
  return finalDamage;
}

function removeStatusEffect(target, effectId) {
  target.statusEffects = target.statusEffects.filter(e => e.effectId !== effectId);
}

// Helper function to apply damage from enemy sources with damage multiplier
function dealEnemyDamage(enemy, target, baseDamage, log, attacker = null) {
  // Apply enemy damage multiplier
  const scaledDamage = Math.floor(baseDamage * (enemy.damageMultiplier || 1));
  
  // Use the existing damage application logic with scaled damage
  return applyDamageToTarget(target, scaledDamage, log, attacker);
}

// Helper function to apply healing from enemy sources with damage multiplier
function dealEnemyHealing(enemy, target, baseHeal, log) {
  // Apply enemy damage multiplier to healing as well
  const scaledHeal = Math.floor(baseHeal * (enemy.damageMultiplier || 1));
  
  const oldHealth = target.health || target.currentHealth;
  const newHealth = Math.min(target.maxHealth, oldHealth + scaledHeal);
  const actualHeal = newHealth - oldHealth;
  
  if (target.health !== undefined) {
    target.health = newHealth;
  } else {
    target.currentHealth = newHealth;
  }
  
  log.results.push(`${target.name || target.username} heals for ${actualHeal} HP!`);
  log.heal += actualHeal;
  
  return actualHeal;
}

function hasStatusEffect(target, effectId) {
  return target.statusEffects.some(e => e.effectId === effectId);
}

// Helper function to get all items for a player
function getPlayerItems(player) {
  if (!player || !player.items) {
    return [];
  }
  
  return player.items.map(itemId => ITEMS[itemId]).filter(item => item !== undefined);
}

// Helper function to check if a player has a specific item by ID
function hasItem(player, itemId) {
  if (!player || !player.items) {
    return false;
  }
  
  return player.items.includes(itemId);
}

// ============= RANDOM ITEM GENERATOR =============


// ============= CONFIGURABLE WEIGHTS AND BUDGETS =============

// Base budgets for each rarity (exponential scaling)
const RARITY_BUDGETS = {
  common: 15,
  uncommon: 30,
  rare: 70,
  epic: 150,
  legendary: 400
};

// Effect weights (cost per point)
const EFFECT_WEIGHTS = {
  // Health and defense (defensive stats)
  maxHealth: 0.5,
  defense: 3.0,
  
  // Damage stats (offensive stats)
  physicalDamage: 2.0,
  magicDamage: 2.0,
  
  // Utility stats
  speed: 2.0,
  speedRoll: 2,
  hitChance: 3.0,
  
  // Vampirism (expensive)
  physicalVamp: 5.0,
  magicVamp: 5.0,
  
  // Healing (expensive)
  healingBonus: 1.0,
  
  // Critical strike (expensive)
  critChance: 5.0
};

// Proc weights (cost per proc)
const PROC_WEIGHTS = {
  // Trigger costs
  trigger: {
    [PROC_ANY]: 5,
    [PROC_HIT_ATTACK]: 20,
    [PROC_CRIT_ATTACK]: 10,
    [PROC_EXECUTE_ATTACK]: 15,
    [PROC_HIT_HEAL]: 15,
    [PROC_MISS_ATTACK]: 10,
    [PROC_AOE_ANY]: 35,
    [PROC_AOE_ENEMY]: 30,
    [PROC_AOE_ALLY]: 25
  },
  
  // Condition costs
  condition: {
    [PROC_CONDITION_SELF_STATUS]: 8,
    [PROC_CONDITION_TARGET_STATUS]: 10,
    [PROC_CONDITION_ALL_TARGET_STATUS]: 15,
    [PROC_CONDITION_TARGET_HEALTH_LESS_THAN]: 12,
    [PROC_CONDITION_TARGET_HEALTH_GREATER_THAN]: 8,
    [PROC_CONDITION_TARGET_FULL_HP]: 15,
    [PROC_CONDITION_SELF_HEALTH_LESS_THAN]: 10,
    [PROC_CONDITION_SELF_HEALTH_GREATER_THAN]: 6,
    [PROC_CONDITION_SELF_FULL_HP]: 12,
    [PROC_CONDITION_MORE_HEALTH]: 20
  },
  
  // Action costs (base cost for proc actions)
  action: 15,
  
  // Targeting costs
  targeting: {
    'enemy': 0,
    'ally': 0,
    'self': 0,
    'all_enemies': 20,
    'all_allies': 15
  },
  
  // Damage/Healing costs (per point)
  damage: 2.0,
  healing: 1.5,
  
  // Chance costs (negative values = guaranteed proc)
  chance: {
    100: 0,    // Guaranteed
    75: 5,     // 75% chance
    50: 10,    // 50% chance
    25: 15     // 25% chance
  }
};

// Item type configurations
const ITEM_TYPES = {
  weapon: {
    namePrefixes: ['Sharp', 'Deadly', 'Enchanted', 'Blessed', 'Cursed', 'Ancient', 'Mystic', 'Divine'],
    nameSuffixes: ['Sword', 'Blade', 'Axe', 'Mace', 'Dagger', 'Spear', 'Hammer', 'Wand', 'Staff', 'Bow'],
    primaryEffects: ['physicalDamage', 'magicDamage', 'critChance', 'hitChance'],
    secondaryEffects: ['physicalVamp', 'magicVamp']
  },
  armor: {
    namePrefixes: ['Iron', 'Steel', 'Mithril', 'Dragon', 'Blessed', 'Cursed', 'Ancient', 'Mystic', 'Divine'],
    nameSuffixes: ['Armor', 'Plate', 'Mail', 'Robe', 'Cloak', 'Shield', 'Helm', 'Gauntlets'],
    primaryEffects: ['defense', 'maxHealth'],
    secondaryEffects: ['speed', 'healingBonus']
  },
  accessory: {
    namePrefixes: ['Gold', 'Silver', 'Crystal', 'Ruby', 'Sapphire', 'Emerald', 'Diamond', 'Mystic', 'Divine'],
    nameSuffixes: ['Ring', 'Amulet', 'Talisman', 'Charm', 'Medallion', 'Pendant', 'Bracelet', 'Orb'],
    primaryEffects: ['speed', 'critChance', 'healingBonus'],
    secondaryEffects: ['maxHealth', 'physicalVamp', 'magicVamp', 'hitChance']
  }
};

// Status effect names for proc conditions
const STATUS_EFFECT_NAMES = ['poison', 'stun', 'slow', 'curse', 'vulnerable', 'sunder', 'haste', 'rage', 'defense_buff', 'physical_buff', 'magic_buff'];

// ============= RANDOM ITEM GENERATION =============

function createItem(encounterNumber, rewardRares = false, lootModifier = 'Normal') {
  const RARE_CHANCE = 0.05;
  const RANKUP_CHANCE = 0.1;
  const CURSED_CHANCE = 0.05;
  const SUFFIX_CHANCE = 0.05;
  const RANKS = [
    {
      id: 'Rough',
      prefix: 'Rough ',
      multiplier: 1,
    },
    {
      id: 'Common',
      prefix: 'Common ',
      multiplier: 1.5,
    },
    {
      id: 'Fine',
      prefix: 'Fine ',
      multiplier: 2.1,
    },
    {
      id: 'Masterful',
      prefix: 'Masterful ',
      multiplier: 3,
    },
    {
      id: 'Superior',
      prefix: 'Superior ',
      multiplier: 4.5,
    },
    {
      id: 'Dragonforged',
      prefix: 'Dragonforged ',
      multiplier: 6.5,
    },
    {
      id: 'Celestial',
      prefix: 'Celestial ',
      multiplier: 8.5,
    },
    {
      id: 'Divine',
      prefix: 'Divine ',
      multiplier: 10,
    }
  ]
  const TEMPLATES = [
    {name: 'Hammer', quality: 'common', type: 'weapon', effects: {physicalDamage: 10}},
    {name: 'Dagger', quality: 'common', type: 'weapon', effects: {physicalDamage: 5, critChance: 2}},
    {name: 'Longsword', quality: 'common', type: 'weapon', effects: {physicalDamage: 6, hitChance: 2}},
    {name: 'Staff', quality: 'common', type: 'weapon', effects: {magicDamage: 10}},
    {name: 'Orb', quality: 'common',type: 'weapon', effects: {magicDamage: 5, critChance: 2}},
    {name: 'Wand', quality: 'common',type: 'weapon', effects: {magicDamage: 6, hitChance: 2}},
    {name: 'Scepter', quality: 'common', type: 'weapon', effects: {healingBonus: 10}},
    {name: 'Robe', quality: 'common',type: 'armor', effects: {magicDamage: 5, maxHealth: 12}},
    {name: 'Chain Cloak', quality: 'common', type: 'armor', effects: {defense: 4, maxHealth: 12}},
    {name: 'Plate Armor', quality: 'common', type: 'armor', effects: {defense: 7}},
    {name: 'Mail Armor', quality: 'common', type: 'armor', effects: { maxHealth: 20}},
    {name: 'Ring of Haste', quality: 'common', type: 'accessory', effects: { speed: 3}},
    {name: 'Amulet of Precision', quality: 'common',type: 'accessory', effects: { hitChance: 3}},
    {name: 'Medallion of Destruction', quality: 'common', type: 'accessory', effects: { critChance: 3}},
    {name: 'Ring of Vampirism', quality: 'common',type: 'accessory', effects: { physicalVamp: 5}},
    {name: 'Ring of Draining', quality: 'common',type: 'accessory', effects: { magicVamp: 5}},
  ]
  const RARE_TEMPLATES = [
    {name: 'Dreadknight Blade', quality: 'rare',type: 'weapon', effects: { physicalDamage: 10, physicalVamp: 6}},
    {name: 'Bloodrinker', quality: 'rare', type: 'weapon', effects: { physicalDamage: 5, critChance: 2, physicalVamp: 4}},
    {name: 'Guardian Shield', quality: 'rare', type: 'armor', effects: { threat: 15, defense: 8}},
    {name: 'Shadowlight Staff', quality: 'rare',type: 'weapon', effects: { magicDamage: 10, healingBonus: 10}},
    {name: 'Sorcerous Orb', quality: 'rare',type: 'weapon', effects: { magicDamage: 5, critChance: 2, magicVamp: 6}},
    {name: 'Spellweaver Staff', quality: 'rare',type: 'weapon', effects: { magicDamage: 6, hitChance: 2, critChance: 6}},
    {name: 'Kingshand', quality: 'rare',type: 'weapon', effects: { healingBonus: 10, physicalVamp: 6}},
    {name: 'Holy Robes', quality: 'rare',type: 'armor', effects: { healingBonus: 5, maxHealth: 12, magicVamp: 6}},
    {name: 'Thiefcloak', quality: 'rare',type: 'armor', effects: { defense: 4, maxHealth: 12, speed: 3}},
    {name: "Kingsguard Plate", quality: 'rare',type: 'armor', effects: { defense: 7, maxHealth: 12}},
    {name: 'Ranger General Cloak', quality: 'rare', type: 'armor', effects: { maxHealth: 20, speed: 4}},
    {name: 'Blurspeed Ring', quality: 'rare',type: 'accessory', effects: { speed: 6}},
    {name: 'Strategist Amulet', quality: 'rare',type: 'accessory', effects: { hitChance: 3}},
    {name: "Destroyer's Medallion", quality: 'rare',type: 'accessory', effects: { critChance: 5}},
    {name: 'Vampiric Scepter', quality: 'rare',type: 'accessory', effects: { magicVamp: 8}},
  ]
  // Ensure encounterNumber is valid
  const validEncounterNumber = encounterNumber || 0;
  
  console.log(`[ITEM] createItem called with encounterNumber: ${encounterNumber}, validEncounterNumber: ${validEncounterNumber}`);
  
  const randomTemplate = ((validEncounterNumber > 0 && validEncounterNumber % 5 == 0) || rewardRares || Math.random() < RARE_CHANCE) ? RARE_TEMPLATES[Math.floor(Math.random() * RARE_TEMPLATES.length)] : TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
  
  // Calculate rank index (increases by 1 every 5 encounters)
  const baseRankIndex = Math.floor(validEncounterNumber / 5);
  const rankUpBonus = Math.random() < RANKUP_CHANCE ? 1 : 0;
  const finalRankIndex = Math.min(baseRankIndex + rankUpBonus, RANKS.length - 1);
  const rank = RANKS[finalRankIndex];
  
  console.log(`[ITEM] Rank calculation: baseRankIndex=${baseRankIndex}, rankUpBonus=${rankUpBonus}, finalRankIndex=${finalRankIndex}, rank=${rank.id}`);
  let name = rank.prefix + randomTemplate.name;
  let multi = rank.multiplier;
  
  // Apply loot modifier to multiplier
  if (lootModifier === 'Excellent') {
    multi *= 2; // Double the effect multiplier
    console.log(`[ITEM] Excellent loot modifier applied, multi doubled to ${multi}`);
  }
  
  const cursed = Math.random() < CURSED_CHANCE;
  if(cursed){
    name = 'Cursed ' + name;
    multi *= 1.5;
  }
  const itemType = randomTemplate.type;
  let effects = { ...randomTemplate.effects };
  
  Object.keys(effects).forEach(eff => {
    effects[eff] = Math.floor(effects[eff] * multi);
  });
  
  if(cursed) {
    const allEffectTypes = Object.keys(EFFECT_WEIGHTS);
    const unusedEffects = allEffectTypes.filter(effectType => !effects[effectType]);
    
    if(unusedEffects.length > 0) {
      const negativeEffect = unusedEffects[Math.floor(Math.random() * unusedEffects.length)];
      const negativeValue = -Math.floor(multi * 2);
      effects[negativeEffect] = negativeValue;
    }
  }

  const SUFFIXES = [
    {
      suffix_text : ' of Doublestrike',
      procTrigger : PROC_HIT_ATTACK,
      procChance: 10,
      procAction: {
        damage: 10,
        damageType: 'physical',
        type: 'attack',
        animTime: 'spell',
        sprite: 'impact_right',
        animTime: 1200,
        sound: 'sword',
        target: 'enemy',
      },
      desc_text : '10% chance to deal $d bonus Physical Damage on attack.'
    },
    {
      suffix_text : ' of Restoration',
      procTrigger : PROC_MISS_ATTACK,
      procChance: 100,
      procAction: {
        heal: 8,
        damageType: 'magic',
        type: 'heal',
        animTime: 'support',
        sprite: 'heal',
        animTime: 1200,
        sound: 'heal',
        target: 'self',
      },
      desc_text : 'Heal self for $h on attack miss.'
    },
    {
      suffix_text : ' of Feasting',
      procTrigger : PROC_CRIT_ATTACK,
      procChance: 100,
      procAction: {
        heal: 20,
        damageType: 'magic',
        type: 'heal',
        animTime: 'support',
        sprite: 'heal',
        animTime: 1200,
        sound: 'heal',
        target: 'self',
      },
      desc_text : 'Heal self for $h on crit.'
    },
    {
      suffix_text : ' of Spellburt',
      procTrigger : PROC_HIT_ATTACK,
      procChance: 5,
      procAction: {
        damage: 5,
        damageType: 'magic',
        type: 'attack',
        animTime: 'spell',
        sprite: 'arcane_blast',
        animTime: 1200,
        sound: 'magicimpact',
        target: 'all_enemies',
      },
      desc_text : '5% chance to deal 8 Magic Damage to all enemies on attack.'
    },
  ]

  let chosenSuffix = null;
  if(Math.random() <= SUFFIX_CHANCE) {
    chosenSuffix = {...SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)]};
    effects.procTrigger = chosenSuffix.procTrigger;
    effects.procChance = chosenSuffix.procChance;
    if(chosenSuffix.procCondition)
      effects.procCondition = chosenSuffix.procCondition;
    if(chosenSuffix.procAction.damage) {
      chosenSuffix.procAction.damage *= multi;
    }
    if(chosenSuffix.procAction.heal) {
      chosenSuffix.procAction.heal *= multi;
    }
    if(chosenSuffix.procAction.points) {
      chosenSuffix.procAction.points *= multi;
    }
    effects.procAction = chosenSuffix.procAction;
  }  

  name = name + (chosenSuffix ? chosenSuffix.suffix_text : '');
  const itemId = name.toLocaleLowerCase().replace(/\s+/g, '_').replace(" ", "_");
  
  // Create new item
  const item = {
    id: itemId,
    name: name,
    description: generateItemDescription(effects, null)+". "+(chosenSuffix ? 
      chosenSuffix.desc_text
      .replace('$d', (chosenSuffix.procAction.damage ? chosenSuffix.procAction.damage*multi : 0))
      .replace('$h', (chosenSuffix.procAction.health ? chosenSuffix.procAction.health*multi : 0))
      : ''),
    type: itemType,
    rarity: randomTemplate.quality,
    effects: effects,
    icon: `/games/rpg/assets/items/${itemId}.png`,
    iconFallback: getIconFallback(itemType)
  };

  if (ITEMS[item.id]) {
    console.log(`[ITEM] Item ${itemId} already exists, returning existing item`);
    return ITEMS[item.id];
  }
  
  // Add to database
  ITEMS[itemId] = item;
  return item;
}

function generateRandomItem(rarity, existingItemNames = []) {
  // Select item type
  const itemType = selectRandomItemType();
  const typeConfig = ITEM_TYPES[itemType];
  
  // Generate name
  const name = generateUniqueItemName(typeConfig, existingItemNames);
  
  // Allocate budget
  const budget = RARITY_BUDGETS[rarity];
  const procBudget = 0;//Math.floor(budget * Math.random()); // 40% for procs
  const effectBudget = budget - procBudget; // 60% for effects
  
  // Generate effects
  const effects = generateRandomEffects(typeConfig, effectBudget);
  
  // Generate proc (optional)
  /*const proc = Math.random() < getProcChance(rarity) ? 
    generateRandomProc(typeConfig, procBudget) : null;*/
  const proc = null;
  
  // Create item
  const item = {
    id: generateItemId(name),
    name: name,
    description: generateItemDescription(effects, proc),
    type: itemType,
    rarity: rarity,
    effects: effects,
    icon: `/games/rpg/assets/items/${generateItemId(name)}.png`,
    iconFallback: getIconFallback(itemType)
  };
  
  // Add proc properties if proc exists
  if (proc) {
    Object.assign(item, proc);
  }

  ITEMS[item.id] = item;
  
  return item;
}

function selectRandomItemType() {
  const types = Object.keys(ITEM_TYPES);
  return types[Math.floor(Math.random() * types.length)];
}

function generateUniqueItemName(typeConfig, existingNames) {
  let name;
  let attempts = 0;
  
  do {
    const prefix = typeConfig.namePrefixes[Math.floor(Math.random() * typeConfig.namePrefixes.length)];
    const suffix = typeConfig.nameSuffixes[Math.floor(Math.random() * typeConfig.nameSuffixes.length)];
    name = `${prefix} ${suffix}`;
    attempts++;
  } while (existingNames.includes(name) && attempts < 50);
  
  return name;
}

function generateItemId(name) {
  return name.toLowerCase().replace(/\s+/g, '_');
}

function generateRandomEffects(typeConfig, budget) {
  const effects = {};
  let remainingBudget = budget;
  const rand = Math.random();
  
  // Determine effect distribution based on probability
  let effectType;
  if (rand < 0.7) {
    // 70%: 1 primary effect (spend full budget)
    effectType = 'single_primary';
  } else if (rand < 0.9) {
    // 20%: 1 primary + 1 secondary effect
    effectType = 'primary_secondary';
  } else {
    // 10%: 2 primary + 1 secondary effect
    effectType = 'double_primary_secondary';
  }
  
  // Add first primary effect
  const primaryEffect1 = typeConfig.primaryEffects[Math.floor(Math.random() * typeConfig.primaryEffects.length)];
  let primaryValue1;
  
  if (effectType === 'single_primary') {
    // Spend full budget on single primary effect
    primaryValue1 = Math.floor(remainingBudget / EFFECT_WEIGHTS[primaryEffect1]);
  } else if (effectType === 'primary_secondary') {
    // Spend 70% of budget on primary, save 30% for secondary
    const primaryBudget = Math.floor(budget * 0.7);
    primaryValue1 = Math.floor(primaryBudget / EFFECT_WEIGHTS[primaryEffect1]);
  } else {
    // Spend 40% of budget on each primary, save 20% for secondary
    const primaryBudget = Math.floor(budget * 0.4);
    primaryValue1 = Math.floor(primaryBudget / EFFECT_WEIGHTS[primaryEffect1]);
  }
  
  effects[primaryEffect1] = Math.max(primaryValue1, 1);
  remainingBudget -= effects[primaryEffect1] * EFFECT_WEIGHTS[primaryEffect1];
  
  // Add second primary effect if needed
  if (effectType === 'double_primary_secondary') {
    const availablePrimaryEffects = typeConfig.primaryEffects.filter(effect => effect !== primaryEffect1);
    if (availablePrimaryEffects.length > 0) {
      const primaryEffect2 = availablePrimaryEffects[Math.floor(Math.random() * availablePrimaryEffects.length)];
      const primaryBudget2 = Math.floor(budget * 0.4);
      const primaryValue2 = Math.floor(primaryBudget2 / EFFECT_WEIGHTS[primaryEffect2]);
      effects[primaryEffect2] = Math.max(primaryValue2, 1);
      remainingBudget -= effects[primaryEffect2] * EFFECT_WEIGHTS[primaryEffect2];
    }
  }
  
  // Add secondary effect if needed
  if (effectType === 'primary_secondary' || effectType === 'double_primary_secondary') {
    const secondaryEffect = typeConfig.secondaryEffects[Math.floor(Math.random() * typeConfig.secondaryEffects.length)];
    if (!effects[secondaryEffect]) { // Don't duplicate effects
      const maxValue = Math.floor(remainingBudget / EFFECT_WEIGHTS[secondaryEffect]);
      if (maxValue > 0) {
        const value = Math.floor(Math.random() * Math.min(maxValue, 8)) + 1;
        effects[secondaryEffect] = value;
        remainingBudget -= value * EFFECT_WEIGHTS[secondaryEffect];
      }
    }
  }
  
  return effects;
}

function getProcChance(rarity) {
  const chances = {
    common: 0.1,    // 10%
    uncommon: 0.25, // 25%
    rare: 0.5,      // 50%
    epic: 0.75,     // 75%
    legendary: 1.0  // 100%
  };
  return chances[rarity];
}

function generateRandomProc(typeConfig, budget) {
  let addCondition = false;
  if(Math.random() < 0.3) {
    budget *= 1.5;
    addCondition = true;
  }
  const proc = {
    hasProc: true,
    procChance: selectProcChance(budget),
    procTrigger: selectProcTrigger(budget),
    procAction: generateProcAction(typeConfig, budget)
  };
  
  // Add condition if budget allows
  if (addCondition) {
    proc.hasProcCondition = true;
    proc.procCondition = selectProcCondition(budget);
    proc.procConditionValue = selectProcConditionValue(proc.procCondition);
   
  }
  
  // Add carry-over properties
  if (Math.random() < 0.3) {
    proc.procPointsCarry = 0.2 + Math.random() * 0.3; // 50-100% carry
    proc.procHealthCarry = 0.2 + Math.random() * 0.3; // 50-100% carry
  }else{
  }
  
  return proc;
}

function selectProcChance(budget) {
  const availableChances = [25, 50, 75, 100];
  const affordableChances = availableChances.filter(chance => 
    PROC_WEIGHTS.chance[chance] <= budget
  );
  
  if (affordableChances.length === 0) return 100;
  return affordableChances[Math.floor(Math.random() * affordableChances.length)];
}

function selectProcTrigger(budget) {
  const triggers = Object.keys(PROC_WEIGHTS.trigger);
  const affordableTriggers = triggers.filter(trigger => 
    PROC_WEIGHTS.trigger[trigger] <= budget
  );
  
  return parseInt(affordableTriggers[Math.floor(Math.random() * affordableTriggers.length)]);
}

function selectProcCondition(budget) {
  const conditions = Object.keys(PROC_WEIGHTS.condition);
  const affordableConditions = conditions.filter(condition => 
    PROC_WEIGHTS.condition[condition] <= 10000
  );
  
  return parseInt(affordableConditions[Math.floor(Math.random() * affordableConditions.length)]);
}

function selectProcConditionValue(condition) {
  switch (condition) {
    case PROC_CONDITION_SELF_STATUS:
    case PROC_CONDITION_TARGET_STATUS:
    case PROC_CONDITION_ALL_TARGET_STATUS:
      return STATUS_EFFECT_NAMES[Math.floor(Math.random() * STATUS_EFFECT_NAMES.length)];
    case PROC_CONDITION_TARGET_HEALTH_LESS_THAN:
    case PROC_CONDITION_TARGET_HEALTH_GREATER_THAN:
    case PROC_CONDITION_SELF_HEALTH_LESS_THAN:
    case PROC_CONDITION_SELF_HEALTH_GREATER_THAN:
      return 0.5; // 25-100%
    default:
      return 0.5; // Default 50%
  }
}

function generateProcAction(typeConfig, budget) {
  const actionTypes = ['attack', 'heal', 'buff', 'debuff'];
  const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
  
  // Start with base action cost
  let remainingBudget = budget - PROC_WEIGHTS.action;
  
  // Select target and deduct targeting cost
  const target = selectProcTarget(remainingBudget);
  const targetingCost = PROC_WEIGHTS.targeting[target];
  remainingBudget -= targetingCost;
  
  const action = {
    id: `proc_${actionType}_${Math.random().toString(36).substr(2, 9)}`,
    name: `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Proc`,
    type: actionType,
    target: target,
    animType: getRandomAnimType(actionType),
    sprite: getProcSprite(actionType),
    sound: getProcSound(actionType),
    tint: generateRandomHexColor()
  };
  
  // Add action-specific properties with budget consideration
  switch (actionType) {
    case 'attack':
      const maxDamage = Math.floor(remainingBudget / PROC_WEIGHTS.damage);
      action.damage = Math.max(1, Math.min(maxDamage, 20)); // 1-20 damage based on budget
      action.damageType = Math.random() < 0.5 ? 'physical' : 'magic';
      break;
    case 'heal':
      const maxHeal = Math.floor(remainingBudget / PROC_WEIGHTS.healing);
      action.heal = Math.max(1, Math.min(maxHeal, 30)); // 1-30 heal based on budget
      break;
    case 'buff':
    case 'debuff':
      action.applyStatus = true;
      action.statusEffect = STATUS_EFFECT_NAMES[Math.floor(Math.random() * STATUS_EFFECT_NAMES.length)];
      action.duration = Math.floor(Math.random() * 3) + 2; // 2-4 rounds
      action.statusPoints = Math.floor(Math.random() * 10) + 2; // 5-15 points
      break;
  }
  
  return action;
}

function selectProcTarget(budget) {
  const targets = Object.keys(PROC_WEIGHTS.targeting);
  const affordableTargets = targets.filter(target => 
    PROC_WEIGHTS.targeting[target] <= budget
  );
  
  if (affordableTargets.length === 0) return 'enemy'; // Fallback
  return affordableTargets[Math.floor(Math.random() * affordableTargets.length)];
}

function getProcSprite(actionType) {
  const sprites = {
    attack: ['flamestrike', 'ice_spike', 'lightning', 'shadow_blast', 'soulfire', 'frost', 'rock', 'hex', 'poison', 'hellfire'],
    heal: ['heal', 'sunbeam', 'nature_heal', 'mystic_aura'],
    buff: ['holy_light', 'sunbeam', 'heal'],
    debuff: ['hex', 'poison', 'smoke_bomb', 'frost']
  };
  
  const availableSprites = sprites[actionType] || ['mystic_effect'];
  return availableSprites[Math.floor(Math.random() * availableSprites.length)];
}

function getProcSound(actionType) {
  const sounds = {
    attack: ['sound_fireball', 'enemy_attack', 'sound_explode', 'sound_laser', 'sound_lightning', 'sound_shieldbash'],
    heal: ['sound_heal', 'sound_magicbuff'],
    buff: ['sound_heal', 'sound_magicbuff'],
    debuff: ['sound_zap','sound_magicimpact', 'sound_laser']
  };
  
  const availableSounds = sounds[actionType] || ['mystic_chime'];
  return availableSounds[Math.floor(Math.random() * availableSounds.length)];
}

function generateRandomHexColor() {
  // Generate a random hex color with good contrast and vibrancy
  const letters = '0123456789ABCDEF';
  let color = '#';
  
  // Generate a vibrant color by ensuring at least one channel is bright
  const channels = [
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256)
  ];
  
  // Ensure at least one channel is bright (>180) for vibrancy
  const brightChannel = Math.floor(Math.random() * 3);
  channels[brightChannel] = 180 + Math.floor(Math.random() * 76); // 180-255
  
  // Convert to hex
  channels.forEach(channel => {
    const hex = channel.toString(16).toUpperCase();
    color += hex.length === 1 ? '0' + hex : hex;
  });
  
  return color;
}


function getRandomAnimType(actionType) {
  const animTypes = {
    attack: ['projectile', 'spell'],
    heal: ['support', 'spell'],
    buff: ['support'],
    debuff: ['spell', 'support']
  };
  
  const types = animTypes[actionType] || ['support'];
  return types[Math.floor(Math.random() * types.length)];
}

function generateItemDescription(effects, proc) {
  const effectDescriptions = [];
  
  // Add effect descriptions
  Object.entries(effects).forEach(([effect, value]) => {
    switch (effect) {
      case 'maxHealth': effectDescriptions.push(`+${value} max health`); break;
      case 'defense': effectDescriptions.push(`+${value} defense`); break;
      case 'physicalDamage': effectDescriptions.push(`+${value} physical damage`); break;
      case 'magicDamage': effectDescriptions.push(`+${value} magic damage`); break;
      case 'speed': effectDescriptions.push(`+${value} speed`); break;
      case 'hitChance': effectDescriptions.push(`+${value}% hit chance`); break;
      case 'critChance': effectDescriptions.push(`+${value}% crit chance`); break;
      case 'physicalVamp': effectDescriptions.push(`+${value}% physical vampirism`); break;
      case 'magicVamp': effectDescriptions.push(`+${value}% magic vampirism`); break;
      case 'healingBonus': effectDescriptions.push(`+${value}% healing`); break;
      case 'threat': effectDescriptions.push(`+${value}% threat`); break;
      default: effectDescriptions.push(`+${value} ${effect}`); break;
    }
  });
  
  return effectDescriptions.join(', ');
}

function generateProcDescription(proc) {
  const action = proc.procAction;
  const trigger = getProcTriggerDescription(proc.procTrigger);
  const condition = proc.hasProcCondition ? getProcConditionDescription(proc.procCondition, proc.procConditionValue) : '';
  
  let actionDesc = '';
  
  switch (action.type) {
    case 'attack':
      const damageType = action.damageType === 'physical' ? 'physical' : 'magic';
      actionDesc = `deal ${action.damage} ${damageType} damage`;
      break;
    case 'heal':
      actionDesc = `heal for ${action.heal}`;
      break;
    case 'buff':
      actionDesc = `apply ${action.statusEffect} for ${action.duration} turns`;
      break;
    case 'debuff':
      actionDesc = `apply ${action.statusEffect} for ${action.duration} turns`;
      break;
    default:
      actionDesc = 'trigger special effect';
  }
  
  // Add target description
  const targetDesc = getTargetDescription(action.target);
  
  // Combine all parts
  let description = `${trigger}${condition}${actionDesc}${targetDesc}`;
  
  // Add carry-over description if applicable
  if (proc.procPointsCarry) {
    const carryPercent = Math.round(proc.procPointsCarry * 100);
    description += ` (${carryPercent}% damage/heal carry)`;
  }
  
  return description;
}

function getProcTriggerDescription(trigger) {
  const triggers = {
    [PROC_ANY]: 'on any action to ',
    [PROC_HIT_ATTACK]: 'on hit to ',
    [PROC_CRIT_ATTACK]: 'on crit to ',
    [PROC_EXECUTE_ATTACK]: 'on execute attack to ',
    [PROC_HIT_HEAL]: 'on heal to ',
    [PROC_MISS_ATTACK]: 'on miss to ',
    [PROC_AOE_ANY]: 'on AOE action to ',
    [PROC_AOE_ENEMY]: 'on AOE enemy attack to ',
    [PROC_AOE_ALLY]: 'on AOE ally action to ',
    [PROC_START_OF_COMBAT]: 'on start of combat to ',
    [PROC_END_OF_COMBAT]: 'on end of combat to ',
    [PROC_TAKE_ATTACK]: 'when attacked to ',
    [PROC_DODGE_ATTACK]: 'on dodge to ',
  };
  
  return triggers[trigger] || 'to ';
}

function getProcConditionDescription(condition, value) {
  const conditions = {
    [PROC_CONDITION_SELF_STATUS]: `while you have ${value} `,
    [PROC_CONDITION_TARGET_STATUS]: `while target has ${value} `,
    [PROC_CONDITION_ALL_TARGET_STATUS]: `when all targets have ${value} `,
    [PROC_CONDITION_TARGET_HEALTH_LESS_THAN]: `when target below ${Math.round(value * 100)}% health `,
    [PROC_CONDITION_TARGET_HEALTH_GREATER_THAN]: `when target above ${Math.round(value * 100)}% health `,
    [PROC_CONDITION_TARGET_FULL_HP]: 'while target full health ',
    [PROC_CONDITION_SELF_HEALTH_LESS_THAN]: `when you are below ${Math.round(value * 100)}% health `,
    [PROC_CONDITION_SELF_HEALTH_GREATER_THAN]: `when you are above ${Math.round(value * 100)}% health `,
    [PROC_CONDITION_SELF_FULL_HP]: 'when you are full health ',
    [PROC_CONDITION_MORE_HEALTH]: 'when you have more health than target '
  };
  
  return conditions[condition] || '';
}

function getTargetDescription(target) {
  const targets = {
    'enemy': ' to enemy',
    'ally': ' to ally', 
    'self': ' to self',
    'all_enemies': ' to all enemies',
    'all_allies': ' to all allies'
  };
  
  return targets[target] || '';
}

function getIconFallback(itemType) {
  const fallbacks = {
    weapon: '⚔️',
    armor: '🛡️',
    accessory: '💍',
    consumable: '🧪'
  };
  return fallbacks[itemType] || '❓';
}

// Helper function to get all existing item names in the lobby
function getAllExistingItemNames(lobby) {
  const existingNames = [];
  
  // Add names from all player items
  Object.values(lobby.state.players).forEach(player => {
    if (player.items) {
      player.items.forEach(itemId => {
        const item = ITEMS[itemId];
        if (item) {
          existingNames.push(item.name);
        }
      });
    }
  });
  
  // Add names from all existing ITEMS database
  Object.values(ITEMS).forEach(item => {
    if (item.name) {
      existingNames.push(item.name);
    }
  });
  
  return existingNames;
}

// Public function to generate a random item for a lobby
function generateRandomItemForLobby(lobby, rarity) {
  const existingNames = getAllExistingItemNames(lobby);
  return generateRandomItem(rarity, existingNames);
}

function getTotalStatusEffectPoints(target, effectId) {
  let points = 0;
  target.statusEffects.forEach(effect => {
    if(effect.effectId === effectId) {
      points += effect.points;
    }
  });
  return points;
}

function processStatusEffects(lobby, api) {
  const combatLog = [];

  // Process player status effects
  Object.values(lobby.state.players).forEach(player => {
    if (player.health <= 0) return;

    player.statusEffects.forEach(effect => {
      const effectData = STATUS_EFFECTS[effect.effectId];
      
      // Apply damage over time effects
      if (effectData.damagePerTurn) {
        let scaledDamage = effect.points;
        
        // Apply caster's magic damage bonus if available
        if (effect.casterBonuses && effect.casterBonuses.magicDamage) {
          scaledDamage = Math.floor(scaledDamage * (1 + effect.casterBonuses.magicDamage / 100));
        }
        
        player.health = Math.max(0, player.health - scaledDamage);
        combatLog.push({
          actor: player.username,
          action: effectData.name,
          results: [`Takes ${scaledDamage} ${effectData.name} damage!`]
        });
      }
      
      // Apply healing over time effects
      if (effect.effectId === 'heal') {
        let scaledHeal = effect.points;
        
        // Apply caster's healing bonus if available
        if (effect.casterBonuses && effect.casterBonuses.healingBonus) {
          scaledHeal = Math.floor(scaledHeal * (1 + effect.casterBonuses.healingBonus / 100));
        }
        
        const oldHealth = player.health;
        player.health = Math.min(player.maxHealth, player.health + scaledHeal);
        const actualHeal = player.health - oldHealth;
        if (actualHeal > 0) {
          combatLog.push({
            actor: player.username,
            action: effectData.name,
            results: [`Heals for ${actualHeal} HP!`]
          });
        }
      }
    });
  });

  // Process enemy status effects
  lobby.state.combat.enemies.forEach(enemy => {
    if (enemy.currentHealth <= 0) return;

    enemy.statusEffects.forEach(effect => {
      const effectData = STATUS_EFFECTS[effect.effectId];
      
      // Apply damage over time effects
      if (effectData.damagePerTurn) {
        let scaledDamage = effect.points;
        
        // Apply caster's magic damage bonus if available
        if (effect.casterBonuses && effect.casterBonuses.magicDamage) {
          scaledDamage = Math.floor(scaledDamage * (1 + effect.casterBonuses.magicDamage / 100));
        }
        
        enemy.currentHealth = Math.max(0, enemy.currentHealth - scaledDamage);
        combatLog.push({
          actor: enemy.name,
          action: effectData.name,
          results: [`Takes ${scaledDamage} ${effectData.name} damage!`]
        });
      }
      
      // Apply healing over time effects
      if (effect.effectId === 'heal') {
        let scaledHeal = effect.points;
        
        // Apply caster's healing bonus if available
        if (effect.casterBonuses && effect.casterBonuses.healingBonus) {
          scaledHeal = Math.floor(scaledHeal * (1 + effect.casterBonuses.healingBonus / 100));
        }
        
        const oldHealth = enemy.currentHealth;
        enemy.currentHealth = Math.min(enemy.maxHealth, enemy.currentHealth + scaledHeal);
        const actualHeal = enemy.currentHealth - oldHealth;
        if (actualHeal > 0) {
          combatLog.push({
            actor: enemy.name,
            action: effectData.name,
            results: [`Heals for ${actualHeal} HP!`]
          });
        }
      }
    });
  });

  return combatLog;
}

function decrementStatusEffectDurations(lobby) {
  // Decrement player status effects
  Object.values(lobby.state.players).forEach(player => {
    player.statusEffects = player.statusEffects.filter(effect => {
      effect.duration--;
      return effect.duration > 0;
    });
  });

  // Decrement enemy status effects
  lobby.state.combat.enemies.forEach(enemy => {
    enemy.statusEffects = enemy.statusEffects.filter(effect => {
      effect.duration--;
      return effect.duration > 0;
    });
  });
}

function getActiveStatusEffects(target) {
  return target.statusEffects.map(effect => ({
    ...STATUS_EFFECTS[effect.effectId],
    duration: effect.duration
  }));
}

// ============= HELPER FUNCTIONS =============

function handleClassSelection(lobby, api, player, payload) {
  const { className } = payload;
  
  const playerData = lobby.state.players[player.username];
  if (!playerData) {
    console.error(`[RPG] Player ${player.username} not found in handleClassSelection`);
    return;
  }

  // Validate class exists
  if (!CLASSES[className]) {
    return api.sendToPlayer(player.id, 'error', { message: 'Invalid class' });
  }

  // Check if class is already taken
  if (lobby.state.selectedClasses[className]) {
    return api.sendToPlayer(player.id, 'error', { 
      message: `${CLASSES[className].name} is already taken!` 
    });
  }

  // Remove player's previous class selection if any
  if (playerData.class) {
    const oldClass = playerData.class;
    delete lobby.state.selectedClasses[oldClass];
  }

  // Assign class to player
  const classData = CLASSES[className];
  playerData.class = className;
  playerData.maxHealth = classData.baseHealth;
  playerData.health = classData.baseHealth;
  playerData.defense = classData.baseDefense;
  playerData.actions = [...classData.actions];
  playerData.learnedSkills = [];  // Track learned skills
  
  // Apply item effects to ensure they're calculated
  applyItemEffects(lobby, player.username);
  
  lobby.state.selectedClasses[className] = player.username;

  // Notify all players
  api.sendToAll('classSelected', {
    playerId: player.id,
    username: player.username,
    className: className,
    selectedClasses: lobby.state.selectedClasses
  });

  // Update host
  api.sendToHost('hostGameUpdate', {
    phase: 'class_selection',
    players: Object.values(lobby.state.players).map(p => ({
      username: p.username,
      class: p.class || null
    }))
  });

  // Check if all players have selected classes
  const allSelected = Object.values(lobby.state.players).every(p => p.class !== null);
  
  if (allSelected) {
    // Start first combat phase
    setTimeout(() => {
      startCombatPhase(lobby, api);
    }, 2000);
  }
}

// ============= CAMP PHASE SYSTEM =============

function startCampPhase(lobby, api) {
  console.log('[CAMP] Starting camp phase');
  
  lobby.state.phase = 'camp';
  lobby.state.camp = {
    round: 1,
    maxRounds: 3,
    pendingActions: {},
    actionsResolved: 0
  };
  
  // Get 3 random actions for this round
  const allActions = Object.values(CAMP_ACTIONS);
  const shuffled = allActions.sort(() => Math.random() - 0.5);
  const selectedActions = shuffled.slice(0, 3);
  
  // Store current actions in state for reconnection
  lobby.state.camp.currentActions = selectedActions;
  
  // Notify all players
  api.sendToAll('campStarted', {
    round: 1,
    maxRounds: 3,
    actions: selectedActions.map(action => ({
      id: action.id,
      name: action.name,
      description: action.description,
      icon: action.icon
    }))
  });
  
  // Update host
  api.sendToHost('hostGameUpdate', {
    phase: 'camp',
    round: 1,
    maxRounds: 3,
    players: Object.values(lobby.state.players).map(p => ({
      id: p.id,
      username: p.username,
      class: p.class,
      health: p.health,
      maxHealth: p.maxHealth
    })),
    message: 'The party sets up camp to rest and prepare...'
  });
}

function handleCampActionSelection(lobby, api, player, payload) {
  const { actionId } = payload;
  
  // Safety check: Ensure camp phase is active
  if (!lobby.state.camp) {
    console.log(`[CAMP] ERROR: Player ${player.username} tried to select action but camp phase is not active`);
    return;
  }
  
  console.log(`[CAMP] ${player.username} selected action: ${actionId} (Round ${lobby.state.camp.round}/${lobby.state.camp.maxRounds})`);
  
  if (!CAMP_ACTIONS[actionId]) {
    console.log(`[CAMP] Invalid action: ${actionId}`);
    return;
  }
  
  // Store the action
  lobby.state.camp.pendingActions[player.username] = actionId;
  
  // Notify player
  api.sendToPlayer(player.id, 'campActionSelected', {
    actionId: actionId,
    actionName: CAMP_ACTIONS[actionId].name
  });
  
  // Check if all players have selected
  const alivePlayers = Object.values(lobby.state.players).filter(p => p.health > 0);
  const actionsSelected = Object.keys(lobby.state.camp.pendingActions).length;
  
  console.log(`[CAMP] Actions selected: ${actionsSelected}/${alivePlayers.length} (Round ${lobby.state.camp.round}/${lobby.state.camp.maxRounds})`);
  
  if (actionsSelected >= alivePlayers.length) {
    // All players have selected, resolve actions
    console.log(`[CAMP] All players ready, resolving round ${lobby.state.camp.round}`);
    setTimeout(() => {
      resolveCampActions(lobby, api);
    }, 500);
  }
}

async function resolveCampActions(lobby, api) {
  // Safety check: Ensure camp phase is still active
  if (!lobby.state.camp) {
    console.log('[CAMP] ERROR: resolveCampActions called but camp phase is not active');
    return;
  }
  
  console.log(`[CAMP] Resolving camp actions for round ${lobby.state.camp.round}/${lobby.state.camp.maxRounds}`);
  
  const results = [];
  
  // Process each player's action
  for (const [playerId, actionId] of Object.entries(lobby.state.camp.pendingActions)) {
    const player = lobby.state.players[playerId];
    const action = CAMP_ACTIONS[actionId];
    
    if (!player || !action) continue;
    
    let result = {
      playerId: playerId,
      playerName: player.username,
      actionId: actionId,
      actionName: action.name,
      effects: []
    };
    
    // Apply healing
    if (action.heal) {
      if (action.target === 'self') {
        const oldHealth = player.health;
        player.health = Math.min(player.health + action.heal, player.maxHealth);
        const actualHeal = player.health - oldHealth;
        result.effects.push(`Healed for ${actualHeal} HP`);
      } else if (action.target === 'all_players') {
        // Heal all players
        Object.values(lobby.state.players).forEach(p => {
          if (p.health > 0) {
            const oldHealth = p.health;
            p.health = Math.min(p.health + action.heal, p.maxHealth);
            const actualHeal = p.health - oldHealth;
            if (p.id === playerId) {
              result.effects.push(`Healed all players for ${action.heal} HP`);
            }
          }
        });
      }
    }
    
    // Grant item
    if (action.grantItem) {
      const item = ITEMS[action.grantItem];
      if (item) {
        player.items.push(action.grantItem);
        applyItemEffects(lobby, playerId);
        result.effects.push(`Gained ${item.name}`);
        console.log(`[CAMP] ${player.username} gained item: ${item.name} (${action.grantItem})`);
        
        // Send item data to player so they can see it in inventory
        api.sendToPlayer(playerId, 'itemAwarded', {
          itemId: action.grantItem,
          name: item.name,
          description: item.description,
          icon: item.icon,
          iconFallback: item.iconFallback,
          rarity: item.rarity
        });
      } else {
        console.error(`[CAMP] ERROR: Item '${action.grantItem}' not found in ITEMS database!`);
        result.effects.push(`Gained unknown item (${action.grantItem})`);
      }
    }
    
    results.push(result);
    
    // Send animation to host
    api.sendToHost('animateCampAction', {
      playerId: playerId,
      playerName: player.username,
      actionId: actionId,
      actionName: action.name,
      effects: result.effects
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Clear pending actions
  lobby.state.camp.pendingActions = {};
  
  // Send results to all players
  api.sendToAll('campActionsResolved', {
    results: results,
    players: Object.values(lobby.state.players).map(p => ({
      id: p.id,
      username: p.username,
      health: p.health,
      maxHealth: p.maxHealth,
      items: p.items
    }))
  });
  
  // Check if camp phase is complete
  console.log(`[CAMP] Round ${lobby.state.camp.round} complete. Checking if camp should continue...`);
  console.log(`[CAMP] Current round: ${lobby.state.camp.round}, Max rounds: ${lobby.state.camp.maxRounds}`);
  
  if (lobby.state.camp.round >= lobby.state.camp.maxRounds) {
    // Camp complete, start combat
    console.log(`[CAMP] All ${lobby.state.camp.maxRounds} rounds complete. Ending camp phase.`);
    setTimeout(() => {
      endCampPhase(lobby, api);
    }, 1000);
  } else {
    // Next round
    lobby.state.camp.round++;
    console.log(`[CAMP] Starting next round. New round: ${lobby.state.camp.round}/${lobby.state.camp.maxRounds}`);
    setTimeout(() => {
      startCampRound(lobby, api);
    }, 1000);
  }
}

function startCampRound(lobby, api) {
  // Safety check: Ensure camp phase is still active
  if (!lobby.state.camp) {
    console.log('[CAMP] ERROR: startCampRound called but camp phase is not active');
    return;
  }
  
  console.log(`[CAMP] Starting round ${lobby.state.camp.round}/${lobby.state.camp.maxRounds}`);
  
  // Clear any pending actions from previous round
  lobby.state.camp.pendingActions = {};
  
  // Get 3 random actions for this round
  const allActions = Object.values(CAMP_ACTIONS);
  const shuffled = allActions.sort(() => Math.random() - 0.5);
  const selectedActions = shuffled.slice(0, 3);
  
  // Store current actions in state for reconnection
  lobby.state.camp.currentActions = selectedActions;
  
  console.log(`[CAMP] Available actions for round ${lobby.state.camp.round}: ${selectedActions.map(a => a.name).join(', ')}`);
  
  // Notify all players
  api.sendToAll('campRoundStarted', {
    round: lobby.state.camp.round,
    maxRounds: lobby.state.camp.maxRounds,
    actions: selectedActions.map(action => ({
      id: action.id,
      name: action.name,
      description: action.description,
      icon: action.icon
    }))
  });
  
  // Update host
  api.sendToHost('hostGameUpdate', {
    phase: 'camp',
    round: lobby.state.camp.round,
    maxRounds: lobby.state.camp.maxRounds,
    players: Object.values(lobby.state.players).map(p => ({
      id: p.id,
      username: p.username,
      class: p.class,
      health: p.health,
      maxHealth: p.maxHealth
    })),
    message: `Camp Round ${lobby.state.camp.round}/${lobby.state.camp.maxRounds}`
  });
}

function endCampPhase(lobby, api) {
  console.log('[CAMP] Camp phase complete');
  
  api.sendToAll('campComplete');
  api.sendToHost('campComplete');
  
  // Clean up camp state
  lobby.state.camp = null;
  
  // Check if players should learn new skills or talents at this encounter level
  const encounterNumber = lobby.state.encounterNumber || 1;
  console.log(`[CAMP] Checking for unlocks at encounter #${encounterNumber}`);
  
  const shouldLearnSkills = checkForSkillUnlocks(lobby, encounterNumber);
  const shouldLearnTalents = checkForTalentUnlocks(lobby, encounterNumber);
  
  console.log(`[CAMP] Results: shouldLearnSkills=${shouldLearnSkills}, shouldLearnTalents=${shouldLearnTalents}`);
  
  if (shouldLearnSkills && shouldLearnTalents) {
    console.log(`[SKILLS & TALENTS] Encounter #${encounterNumber} - Players can learn both skills and talents!`);
    // Start with skills first, then talents will be handled after skills complete
    setTimeout(() => {
      startSkillLearningPhase(lobby, api, encounterNumber);
    }, 1500);
  } else if (shouldLearnSkills) {
    console.log(`[SKILLS] Encounter #${encounterNumber} - Players can learn new skills!`);
    setTimeout(() => {
      startSkillLearningPhase(lobby, api, encounterNumber);
    }, 1500);
  } else if (shouldLearnTalents) {
    console.log(`[TALENTS] Encounter #${encounterNumber} - Players can learn new talents!`);
    setTimeout(() => {
      startTalentLearningPhase(lobby, api, encounterNumber);
    }, 1500);
  } else {
    console.log(`[ENCOUNTER] No skills or talents available at encounter #${encounterNumber}`);
    // Check if we should show Pick a Path or go straight to combat
    setTimeout(() => {
      checkAndStartPickAPath(lobby, api);
    }, 1500);
  }
}

// ============= SKILL LEARNING SYSTEM =============

function checkForSkillUnlocks(lobby, encounterNumber) {
  // Check if any player has skills available at this level
  for (const player of Object.values(lobby.state.players)) {
    if (player.health <= 0) continue;
    
    const classData = CLASSES[player.class];
    if (!classData || !classData.skills) continue;
    
    // Check if there are skills at this level that player hasn't learned yet
    const availableSkills = classData.skills.filter(skill => 
      skill.level === encounterNumber && !player.learnedSkills?.includes(skill.id)
    );
    
    if (availableSkills.length > 0) {
      return true; // At least one player has skills to learn
    }
  }
  
  return false;
}

function startSkillLearningPhase(lobby, api, encounterNumber) {
  console.log(`[SKILLS] Starting skill learning phase for encounter #${encounterNumber}`);
  
  lobby.state.phase = 'skill_learning';
  lobby.state.skillLearning = {
    encounterNumber: encounterNumber,
    playerSelections: {}
  };
  
  // Send skill options to each player
  Object.values(lobby.state.players).forEach(player => {
    if (player.health <= 0) return;
    
    const classData = CLASSES[player.class];
    if (!classData || !classData.skills) {
      // No skills for this class, auto-complete
      lobby.state.skillLearning.playerSelections[player.id] = 'none';
      return;
    }
    
    // Get skills available at this level that haven't been learned
    const availableSkills = classData.skills.filter(skill => 
      skill.level === encounterNumber && !player.learnedSkills?.includes(skill.id)
    );
    
    if (availableSkills.length === 0) {
      // No skills available for this player at this level
      lobby.state.skillLearning.playerSelections[player.id] = 'none';
      return;
    }
    
    console.log(`[SKILLS] Player ${player.username} (${player.class}): ${availableSkills.length} skills at level ${encounterNumber}`);
    console.log(`[SKILLS] Available skills:`, availableSkills.map(s => s.name).join(', '));
    console.log(`[SKILLS] Already learned:`, player.learnedSkills || 'none');
    
    api.sendToPlayer(player.id, 'skillLearningOptions', {
      encounterNumber: encounterNumber,
      skills: availableSkills.map(skill => ({
        id: skill.id,
        name: skill.name,
        desc: skill.desc,
        damage: skill.damage,
        heal: skill.heal,
        defense: skill.defense,
        type: skill.type,
        target: skill.target,
        damageType: skill.damageType,
        hitChanceModifier: skill.hitChanceModifier,
        chargeUp: skill.chargeUp,
        stun: skill.stun,
        slow: skill.slow,
        poison: skill.poison,
        vulnerable: skill.vulnerable,
        magicBuff: skill.magicBuff,
        physicalBuff: skill.physicalBuff
      }))
    });
    
    console.log(`[SKILLS] Sent skillLearningOptions to ${player.username}`);
  });
  
  // Update host
  api.sendToHost('hostGameUpdate', {
    phase: 'skill_learning',
    encounterNumber: encounterNumber,
    message: 'Players are learning new skills...',
    players: Object.values(lobby.state.players).map(p => ({
      id: p.id,
      username: p.username,
      class: p.class,
      health: p.health,
      maxHealth: p.maxHealth
    }))
  });
  
  // Check if all players are auto-completed (no skills available)
  checkSkillLearningComplete(lobby, api);
}

function handleSkillSelection(lobby, api, player, payload) {
  const { skillId } = payload;
  
  // Get the actual player data from lobby state
  const playerData = lobby.state.players[player.username];
  
  if (!playerData || playerData.health <= 0) {
    console.log(`[SKILLS] ERROR: Player ${player.username} not found or dead`);
    return;
  }
  
  console.log(`[SKILLS] ${playerData.username} (${playerData.class}) selected skill: ${skillId}`);
  
  const classData = CLASSES[playerData.class];
  if (!classData || !classData.skills) {
    console.log(`[SKILLS] ERROR: No skills defined for class ${playerData.class}`);
    return;
  }
  
  const skill = classData.skills.find(s => s.id === skillId);
  if (!skill) {
    console.log(`[SKILLS] ERROR: Invalid skill ID: ${skillId}`);
    return;
  }
  
  // Initialize learnedSkills array if it doesn't exist
  if (!playerData.learnedSkills) {
    playerData.learnedSkills = [];
  }
  
  // Add skill to player's learned skills
  if (!playerData.learnedSkills.includes(skillId)) {
    playerData.learnedSkills.push(skillId);
    console.log(`[SKILLS] ${playerData.username} learned ${skill.name}`);
  }
  
  // Add skill to player's available actions
  playerData.actions.push(skill);
  
  // Mark player's selection
  lobby.state.skillLearning.playerSelections[playerData.id] = skillId;
  
  // Notify player
  api.sendToPlayer(playerData.id, 'skillLearned', {
    skill: {
      id: skill.id,
      name: skill.name,
      desc: skill.desc
    }
  });
  
  // Check if all players have selected
  checkSkillLearningComplete(lobby, api);
}

function checkSkillLearningComplete(lobby, api) {
  const alivePlayers = Object.values(lobby.state.players).filter(p => p.health > 0);
  const selections = Object.keys(lobby.state.skillLearning.playerSelections);
  
  console.log(`[SKILLS] Skill selections: ${selections.length}/${alivePlayers.length}`);
  
  if (selections.length >= alivePlayers.length) {
    console.log('[SKILLS] All players have selected skills');
    
    // Notify all players
    api.sendToAll('skillLearningComplete');
    
    // Clean up skill learning state
    lobby.state.skillLearning = null;
    
    // Check if talents should also be learned at this encounter level
    const encounterNumber = lobby.state.encounterNumber || 1;
    const shouldLearnTalents = checkForTalentUnlocks(lobby, encounterNumber);
    
    if (shouldLearnTalents) {
      console.log('[SKILLS] Skills complete, now starting talent learning phase');
      setTimeout(() => {
        startTalentLearningPhase(lobby, api, encounterNumber);
      }, 2000);
    } else {
      console.log('[SKILLS] Skills complete, starting combat');
      setTimeout(() => {
        startCombatPhase(lobby, api);
      }, 2000);
    }
  }
}

// ============= TALENT LEARNING SYSTEM =============

function checkForTalentUnlocks(lobby, encounterNumber) {
  console.log(`[TALENTS] Checking for talent unlocks at encounter #${encounterNumber}`);
  const alivePlayers = Object.values(lobby.state.players).filter(p => p.health > 0);
  
  for (const player of alivePlayers) {
    if (player.health <= 0) continue;
    
    const classData = CLASSES[player.class];
    if (!classData || !classData.talents) {
      console.log(`[TALENTS] Player ${player.username} (${player.class}): No talents available`);
      continue;
    }
    
    console.log(`[TALENTS] Player ${player.username} (${player.class}): Checking talents at level ${encounterNumber}`);
    console.log(`[TALENTS] Available talent levels:`, classData.talents.map(t => t.level).join(', '));
    console.log(`[TALENTS] Already learned:`, player.learnedTalents || 'none');
    
    // Check if there are talents at this level that player hasn't learned yet
    const availableTalents = classData.talents.filter(talent => 
      talent.level === encounterNumber && !player.learnedTalents?.includes(talent.id)
    );
    
    console.log(`[TALENTS] Player ${player.username}: ${availableTalents.length} talents available at level ${encounterNumber}`);
    if (availableTalents.length > 0) {
      console.log(`[TALENTS] Available talents:`, availableTalents.map(t => t.name).join(', '));
      return true; // At least one player has talents to learn
    }
  }
  
  console.log(`[TALENTS] No talents available for any player at encounter #${encounterNumber}`);
  return false;
}

function startTalentLearningPhase(lobby, api, encounterNumber) {
  console.log(`[TALENTS] Starting talent learning phase for encounter #${encounterNumber}`);
  
  lobby.state.phase = 'talent_learning';
  lobby.state.talentLearning = {
    encounterNumber: encounterNumber,
    playerSelections: {}
  };
  
  // Send talent options to each player
  Object.values(lobby.state.players).forEach(player => {
    if (player.health <= 0) return;
    
    const classData = CLASSES[player.class];
    if (!classData || !classData.talents) {
      // No talents for this class, auto-complete
      lobby.state.talentLearning.playerSelections[player.id] = 'none';
      return;
    }
    
    // Get talents available at this level that haven't been learned
    const availableTalents = classData.talents.filter(talent => 
      talent.level === encounterNumber && !player.learnedTalents?.includes(talent.id)
    );
    
    if (availableTalents.length === 0) {
      // No talents available for this player at this level
      lobby.state.talentLearning.playerSelections[player.id] = 'none';
      return;
    }
    
    console.log(`[TALENTS] Player ${player.username} (${player.class}): ${availableTalents.length} talents at level ${encounterNumber}`);
    console.log(`[TALENTS] Available talents:`, availableTalents.map(t => t.name).join(', '));
    console.log(`[TALENTS] Already learned:`, player.learnedTalents || 'none');
    
    api.sendToPlayer(player.id, 'talentLearningOptions', {
      encounterNumber: encounterNumber,
      talents: availableTalents.map(talent => ({
        id: talent.id,
        name: talent.name,
        description: talent.description,
        rarity: talent.rarity,
        icon: talent.icon,
        iconFallback: talent.iconFallback
      }))
    });
    
    console.log(`[TALENTS] Sent talentLearningOptions to ${player.username}`);
  });
  
  // Update host
  api.sendToHost('hostGameUpdate', {
    phase: 'talent_learning',
    encounterNumber: encounterNumber,
    message: 'Players are choosing talents...',
    players: Object.values(lobby.state.players).map(p => ({
      id: p.id,
      username: p.username,
      class: p.class,
      health: p.health,
      maxHealth: p.maxHealth
    }))
  });
}

function handleTalentSelection(lobby, api, player, payload) {
  const { talentId } = payload;
  const playerData = lobby.state.players[player.username];
  
  if (!playerData) {
    console.error(`[TALENTS] Player ${player.username} not found`);
    return;
  }
  
  const classData = CLASSES[playerData.class];
  if (!classData || !classData.talents) {
    console.error(`[TALENTS] No talents for class ${playerData.class}`);
    return;
  }
  
  // Find the talent
  const talent = classData.talents.find(t => t.id === talentId);
  if (!talent) {
    console.error(`[TALENTS] Talent ${talentId} not found`);
    return;
  }
  
  // Check if player already learned this talent
  if (playerData.learnedTalents && playerData.learnedTalents.includes(talentId)) {
    console.error(`[TALENTS] Player ${playerData.username} already learned ${talentId}`);
    return;
  }
  
  // Initialize learnedTalents array if it doesn't exist
  if (!playerData.learnedTalents) {
    playerData.learnedTalents = [];
  }
  
  // Add talent item to player's inventory
  playerData.items.push(talentId);
  console.log(`[TALENTS] ${playerData.username} gained talent item: ${talent.name} (${talentId})`);
  
  // Recalculate item effects since player gained a new item
  applyItemEffects(lobby, player.id);
  
  // Add talent to player's learned talents
  if (!playerData.learnedTalents.includes(talentId)) {
    playerData.learnedTalents.push(talentId);
    console.log(`[TALENTS] ${playerData.username} learned ${talent.name}`);
  }

  // Mark player's selection
  lobby.state.talentLearning.playerSelections[playerData.id] = talentId;
  
  // Notify player
  api.sendToPlayer(playerData.id, 'talentLearned', {
    talent: {
      id: talent.id,
      name: talent.name,
      description: talent.description,
      rarity: talent.rarity,
      icon: talent.icon,
      iconFallback: talent.iconFallback
    }
  });
  
  // Send updated player data to the winner so their item list updates
  api.sendToPlayer(player.id, 'gameState', {
    phase: lobby.state.phase,
    playerData: {
      items: playerData.items,
      health: playerData.health,
      maxHealth: playerData.maxHealth,
      defense: playerData.defense,
      itemEffects: playerData.itemEffects,
      baseHealth: playerData.class ? CLASSES[playerData.class].baseHealth : 0,
      baseDefense: playerData.class ? CLASSES[playerData.class].baseDefense : 0
    }
  });
  
  // Check if all players have selected
  checkTalentLearningComplete(lobby, api);
}

function checkTalentLearningComplete(lobby, api) {
  const alivePlayers = Object.values(lobby.state.players).filter(p => p.health > 0);
  const selections = Object.keys(lobby.state.talentLearning.playerSelections);
  
  console.log(`[TALENTS] Talent selections: ${selections.length}/${alivePlayers.length}`);
  
  if (selections.length >= alivePlayers.length) {
    console.log('[TALENTS] All players have selected talents, starting combat');
    
    // Notify all players
    api.sendToAll('talentLearningComplete');
    
    // Clean up talent learning state
    lobby.state.talentLearning = null;
    
    // Check if we should show Pick a Path or go straight to combat
    checkAndStartPickAPath(lobby, api);
  }
}

// ============= PICK A PATH SYSTEM =============

function checkAndStartPickAPath(lobby, api) {
  const nextEncounterNumber = (lobby.state.encounterNumber || 0) + 1;
  
  // Check if next encounter is a boss (every 5th encounter)
  if (nextEncounterNumber % 5 === 0 && BOSS_BATTLES[nextEncounterNumber]) {
    console.log(`[PICK_A_PATH] Next encounter is boss #${nextEncounterNumber}, skipping path selection`);
    setTimeout(() => {
      startCombatPhase(lobby, api);
    }, 2000);
    return;
  }
  
  // Show Pick a Path
  console.log(`[PICK_A_PATH] Starting path selection for encounter #${nextEncounterNumber}`);
  setTimeout(() => {
    startPickAPathPhase(lobby, api, nextEncounterNumber);
  }, 2000);
}

function generateEncounterOption(encounterNumber, numPlayers) {
  const encounterType = Math.random() < 0.2 ? ENCOUNTER_TYPE_PUZZLE : ENCOUNTER_TYPE_COMBAT;
  
  // Generate random difficulty multiplier (1.0 to 2.5)
  let difficulty = 1.0;
  if(Math.random() < 0.4) {
    difficulty += Math.random() * 0.5;
  }
  if(Math.random() < 0.3) {
    difficulty += Math.random() * 1;
  }
  
  // Generate random loot modifier
  const lootRoll = Math.random();
  let lootModifier;
  if (lootRoll < 0.5) {
    lootModifier = 'Normal'; // 50% chance
  } else if (lootRoll < 0.85) {
    lootModifier = 'Plentiful'; // 35% chance
  } else {
    lootModifier = 'Excellent'; // 15% chance
  }
  
  if (encounterType === ENCOUNTER_TYPE_PUZZLE) {
    const puzzleTypes = Object.keys(PUZZLE_TYPES);
    const puzzleType = puzzleTypes[Math.floor(Math.random() * puzzleTypes.length)];
    const puzzleConfig = PUZZLE_TYPES[puzzleType];
    
    // Generate decorative enemies for puzzle encounters
    const enemies = [];
    puzzleConfig.enemies.forEach(enemyId => {
      const enemyTemplate = PUZZLE_ENEMIES[enemyId];
      if (enemyTemplate) {
        const enemy = createEnemyInstance(enemyTemplate, encounterNumber, 1);
        enemies.push(enemy);
      }
    });
    
    return {
      type: ENCOUNTER_TYPE_PUZZLE,
      puzzleType: puzzleType,
      enemies: enemies,
      difficulty: difficulty,
      lootModifier: lootModifier
    };
  } else {
    const budget = calculateEncounterBudget(numPlayers, encounterNumber);
    const adjustedBudget = Math.floor(budget * difficulty); // Apply difficulty to budget
    const enemies = generateEnemiesByBudget(adjustedBudget, encounterNumber, numPlayers);
    
    // Apply difficulty multiplier to enemy stats
    enemies.forEach(enemy => {
      enemy.maxHealth = Math.floor(enemy.maxHealth * difficulty);
      enemy.currentHealth = enemy.maxHealth;
      // Apply difficulty to all damage values in actions
      if (enemy.actions) {
        enemy.actions.forEach(action => {
          if (action.damage) {
            action.damage = Math.floor(action.damage * difficulty);
          }
        });
      }
    });
    
    return {
      type: ENCOUNTER_TYPE_COMBAT,
      enemies: enemies,
      difficulty: difficulty,
      lootModifier: lootModifier
    };
  }
}

function generateEncounterDescription(encounter) {
  let description = '';
  
  if (encounter.type === ENCOUNTER_TYPE_PUZZLE) {
    const puzzleConfig = PUZZLE_TYPES[encounter.puzzleType];
    description = `You sense an ancient ${puzzleConfig ? puzzleConfig.name : 'puzzle'} ahead.`;
    if(Math.random() < 0.6) {
      description = ` You do not hear monsters, but are unsure what you might find here.`;
    }
  } else {
    const enemyCount = encounter.enemies.length;
    const enemyTypes = {};
    
    encounter.enemies.forEach(enemy => {
      enemyTypes[enemy.name] = (enemyTypes[enemy.name] || 0) + 1;
    });
    
    const enemyList = Object.entries(enemyTypes).map(([name, count]) => ({ name: name, count: count }));
    
    description = `Sounds like a room of monsters!`;
    if(Math.random() < 0.7 && enemyList.length > 0) {
      description = ` ${description} There is at least one `+enemyList[0].name+` in the room.`;
    }
    if(Math.random() < 0.5) {
      const minEnemies = Math.max(1, Math.floor(enemyCount - Math.floor(Math.random() * enemyCount)));
      const maxEnemies = Math.max(1, Math.floor(enemyCount + Math.floor(Math.random() * enemyCount)));
      if(Math.random() < 0.2) {
        description = ` ${description} You feel confident there are exactly ${enemyCount} enemies in total.`;
      }else{
        if(minEnemies == maxEnemies) {
          description = ` ${description} You believe there are ${minEnemies} enemies in total, but you are not certain.`;
        }else{
          description = ` ${description} You believe there are between ${minEnemies} and ${maxEnemies} enemies in total.`;
        }
      }
    }
  }
  
  // Add difficulty indicator
  const difficultyPercent = Math.round((encounter.difficulty - 1.0) * 100);
  let difficultyText = '';
  if (difficultyPercent > 0) {
    if(Math.random() < 0.3) {
      difficultyText = ` You cannot determine the strength of the monsters... Danger may lay ahead.`;
    }else{
      difficultyText = (difficultyPercent < 50 ? ' Monsters sound mostly normal.' : difficultyPercent >= 50 && difficultyPercent < 100 ? ' Monsters sound stronger than normal...' 
        : difficultyPercent >= 100 && difficultyPercent < 180 ? ' Monsters sound much stronger than normal!' 
        : ' Monsters sound incredibly strong! They are a threat to the party.');
    }
  }
  
  // Add loot modifier
  let lootText = '';
  if (encounter.lootModifier === 'Plentiful') {
    lootText = ' There appears to be a large amount of treasure!';
  } else if (encounter.lootModifier === 'Excellent') {
    lootText = ' The treasure appears high in quality!';
  }else{
    lootText = ' The treasures appear normal.';
  }

  if(Math.random() < 0.2) {
    lootText = ` You are not certain what treasure you will find.`;
  }

  if(Math.random() < 0.05) {
    return 'You cannot see anything in the darkness... Is it worth the risk?';
  }
  
  return description + difficultyText + lootText;
}

function startPickAPathPhase(lobby, api, nextEncounterNumber) {
  lobby.state.phase = 'pick_a_path';
  
  const numPlayers = Object.values(lobby.state.players).filter(p => p.health > 0).length;
  
  // Generate two encounter options
  const leftPath = generateEncounterOption(nextEncounterNumber, numPlayers);
  const rightPath = generateEncounterOption(nextEncounterNumber, numPlayers);
  
  lobby.state.pickAPath = {
    leftPath: leftPath,
    rightPath: rightPath,
    leftDescription: generateEncounterDescription(leftPath),
    rightDescription: generateEncounterDescription(rightPath),
    votes: {}
  };
  
  console.log(`[PICK_A_PATH] Left: ${lobby.state.pickAPath.leftDescription}`);
  console.log(`[PICK_A_PATH] Right: ${lobby.state.pickAPath.rightDescription}`);
  
  // Notify players
  api.sendToAll('pickAPathStarted', {
    leftDescription: '',
    rightDescription: ''
  });
  
  // Notify host
  api.sendToHost('hostGameUpdate', {
    phase: 'pick_a_path',
    leftDescription: lobby.state.pickAPath.leftDescription,
    rightDescription: lobby.state.pickAPath.rightDescription,
    votes: {}
  });
}

function handlePathVote(lobby, api, player, payload) {
  console.log(`[PICK_A_PATH] handlePathVote called`);
  console.log(`[PICK_A_PATH] Player:`, player ? player.username : 'undefined');
  console.log(`[PICK_A_PATH] Payload:`, payload);
  
  const { choice } = payload; // 'left' or 'right'
  
  if (!lobby.state.pickAPath) {
    console.error(`[PICK_A_PATH] ERROR: No active path selection`);
    console.error(`[PICK_A_PATH] Current lobby.state.phase:`, lobby.state.phase);
    console.error(`[PICK_A_PATH] lobby.state.pickAPath:`, lobby.state.pickAPath);
    return;
  }
  
  if (choice !== 'left' && choice !== 'right') {
    console.error(`[PICK_A_PATH] ERROR: Invalid choice: ${choice}`);
    return;
  }
  
  // Record vote
  lobby.state.pickAPath.votes[player.username] = choice;
  console.log(`[PICK_A_PATH] ✓ ${player.username} voted for ${choice}`);
  
  // Update host with current votes
  api.sendToHost('pathVoteUpdate', {
    votes: lobby.state.pickAPath.votes
  });
  
  // Check if all players have voted
  const alivePlayers = Object.values(lobby.state.players).filter(p => p.health > 0);
  console.log(`[PICK_A_PATH] Alive players:`, alivePlayers.map(p => p.username));
  console.log(`[PICK_A_PATH] Current votes:`, lobby.state.pickAPath.votes);
  const allVoted = alivePlayers.every(p => lobby.state.pickAPath.votes[p.username] !== undefined);
  console.log(`[PICK_A_PATH] All voted: ${allVoted} (${alivePlayers.length} players)`);
  
  if (allVoted) {
    console.log(`[PICK_A_PATH] All players have voted, resolving...`);
    resolvePathVote(lobby, api);
  }
}

function resolvePathVote(lobby, api) {
  const votes = lobby.state.pickAPath.votes;
  let leftVotes = 0;
  let rightVotes = 0;
  
  Object.values(votes).forEach(vote => {
    if (vote === 'left') leftVotes++;
    else if (vote === 'right') rightVotes++;
  });
  
  const chosenPath = leftVotes >= rightVotes ? 'left' : 'right';
  const chosenEncounter = chosenPath === 'left' ? lobby.state.pickAPath.leftPath : lobby.state.pickAPath.rightPath;
  
  console.log(`[PICK_A_PATH] Voting complete: left=${leftVotes}, right=${rightVotes}, chosen=${chosenPath}`);
  
  // Notify everyone of the result
  api.sendToAll('pathChosen', {
    choice: chosenPath,
    leftVotes: leftVotes,
    rightVotes: rightVotes
  });
  
  api.sendToHost('pathChosen', {
    choice: chosenPath,
    leftVotes: leftVotes,
    rightVotes: rightVotes
  });
  
  // Clean up path selection state
  lobby.state.pickAPath = null;
  
  // Start the chosen encounter
  setTimeout(() => {
    startChosenEncounter(lobby, api, chosenEncounter);
  }, 3000);
}

function startChosenEncounter(lobby, api, encounter) {
  lobby.state.phase = 'combat';
  lobby.state.round = 1;
  
  // Initialize encounter counter if not exists
  if (!lobby.state.encounterNumber) {
    lobby.state.encounterNumber = 0;
  }
  lobby.state.encounterNumber++;
  
  const encounterNum = lobby.state.encounterNumber;
  
  console.log(`[ENCOUNTER] Starting chosen ${encounter.type} encounter #${encounterNum} with difficulty ${encounter.difficulty.toFixed(2)} and loot modifier ${encounter.lootModifier}`);
  
  // Store loot modifier for this encounter
  lobby.state.currentLootModifier = encounter.lootModifier;
  
  // Reset ability uses for all players at start of combat
  Object.values(lobby.state.players).forEach(player => {
    if (player.class && CLASSES[player.class]) {
      const classData = CLASSES[player.class];
      player.abilityUses = {};
      
      // Initialize uses for all abilities that have usesPerCombat
      [...classData.actions, ...classData.skills].forEach(ability => {
        if (ability.usesPerCombat) {
          let baseUses = ability.usesPerCombat;
          
          // Add bonus uses from items
          const bonusUses = player.itemEffects?.addBonusUses?.[ability.id] || 0;
          player.abilityUses[ability.id] = baseUses + bonusUses;
          
          console.log(`[ABILITY USES] Player ${player.username}: ${ability.name} - Base: ${baseUses}, Bonus: ${bonusUses}, Total: ${player.abilityUses[ability.id]}`);
        }
      });
    }
  });

  // Start the appropriate encounter type
  if (encounter.type === ENCOUNTER_TYPE_PUZZLE) {
    startPuzzleEncounterWithEnemies(lobby, api, encounter.puzzleType, encounter.enemies);
  } else {
    startRegularCombatWithEnemies(lobby, api, encounter.enemies);
  }
}

function startRegularCombatWithEnemies(lobby, api, enemies) {
  console.log(`[ENCOUNTER] Starting regular combat with pre-generated enemies`);

  lobby.state.combat = {
    enemies: enemies,
    encounterType: ENCOUNTER_TYPE_COMBAT,
    turnOrder: [],
    currentTurnIndex: 0,
    pendingActions: {},
    roundPhase: 'rolling_initiative'
  };

  // Notify players
  api.sendToAll('combatStarted', {
    enemies: enemies.map(e => ({
      id: e.id,
      name: e.name,
      health: e.currentHealth,
      maxHealth: e.maxHealth
    })),
    encounterType: ENCOUNTER_TYPE_COMBAT
  });

  // Trigger start-of-combat procs for players
  triggerStartOfCombatProcs(lobby, api);

  // Send player stats snapshot
  Object.values(lobby.state.players).forEach(p => {
    const classData = p.class ? CLASSES[p.class] : null;
    api.sendToPlayer(p.id, 'gameState', {
      phase: lobby.state.phase,
      playerData: {
        items: p.items,
        health: p.health,
        maxHealth: p.maxHealth,
        defense: p.defense,
        itemEffects: p.itemEffects,
        baseHealth: classData ? classData.baseHealth : 0,
        baseDefense: classData ? classData.baseDefense : 0
      }
    });
  });

  // Update host
  api.sendToHost('hostGameUpdate', {
    phase: 'combat',
    round: lobby.state.round,
    players: Object.values(lobby.state.players).map(p => ({
      id: p.id,
      username: p.username,
      class: p.class,
      health: p.health,
      maxHealth: p.maxHealth,
      defense: p.defense
    })),
    enemies: enemies.map(e => ({
      id: e.id,
      name: e.name,
      health: e.currentHealth,
      maxHealth: e.maxHealth,
      defense: e.currentDefense,
      sprite: e.sprite,
      scale: e.scale,
      tint: e.tint
    })),
    message: 'Combat has begun! Rolling initiative...',
    encounterType: ENCOUNTER_TYPE_COMBAT
  });

  setTimeout(() => rollInitiative(lobby, api), 2000);
}

function startPuzzleEncounterWithEnemies(lobby, api, puzzleType, enemies) {
  const puzzleConfig = PUZZLE_TYPES[puzzleType];
  console.log(`[ENCOUNTER] Starting ${puzzleType} puzzle with pre-generated enemies`);

  lobby.state.combat = {
    enemies: enemies,
    encounterType: ENCOUNTER_TYPE_PUZZLE,
    puzzleType: puzzleType,
    puzzleConfig: puzzleConfig,
    puzzleMaxRounds: puzzleConfig.maxRounds || 10,
    turnOrder: [],
    currentTurnIndex: 0,
    pendingActions: {},
    roundPhase: 'rolling_initiative'
  };

  // Notify players
  api.sendToAll('combatStarted', {
    enemies: enemies.map(e => ({
      id: e.id,
      name: e.name,
      health: e.currentHealth,
      maxHealth: e.maxHealth
    })),
    encounterType: ENCOUNTER_TYPE_PUZZLE,
    puzzleType: puzzleType,
    puzzleMaxRounds: puzzleConfig.maxRounds || 10
  });

  // Trigger start-of-combat procs
  triggerStartOfCombatProcs(lobby, api);

  // Update host
  api.sendToHost('hostGameUpdate', {
    phase: 'combat',
    round: lobby.state.round,
    players: Object.values(lobby.state.players).map(p => ({
      id: p.id,
      username: p.username,
      class: p.class,
      health: p.health,
      maxHealth: p.maxHealth,
      defense: p.defense
    })),
    enemies: enemies.map(e => ({
      id: e.id,
      name: e.name,
      health: e.currentHealth,
      maxHealth: e.maxHealth,
      defense: e.currentDefense,
      sprite: e.sprite,
      scale: e.scale,
      tint: e.tint
    })),
    message: `${puzzleConfig.description}`,
    encounterType: ENCOUNTER_TYPE_PUZZLE,
    puzzleMaxRounds: puzzleConfig.maxRounds || 10,
    puzzleType: puzzleType
  });

  setTimeout(() => rollInitiative(lobby, api), 2000);
}

// ============= ENEMY GENERATION SYSTEM =============

function calculateEncounterBudget(numPlayers, encounterNumber) {
  // Base budget per player
  const basePerPlayer = 0.5;
  
  // Budget increases with each encounter (but caps at reasonable levels)
  const encounterMultiplier = 1 + ((encounterNumber - 1) * 0.5);
  
  const totalBudget = 1.55 + Math.floor(numPlayers * basePerPlayer * encounterMultiplier);
  
  console.log(`[ENCOUNTER] Budget calculation: ${numPlayers} players, encounter #${encounterNumber}, budget: ${totalBudget}`);
  
  return totalBudget;
}

// Helper function to create enemy instances with scaling
function createEnemyInstance(enemyTemplate, encounterNumber, playerCount) {
  // Use same scaling formula as regular combat: 10% per round + 25% per additional player
  const scalingFactor = 1 + encounterNumber * (0.1 + ((playerCount - 1) * 0.25));
  
  // Special scaling for puzzle enemies
  let maxHealth = enemyTemplate.maxHealth || enemyTemplate.health; // Handle both health and maxHealth
  if (enemyTemplate.id === 'puzzle_door') {
    maxHealth = 40 * playerCount; // 40 health per player
  } else {
    // Apply scaling factor to health for non-puzzle enemies
    maxHealth = Math.floor(maxHealth * scalingFactor);
  }
  
  return {
    ...enemyTemplate,
    id: `${enemyTemplate.id}_${Date.now()}_${Math.random()}`,
    maxHealth: maxHealth,
    currentHealth: maxHealth,
    currentDefense: enemyTemplate.defense,
    damageMultiplier: scalingFactor,  // Use scalingFactor for damage too
    statusEffects: []
  };
}

// Helper function to kill an enemy directly without dealing damage
function killEnemy(enemy, reason = 'Unknown') {
  enemy.currentHealth = 0;
  console.log(`[COMBAT] ${enemy.name} killed directly: ${reason}`);
}

function generateEnemiesByBudget(budget, encounterNumber, playerCount) {
  const enemies = [];
  let remainingBudget = budget;
  let enemyIndex = 0;
  
  console.log(`[ENCOUNTER] Generating enemies with budget: ${budget}`);
  
  // Get enemies by level for easier selection
  const enemiesByLevel = {};
  ENEMIES.forEach(enemy => {
    if (!enemiesByLevel[enemy.level]) {
      enemiesByLevel[enemy.level] = [];
    }
    enemiesByLevel[enemy.level].push(enemy);
  });
  
  const maxLevel = Math.max(...ENEMIES.map(e => e.level));
  
  // Generate enemies until budget is exhausted
  while (remainingBudget > 0) {
    // Determine what level enemies we can afford
    const affordableLevels = [];
    for (let level = 1; level <= maxLevel; level++) {
      if (level <= remainingBudget && enemiesByLevel[level]) {
        affordableLevels.push(level);
      }
    }
    
    if (affordableLevels.length === 0) {
      // Can't afford any more enemies
      console.log(`[ENCOUNTER] Remaining budget ${remainingBudget} too small, stopping`);
      break;
    }
    
    // Bias towards lower level enemies when budget is low, higher when budget is high
    // This creates more varied encounters
    let selectedLevel;
    if (remainingBudget <= 2) {
      // Low budget: only pick level 1-2
      selectedLevel = affordableLevels.filter(l => l <= 2)[0] || affordableLevels[0];
    } else if (remainingBudget >= 6) {
      // High budget: can pick any level, bias towards higher
      const weights = affordableLevels.map(l => l * l); // Square for exponential bias
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      const random = Math.random() * totalWeight;
      let cumulative = 0;
      for (let i = 0; i < affordableLevels.length; i++) {
        cumulative += weights[i];
        if (random <= cumulative) {
          selectedLevel = affordableLevels[i];
          break;
        }
      }
    } else {
      // Medium budget: random from affordable
      selectedLevel = affordableLevels[Math.floor(Math.random() * affordableLevels.length)];
    }
    
    // Pick random enemy of that level, filtering by minEncounterNumber
    const availableEnemies = enemiesByLevel[selectedLevel];
    const eligibleEnemies = availableEnemies.filter(enemy => 
      (enemy.minEncounterNumber || 0) <= encounterNumber
    );
    
    if (eligibleEnemies.length === 0) {
      // No eligible enemies for this encounter number, try next level
      console.log(`[ENCOUNTER] No enemies eligible for encounter #${encounterNumber} at level ${selectedLevel}, skipping`);
      continue;
    }
    
    const enemyTemplate = eligibleEnemies[Math.floor(Math.random() * eligibleEnemies.length)];
    
    // Calculate scaling factor: 5% base + 5% per player
    const scalingFactor = 1 + encounterNumber * (0.1 + ((playerCount - 1) * 0.25));
    const scaledHealth = Math.floor(enemyTemplate.health * scalingFactor);
    const scaledDefense = enemyTemplate.defense;
    //const scaledDamage = Math.floor(enemyTemplate.damage * scalingFactor);
    const scaledDamage = enemyTemplate.damage;
    
    enemies.push({
      ...enemyTemplate,
      id: `enemy_${encounterNumber}_${enemyIndex}`,  // Include encounter number for globally unique IDs
      health: scaledHealth,
      damage: scaledDamage,
      defense: scaledDefense,
      maxHealth: scaledHealth,
      currentHealth: scaledHealth,
      currentDefense: scaledDefense,
      damageMultiplier: scalingFactor,  // Store the scaling factor for all damage calculations
      statusEffects: [],
      specialAbilityQueued: null
    });
    
    console.log(`[ENCOUNTER] Added ${enemyTemplate.name} (Level ${enemyTemplate.level}, +${Math.round((scalingFactor - 1) * 100)}% scaling for ${playerCount} players), remaining budget: ${remainingBudget - enemyTemplate.level}`);
    
    remainingBudget -= enemyTemplate.level;
    enemyIndex++;
    
    // Safety limit: max 6 enemies
    if (enemies.length >= 6) {
      console.log(`[ENCOUNTER] Hit max enemy limit (6), stopping`);
      break;
    }
  }
  
  console.log(`[ENCOUNTER] Generated ${enemies.length} enemies:`, enemies.map(e => `${e.name} (Lvl ${e.level})`).join(', '));
  
  return enemies;
}

function startCombatPhase(lobby, api) {
  lobby.state.phase = 'combat';
  lobby.state.round = 1;
  
  // Initialize encounter counter if not exists
  if (!lobby.state.encounterNumber) {
    lobby.state.encounterNumber = 0;
  }
  lobby.state.encounterNumber++;
  
  const encounterNum = lobby.state.encounterNumber;
  let encounterType = ENCOUNTER_TYPE_COMBAT;
  
  // Determine encounter type
  if (encounterNum % 5 === 0 && BOSS_BATTLES[encounterNum]) {
    encounterType = ENCOUNTER_TYPE_BOSS;
  } else if ((encounterNum !== 1 && encounterNum % 5 !== 0 && Math.random() < 0.2) || encounterNum == 3) {
    encounterType = ENCOUNTER_TYPE_PUZZLE;
  }
  
  console.log(`[ENCOUNTER] Starting ${encounterType} encounter #${encounterNum}`);
  
  // Reset ability uses for all players at start of combat
  Object.values(lobby.state.players).forEach(player => {
    if (player.class && CLASSES[player.class]) {
      const classData = CLASSES[player.class];
      player.abilityUses = {};
      
      // Initialize uses for all abilities that have usesPerCombat
      [...classData.actions, ...classData.skills].forEach(ability => {
        if (ability.usesPerCombat) {
          let baseUses = ability.usesPerCombat;
          
          // Add bonus uses from items
          const bonusUses = player.itemEffects?.addBonusUses?.[ability.id] || 0;
          player.abilityUses[ability.id] = baseUses + bonusUses;
          
          console.log(`[ABILITY USES] Player ${player.username}: ${ability.name} - Base: ${baseUses}, Bonus: ${bonusUses}, Total: ${player.abilityUses[ability.id]}`);
        }
      });
    }
  });

  // Branch based on encounter type
  if (encounterType === ENCOUNTER_TYPE_BOSS) {
    startBossBattle(lobby, api, encounterNum);
  } else if (encounterType === ENCOUNTER_TYPE_PUZZLE) {
    startPuzzleEncounter(lobby, api);
  } else {
    startRegularCombat(lobby, api);
  }
}

function startRegularCombat(lobby, api) {
  const alivePlayers = Object.values(lobby.state.players).filter(p => p.health > 0);
  const numPlayers = alivePlayers.length;
  
  console.log(`[ENCOUNTER] Starting regular combat with ${numPlayers} players`);
  
  // Calculate budget and generate enemies
  const budget = calculateEncounterBudget(numPlayers, lobby.state.encounterNumber);
  const enemies = generateEnemiesByBudget(budget, lobby.state.encounterNumber, numPlayers);

  lobby.state.combat = {
    enemies: enemies,
    encounterType: ENCOUNTER_TYPE_COMBAT,
    turnOrder: [],
    currentTurnIndex: 0,
    pendingActions: {}, // Will store { playerId: { actions: [], currentActionIndex: 0, totalActions: 1 } }
    roundPhase: 'rolling_initiative' // rolling_initiative, selecting_actions, resolving
  };

  // Notify players
  api.sendToAll('combatStarted', {
    enemies: enemies.map(e => ({
      id: e.id,
      name: e.name,
      health: e.currentHealth,
      maxHealth: e.maxHealth
    })),
    encounterType: ENCOUNTER_TYPE_COMBAT
  });

  // Trigger start-of-combat procs for players (buffs, etc.) before host UI update
  triggerStartOfCombatProcs(lobby, api);

  // Send player stats snapshot to populate Inventory tab at start of combat
  Object.values(lobby.state.players).forEach(p => {
    const classData = p.class ? CLASSES[p.class] : null;
    api.sendToPlayer(p.id, 'gameState', {
      phase: lobby.state.phase,
      playerData: {
        items: p.items,
        health: p.health,
        maxHealth: p.maxHealth,
        defense: p.defense,
        itemEffects: p.itemEffects,
        baseHealth: classData ? classData.baseHealth : 0,
        baseDefense: classData ? classData.baseDefense : 0
      }
    });
  });

  // Update host with combat UI
  api.sendToHost('hostGameUpdate', {
    phase: 'combat',
    round: lobby.state.round,
    players: Object.values(lobby.state.players).map(p => ({
      id: p.id,
      username: p.username,
      class: p.class,
      health: p.health,
      maxHealth: p.maxHealth,
      defense: p.defense
    })),
    enemies: enemies.map(e => ({
      id: e.id,
      name: e.name,
      health: e.currentHealth,
      maxHealth: e.maxHealth,
      defense: e.currentDefense,
      sprite: e.sprite,
      scale: e.scale,
      tint: e.tint
    })),
    message: 'Combat has begun! Rolling initiative...',
    encounterType: ENCOUNTER_TYPE_COMBAT
  });

  // Roll initiative after a brief delay
  setTimeout(() => {
    rollInitiative(lobby, api);
  }, 2000);
}

function startBossBattle(lobby, api, encounterNum) {
  const bossConfig = BOSS_BATTLES[encounterNum];
  const enemies = [];
  const numPlayers = Object.values(lobby.state.players).filter(p => p.health > 0).length;
  
  console.log(`[ENCOUNTER] Starting boss battle #${encounterNum}`);
  
  // Generate boss enemies from predetermined list
  bossConfig.forEach(config => {
    const enemyTemplate = ENEMIES.find(e => e.id === config.enemy);
    if (enemyTemplate) {
      for (let i = 0; i < config.count; i++) {
        const enemy = createEnemyInstance(enemyTemplate, lobby.state.encounterNumber, numPlayers);
        enemies.push(enemy);
      }
    }
  });

  lobby.state.combat = {
    enemies: enemies,
    encounterType: ENCOUNTER_TYPE_BOSS,
    turnOrder: [],
    currentTurnIndex: 0,
    pendingActions: {}, // Will store { playerId: { actions: [], currentActionIndex: 0, totalActions: 1 } }
    roundPhase: 'rolling_initiative'
  };

  // Notify players
  api.sendToAll('combatStarted', {
    enemies: enemies.map(e => ({
      id: e.id,
      name: e.name,
      health: e.currentHealth,
      maxHealth: e.maxHealth
    })),
    encounterType: ENCOUNTER_TYPE_BOSS
  });

  // Trigger start-of-combat procs for players (buffs, etc.) before host UI update
  triggerStartOfCombatProcs(lobby, api);

  // Update host with combat UI
  api.sendToHost('hostGameUpdate', {
    phase: 'combat',
    round: lobby.state.round,
    players: Object.values(lobby.state.players).map(p => ({
      id: p.id,
      username: p.username,
      class: p.class,
      health: p.health,
      maxHealth: p.maxHealth,
      defense: p.defense
    })),
    enemies: enemies.map(e => ({
      id: e.id,
      name: e.name,
      health: e.currentHealth,
      maxHealth: e.maxHealth,
      defense: e.currentDefense,
      sprite: e.sprite,
      scale: e.scale,
      tint: e.tint
    })),
    message: 'Boss battle has begun! Rolling initiative...',
    encounterType: ENCOUNTER_TYPE_BOSS
  });
  
  setTimeout(() => rollInitiative(lobby, api), 2000);
}

function startPuzzleEncounter(lobby, api) {
  // Select random puzzle type
  const puzzleTypes = Object.keys(PUZZLE_TYPES);
  const selectedPuzzleType = puzzleTypes[Math.floor(Math.random() * puzzleTypes.length)];
  const puzzleConfig = PUZZLE_TYPES[selectedPuzzleType];
  
  console.log(`[ENCOUNTER] Starting puzzle encounter: ${selectedPuzzleType}`);
  
  // Generate decorative enemies
  const enemies = [];
  puzzleConfig.enemies.forEach(enemyId => {
    const enemyTemplate = PUZZLE_ENEMIES[enemyId];
    if (enemyTemplate) {
      const enemy = createEnemyInstance(enemyTemplate, lobby.state.encounterNumber, 1);
      enemies.push(enemy);
    }
  });

  lobby.state.combat = {
    enemies: enemies,
    encounterType: ENCOUNTER_TYPE_PUZZLE,
    puzzleType: selectedPuzzleType,
    puzzleConfig: puzzleConfig,
    turnOrder: [],
    currentTurnIndex: 0,
    pendingActions: {}, // Will store { playerId: { actions: [], currentActionIndex: 0, totalActions: 1 } }
    roundPhase: 'rolling_initiative',
    puzzleMaxRounds: puzzleConfig.maximumRounds,
    puzzleSuccess: false
  };

  // Trigger start-of-combat procs for players in puzzles too (e.g., banners apply)
  triggerStartOfCombatProcs(lobby, api);

  // Notify players
  api.sendToAll('combatStarted', { 
    enemies: enemies.map(e => ({
      id: e.id,
      name: e.name,
      health: e.currentHealth,
      maxHealth: e.maxHealth
    })),
    encounterType: ENCOUNTER_TYPE_PUZZLE,
    puzzleType: selectedPuzzleType 
  });

  // Update host with combat UI
  api.sendToHost('hostGameUpdate', { 
    phase: 'combat',
    round: lobby.state.round,
    puzzleMaxRounds: lobby.state.combat.puzzleMaxRounds,
    players: Object.values(lobby.state.players).map(p => ({
      id: p.id,
      username: p.username,
      class: p.class,
      health: p.health,
      maxHealth: p.maxHealth,
      defense: p.defense
    })),
    enemies: enemies.map(e => ({
      id: e.id,
      name: e.name,
      health: e.currentHealth,
      maxHealth: e.maxHealth,
      defense: e.currentDefense,
      sprite: e.sprite,
      scale: e.scale,
      tint: e.tint
    })),
    message: `Puzzle encounter: ${puzzleConfig.name}! Rolling initiative...`,
    encounterType: ENCOUNTER_TYPE_PUZZLE,
    puzzleType: selectedPuzzleType 
  });
  
  // For riddlemaster puzzles, automatically show the riddle
  if (selectedPuzzleType === 'riddlemaster') {
    const riddle = generateRandomRiddle();
    lobby.state.combat.currentRiddle = riddle;
    lobby.state.combat.riddleAnswered = false;
    
    // Send riddle to host for display
    api.sendToHost('riddleDisplay', {
      question: riddle.question,
      options: riddle.options,
      riddleId: riddle.id
    });
    
    api.sendToHost('animateAction', {
      actor: 'The Riddlemaster',
      action: 'The Riddlemaster',
      type: 'popup',
      message: 'Solve the riddle to pass.',
      color: '#ffaa00'
    });
  }
  
  // For puzzles, players act but enemies don't
  setTimeout(() => rollInitiative(lobby, api), 2000);
}

function rollInitiative(lobby, api) {
  const turnOrder = [];

  // Roll for each player
  Object.values(lobby.state.players).forEach(player => {
    if (player.health > 0) {
      const speedRollModifier = player.itemEffects?.speed || 0;
      const roll = Math.floor(Math.random() * 100) + 1 + getTotalStatusEffectPoints(player, 'speed') + getTotalStatusEffectPoints(player, 'haste') - getTotalStatusEffectPoints(player, 'slow') + speedRollModifier;
      player.speed = roll;
      turnOrder.push({
        type: 'player',
        id: player.id,  // Keep for message routing
        username: player.username,  // Primary identifier
        class: player.class,
        speed: roll
      });
    }
  });

  // Roll for each enemy
  lobby.state.combat.enemies.forEach(enemy => {
    if (enemy.currentHealth > 0 && (enemy.damage > 0 || enemy.forceInitiative)) {
      let roll = Math.floor(Math.random() * 100) + 1;
      roll += getTotalStatusEffectPoints(enemy, 'speed') + getTotalStatusEffectPoints(enemy, 'haste') - getTotalStatusEffectPoints(enemy, 'slow');
      enemy.speed = roll;
      
      // Determine if enemy will use special ability this round
      enemy.specialAbilityQueued = null;
      if (enemy.specialAbilities && enemy.specialAbilities.length > 0) {
        const abilityRoll = Math.random() * 100;
        let cumulativeWeight = 0;
        
        for (const ability of enemy.specialAbilities) {
          cumulativeWeight += ability.weight;
          if (abilityRoll < cumulativeWeight) {
            enemy.specialAbilityQueued = ability;
            break;
          }
        }
      }
      
      turnOrder.push({
        type: 'enemy',
        id: enemy.id,
        name: enemy.name,
        speed: roll,
        specialAbility: enemy.specialAbilityQueued ? enemy.specialAbilityQueued.name : null
      });
    }
  });

  // Sort by speed (highest first)
  turnOrder.sort((a, b) => b.speed - a.speed);
  
  lobby.state.combat.turnOrder = turnOrder;
  lobby.state.combat.currentTurnIndex = 0;
  lobby.state.combat.roundPhase = 'selecting_actions';

  // Notify everyone of turn order
  api.sendToAll('initiativeRolled', {
    turnOrder: turnOrder
  });

  // Update host
  const hostUpdate = {
    phase: 'combat',
    round: lobby.state.round,
    turnOrder: turnOrder,
    players: Object.values(lobby.state.players).map(p => ({
      id: p.id,
      username: p.username,
      class: p.class,
      health: p.health,
      maxHealth: p.maxHealth,
      defense: p.defense,
      speed: turnOrder.find(t => t.id === p.id)?.speed || 0
    })),
    enemies: lobby.state.combat.enemies.map(e => ({
      id: e.id,
      name: e.name,
      health: e.currentHealth,
      maxHealth: e.maxHealth,
      defense: e.currentDefense,
      speed: turnOrder.find(t => t.id === e.id)?.speed || 0,
      specialAbilityQueued: e.specialAbilityQueued ? e.specialAbilityQueued.name : null,  // Show warning indicator
      sprite: e.sprite,
      scale: e.scale,
      tint: e.tint,
      summonedBy: e.summonedBy
    })),
    message: 'Initiative rolled! Players selecting actions...',
    encounterType: lobby.state.combat.encounterType
  };
  
  // Add puzzle-specific data
  if (lobby.state.combat.encounterType === ENCOUNTER_TYPE_PUZZLE) {
    hostUpdate.puzzleMaxRounds = lobby.state.combat.puzzleMaxRounds;
    hostUpdate.puzzleType = lobby.state.combat.puzzleType;
  }
  
  api.sendToHost('hostGameUpdate', hostUpdate);

  // Initialize action timers for this round
  if (!lobby.state.combat.actionTimers) {
    lobby.state.combat.actionTimers = {};
  }
  
  // Give each player 3 random action options
  console.log(`[INITIATIVE] Sending action options to ${Object.values(lobby.state.players).length} players`);
  Object.values(lobby.state.players).forEach(player => {
    console.log(`[INITIATIVE] Checking player ${player.username}: health=${player.health}, class=${player.class}, socketId=${player.id}`);
    if (player.health > 0 && player.class) {
      let actionOptions = [];
      
      // Check if puzzle encounter
      if (lobby.state.combat.encounterType === ENCOUNTER_TYPE_PUZZLE) {
        const puzzleConfig = lobby.state.combat.puzzleConfig;
        const puzzleActions = puzzleConfig.actions.map(actionId => PUZZLE_ACTIONS[actionId]).filter(a => a);
        actionOptions = getRandomActions(puzzleActions, 3);
        console.log(`[PUZZLE] Player ${player.username} gets puzzle actions: ${actionOptions.map(a => a.name).join(', ')}`);
      } else {
        // Regular combat actions
        const encounterNumber = lobby.state.encounterNumber || 1;
        const unlockedActions = player.actions.filter(action => {
          const requiredLevel = action.level || 1; // Default level 1 if not specified
          return encounterNumber >= requiredLevel;
        });
        
        // Filter out abilities that have no remaining uses
        const availableActions = unlockedActions.filter(action => {
          if (action.usesPerCombat) {
            const remainingUses = player.abilityUses[action.id] || 0;
            return remainingUses > 0;
          }
          return true; // No use limit, always available
        });
        
        console.log(`[ACTIONS] Player ${player.username}: ${availableActions.length}/${unlockedActions.length} actions available (${unlockedActions.length - availableActions.length} used up) for encounter #${encounterNumber}`);
        
        actionOptions = getRandomActions(availableActions, 3);
      }
      
      // Store the original action options for this player (for multi-action rounds)
      if (!lobby.state.combat.playerActionOptions) {
        lobby.state.combat.playerActionOptions = {};
      }
      lobby.state.combat.playerActionOptions[player.username] = [...actionOptions];
      
      // Scale actions for this player
      const scaledActions = [...actionOptions].map(action => scaleActionForPlayer(action, player, lobby));
      
      // Get consumable item actions (always available, separate from random actions)
      const items = getPlayerItems(player);
      const consumableActions = [];
      const seenConsumables = new Set();
      items.forEach(item => {
        if (item.consumable && item.on_use && !seenConsumables.has(item.id)) {
          seenConsumables.add(item.id);
          const itemCount = player.items.filter(id => id === item.id).length;
          consumableActions.push({
            ...item.on_use,
            consumableItemId: item.id,
            isConsumable: true,
            consumableCount: itemCount
          });
        }
      });
      const scaledConsumables = consumableActions.map(action => scaleActionForPlayer(action, player, lobby));
      
      console.log(`[INITIATIVE] Sending ${scaledActions.length} action options + ${scaledConsumables.length} consumables to ${player.username} (socket: ${player.id})`);
      api.sendToPlayer(player.id, 'actionOptions', {
        actions: scaledActions,
        consumables: scaledConsumables,
        yourTurn: turnOrder.findIndex(t => t.username === player.username),
        selectedActionIds: [] // No actions selected yet
      });
      console.log(`[INITIATIVE] Action options sent to ${player.username}`);
      
      // Start 30-second timer for this player
      startActionTimer(lobby, api, player);
    } else {
      console.log(`[INITIATIVE] Skipping ${player.username}: health=${player.health}, class=${player.class}`);
    }
  });
  console.log(`[INITIATIVE] Finished sending action options to all players`);
}

function startActionTimer(lobby, api, player) {
  const username = player.username;
  
  // Clear any existing timer for this player
  if (lobby.state.combat.actionTimers[username]) {
    clearTimeout(lobby.state.combat.actionTimers[username]);
  }
  
  console.log(`[TIMER] Starting 30-second action timer for ${username}`);
  
  // Set 30-second timer
  lobby.state.combat.actionTimers[username] = setTimeout(() => {
    console.log(`[TIMER] Action timer expired for ${username}`);
    
    // Check if player still hasn't completed their action selection
    const pending = lobby.state.combat.pendingActions[username];
    const playerData = lobby.state.players[username];
    
    if (!playerData || playerData.health <= 0) {
      console.log(`[TIMER] Player ${username} is dead or not found, skipping timeout`);
      return;
    }
    
    // Check if player has completed all their actions
    if (pending && pending.actions.length >= pending.totalActions) {
      console.log(`[TIMER] Player ${username} already completed actions, skipping timeout`);
      return;
    }
    
    // Player failed to select actions in time - mark them as passing their turn
    console.log(`[TIMER] Player ${username} timed out, passing their turn`);
    
    // Initialize pending actions if not exists
    if (!pending) {
      const additionalActions = lobby.state.combat.encounterType === ENCOUNTER_TYPE_PUZZLE ? 0 : getTotalItemEffectValue(playerData, 'grantAdditionalActions') || 0;
      lobby.state.combat.pendingActions[username] = {
        actions: [],
        currentActionIndex: 0,
        totalActions: 1 + additionalActions
      };
    }
    
    // Fill remaining actions with "pass" actions
    const remainingActions = lobby.state.combat.pendingActions[username].totalActions - lobby.state.combat.pendingActions[username].actions.length;
    
    for (let i = 0; i < remainingActions; i++) {
      lobby.state.combat.pendingActions[username].actions.push({
        action: { id: 'pass', name: 'Pass', type: 'pass' },
        target: null,
        targetSelected: true
      });
    }
    
    // Notify player that they passed their turn
    api.sendToPlayer(player.id, 'actionTimedOut', {
      message: 'Time expired! Your turn has been passed.'
    });
    
    // Check if all players have now completed their actions
    checkAllActionsSelected(lobby, api);
  }, 30000); // 30 seconds
}

function clearActionTimer(lobby, username) {
  if (lobby.state.combat && lobby.state.combat.actionTimers && lobby.state.combat.actionTimers[username]) {
    clearTimeout(lobby.state.combat.actionTimers[username]);
    delete lobby.state.combat.actionTimers[username];
    console.log(`[TIMER] Cleared action timer for ${username}`);
  }
}

function getRandomActions(actions, count) {
  const shuffled = [...actions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, actions.length));
}

function scaleActionForPlayer(action, player, lobby) {
  // Calculate player's item effects - use username for lookup
  const itemEffects = applyItemEffects(lobby, player.username);
  const statePlayer = (lobby && lobby.state && lobby.state.players && lobby.state.players[player.username]) || player;
  
  // Create a copy of the action with scaled values
  const scaledAction = { ...action };
  
  // Scale damage
  if (scaledAction.damage) {
    let scaledDamage = scaledAction.damage;
    
    // Apply physical/magic damage modifiers
    if (scaledAction.damageType === 'physical') {
      scaledDamage = Math.floor(scaledDamage * (1 + itemEffects.physicalDamage / 100));
    } else if (scaledAction.damageType === 'magic') {
      scaledDamage = Math.floor(scaledDamage * (1 + itemEffects.magicDamage / 100));
    }
    
    // Apply ability-specific damage buffs
    if (itemEffects.abilityBuffs && itemEffects.abilityBuffs[action.id] && itemEffects.abilityBuffs[action.id].damage) {
      scaledDamage = Math.floor(scaledDamage * (1 + itemEffects.abilityBuffs[action.id].damage / 100));
    }
    
    scaledAction.damage = scaledDamage;
  }
  
  // Scale healing
  if (scaledAction.heal) {
    let scaledHeal = Math.floor(scaledAction.heal * (1 + itemEffects.healingBonus / 100));
    
    // Apply ability-specific healing buffs
    if (itemEffects.abilityBuffs && itemEffects.abilityBuffs[action.id] && itemEffects.abilityBuffs[action.id].healing) {
      scaledHeal = Math.floor(scaledHeal * (1 + itemEffects.abilityBuffs[action.id].healing / 100));
    }
    
    scaledAction.heal = scaledHeal;
  }
  
  // Scale hit chance
  if (scaledAction.hitChanceModifier !== undefined) {
    const scaledHitChance = Math.min(100, scaledAction.hitChanceModifier + itemEffects.hitChance);
    scaledAction.hitChance = scaledHitChance;
  }

  // Apply ability-specific repeats buffs
  if (itemEffects.abilityBuffs && itemEffects.abilityBuffs[action.id] && itemEffects.abilityBuffs[action.id].repeats) {
    const bonusRepeats = itemEffects.abilityBuffs[action.id].repeats;
    const baseRepeats = scaledAction.repeats || 1;
    // Interpret repeats as total repeats; we add bonus to total count
    scaledAction.repeats = Math.max(1, baseRepeats + bonusRepeats);
  }
  
  // Replace placeholders in description
  if (scaledAction.desc) {
    scaledAction.desc = scaledAction.desc
      .replace(/\$d/g, scaledAction.damage || 0)
      .replace(/\$h/g, scaledAction.heal || 0);
  }
  
  // Add remaining uses information if the ability has usesPerCombat
  if (action.usesPerCombat) {
    const bonusUses = (itemEffects.addBonusUses && itemEffects.addBonusUses[action.id]) || 0;
    scaledAction.remainingUses = (statePlayer.abilityUses && statePlayer.abilityUses[action.id]) || 0;
    scaledAction.maxUses = action.usesPerCombat + bonusUses;
  }
  
  return scaledAction;
}

function handleActionSelection(lobby, api, player, payload) {
  const { actionId } = payload;
  const playerData = lobby.state.players[player.username];

  if (!playerData || playerData.health <= 0) {
    console.error(`[RPG] Player ${player.username} not found or dead in handleActionSelection`);
    return;
  }

  // Find the action - check puzzle actions first if in puzzle encounter
  let action;
  if (lobby.state.combat.encounterType === ENCOUNTER_TYPE_PUZZLE) {
    action = PUZZLE_ACTIONS[actionId];
  } else {
    // Check regular actions
    action = playerData.actions.find(a => a.id === actionId);
    
    // If not found, check if it's a consumable action
    if (!action) {
      const items = getPlayerItems(playerData);
      console.log(`[ACTION] Checking consumables for ${player.username}. Items:`, playerData.items);
      console.log(`[ACTION] Resolved items:`, items.map(i => ({ id: i.id, consumable: i.consumable, on_use_id: i.on_use?.id })));
      console.log(`[ACTION] Looking for action ID: ${actionId}`);
      
      items.forEach(item => {
        if (item.consumable && item.on_use && item.on_use.id === actionId) {
          console.log(`[ACTION] Found matching consumable: ${item.id}`);
          const itemCount = playerData.items.filter(id => id === item.id).length;
          action = {
            ...item.on_use,
            consumableItemId: item.id,
            isConsumable: true,
            consumableCount: itemCount
          };
        }
      });
    }
  }
  
  if (!action) {
    console.log(`[ACTION] No action found for ID: ${actionId}. Player actions:`, playerData.actions.map(a => a.id));
    return api.sendToPlayer(player.id, 'error', { message: 'Invalid action' });
  }

  // Initialize pending actions structure if not exists
  if (!lobby.state.combat.pendingActions[player.username]) {
    const isPuzzle = lobby.state.combat.encounterType === ENCOUNTER_TYPE_PUZZLE;
    const additionalActions = isPuzzle ? 0 : (getTotalItemEffectValue(playerData, 'grantAdditionalActions') || 0);
    lobby.state.combat.pendingActions[player.username] = {
      actions: [],
      currentActionIndex: 0,
      totalActions: 1 + additionalActions
    };
  }

  const pending = lobby.state.combat.pendingActions[player.username];
  
  // Add the selected action to the actions array
  pending.actions.push({
    action: action,
    targetSelected: false,
    target: null
  });

  // If action needs a target, optionally auto-select when only one valid target exists
  if (action.target && action.target !== 'self' && action.target !== 'all_allies' && action.target !== 'all_enemies') {
    const targets = getValidTargets(lobby, action.target, action, player);
    
    // Auto-select the lone enemy target when only one enemy is alive
    if (action.target === 'enemy' && Array.isArray(targets) && targets.length === 1) {
      const loneTarget = targets[0];
      const idx = pending.actions.length - 1;
      pending.actions[idx].targetSelected = true;
      pending.actions[idx].target = loneTarget.id;

      // Proceed to next action selection or confirmation without prompting the player
      if (pending.actions.length < pending.totalActions) {
        // Replace the used action in stored options (only for non-consumables)
        if (!action.isConsumable) {
          try {
            if (!lobby.state.combat.playerActionOptions) lobby.state.combat.playerActionOptions = {};
            const usedActionId = action.id;
            let options = lobby.state.combat.playerActionOptions[player.username] || [];
            // Remove the used action from current options
            options = options.filter(opt => opt && opt.id !== usedActionId);

            // Only attempt to replace in non-puzzle encounters
            if (lobby.state.combat.encounterType !== ENCOUNTER_TYPE_PUZZLE) {
              const encounterNumber = lobby.state.encounterNumber || 1;
              // Build unlocked and available pool
              const unlocked = (playerData.actions || []).filter(a => (a.level || 1) <= encounterNumber);
              const availablePool = unlocked.filter(a => {
                if (a.usesPerCombat) {
                  const remaining = (playerData.abilityUses && playerData.abilityUses[a.id]) || 0;
                  if (remaining <= 0) return false;
                }
                return true;
              });
              // Exclude already selected this turn
              const selectedIds = new Set(pending.actions.map(x => x.action.id));
              // Exclude actions already present in current options
              const currentOptionIds = new Set(options.map(x => x.id));
              const candidatePool = availablePool.filter(a => !selectedIds.has(a.id) && !currentOptionIds.has(a.id) && a.id !== usedActionId);
              if (candidatePool.length > 0) {
                const pick = candidatePool[Math.floor(Math.random() * candidatePool.length)];
                options.push(pick);
              }
              // Ensure we keep at most 3 options
              if (options.length > 3) options = options.slice(0, 3);
            }
            // Save back updated options
            lobby.state.combat.playerActionOptions[player.username] = options;
          } catch (e) {
            console.warn('[MULTI-ACTION] Failed to refresh player action options:', e.message);
          }
        }
        
        showNextActionOptions(lobby, api, player);
      } else {
        api.sendToPlayer(player.id, 'allActionsConfirmed', {
          totalActions: pending.totalActions
        });
        checkAllActionsSelected(lobby, api);
      }
    } else {
      // Send target selection prompt as usual
      api.sendToPlayer(player.id, 'selectTarget', {
        action: action,
        targets: targets,
        actionIndex: pending.actions.length - 1,
        totalActions: pending.totalActions
      });
    }
  } else {
    // No target needed, action is ready
    pending.actions[pending.actions.length - 1].targetSelected = true;
    pending.actions[pending.actions.length - 1].target = null;

    // Check if player has more actions to select
    if (pending.actions.length < pending.totalActions) {
      // Replace the used action in stored options (only for non-consumables)
      if (!action.isConsumable) {
        try {
          if (!lobby.state.combat.playerActionOptions) lobby.state.combat.playerActionOptions = {};
          const usedActionId = action.id;
          let options = lobby.state.combat.playerActionOptions[player.username] || [];
          // Remove the used action from current options
          options = options.filter(opt => opt && opt.id !== usedActionId);

          // Only attempt to replace in non-puzzle encounters
          if (lobby.state.combat.encounterType !== ENCOUNTER_TYPE_PUZZLE) {
            const encounterNumber = lobby.state.encounterNumber || 1;
            // Build unlocked and available pool
            const unlocked = (playerData.actions || []).filter(a => (a.level || 1) <= encounterNumber);
            const availablePool = unlocked.filter(a => {
              if (a.usesPerCombat) {
                const remaining = (playerData.abilityUses && playerData.abilityUses[a.id]) || 0;
                if (remaining <= 0) return false;
              }
              return true;
            });
            // Exclude already selected this turn
            const selectedIds = new Set(pending.actions.map(x => x.action.id));
            // Exclude actions already present in current options
            const currentOptionIds = new Set(options.map(x => x.id));
            const candidatePool = availablePool.filter(a => !selectedIds.has(a.id) && !currentOptionIds.has(a.id) && a.id !== usedActionId);
            if (candidatePool.length > 0) {
              const pick = candidatePool[Math.floor(Math.random() * candidatePool.length)];
              options.push(pick);
            }
            // Ensure we keep at most 3 options
            if (options.length > 3) options = options.slice(0, 3);
          }
          // Save back updated options
          lobby.state.combat.playerActionOptions[player.username] = options;
        } catch (e) {
          console.warn('[MULTI-ACTION] Failed to refresh player action options:', e.message);
        }
      }
      
      // Show next action options
      showNextActionOptions(lobby, api, player);
    } else {
      // All actions selected, confirm
      api.sendToPlayer(player.id, 'allActionsConfirmed', {
        totalActions: pending.totalActions
      });
      checkAllActionsSelected(lobby, api);
    }
  }
}

function handleTargetSelection(lobby, api, player, payload) {
  const { targetId, actionIndex } = payload;
  const pending = lobby.state.combat.pendingActions[player.username];

  if (!pending || !pending.actions[actionIndex]) {
    console.error(`[RPG] No pending actions found for ${player.username} in handleTargetSelection`);
    return;
  }

  // Set target for the specific action
  pending.actions[actionIndex].target = targetId;
  pending.actions[actionIndex].targetSelected = true;

  // Check if player has more actions to select
  if (pending.actions.length < pending.totalActions) {
    // Replace the last used action in the stored options with a new one from the available pool
    try {
      if (!lobby.state.combat.playerActionOptions) lobby.state.combat.playerActionOptions = {};
      const usedActionId = pending.actions[actionIndex].action.id;
      let options = lobby.state.combat.playerActionOptions[player.username] || [];
      // Remove the used action from current options
      options = options.filter(opt => opt && opt.id !== usedActionId);

      // Only attempt to replace in non-puzzle encounters
      if (lobby.state.combat.encounterType !== ENCOUNTER_TYPE_PUZZLE) {
        const playerData = lobby.state.players[player.username];
        const encounterNumber = lobby.state.encounterNumber || 1;
        // Build unlocked and available pool
        const unlocked = (playerData.actions || []).filter(a => (a.level || 1) <= encounterNumber);
        const availablePool = unlocked.filter(a => {
          if (a.usesPerCombat) {
            const remaining = (playerData.abilityUses && playerData.abilityUses[a.id]) || 0;
            if (remaining <= 0) return false;
          }
          return true;
        });
        // Exclude already selected this turn
        const selectedIds = new Set(pending.actions.map(x => x.action.id));
        // Exclude actions already present in current options
        const currentOptionIds = new Set(options.map(x => x.id));
        const candidatePool = availablePool.filter(a => !selectedIds.has(a.id) && !currentOptionIds.has(a.id) && a.id !== usedActionId);
        if (candidatePool.length > 0) {
          const pick = candidatePool[Math.floor(Math.random() * candidatePool.length)];
          options.push(pick);
        }
        // Ensure we keep at most 3 options
        if (options.length > 3) options = options.slice(0, 3);
      }
      // Save back updated options
      lobby.state.combat.playerActionOptions[player.username] = options;
    } catch (e) {
      console.warn('[MULTI-ACTION] Failed to refresh player action options:', e.message);
    }

    // Show next action options
    showNextActionOptions(lobby, api, player);
  } else {
    // All actions selected, confirm
    api.sendToPlayer(player.id, 'allActionsConfirmed', {
      totalActions: pending.totalActions
    });
    
    // Clear the action timer for this player
    clearActionTimer(lobby, player.username);
    
    checkAllActionsSelected(lobby, api);
  }
}

function showNextActionOptions(lobby, api, player) {
  const playerData = lobby.state.players[player.username];
  const pending = lobby.state.combat.pendingActions[player.username];
  
  if (!playerData || !pending) {
    return;
  }

  // Use the stored action options from the beginning of the round
  let actionOptions = lobby.state.combat.playerActionOptions[player.username] || [];
  
  // If no stored options, fall back to generating new ones (shouldn't happen)
  if (!actionOptions || actionOptions.length === 0) {
    console.warn(`[MULTI-ACTION] No stored action options for player ${playerData.username}, generating new ones`);
    
    if (lobby.state.combat.encounterType === ENCOUNTER_TYPE_PUZZLE) {
      const puzzleConfig = lobby.state.combat.puzzleConfig;
      const puzzleActions = puzzleConfig.actions.map(actionId => PUZZLE_ACTIONS[actionId]).filter(a => a);
      actionOptions = getRandomActions(puzzleActions, 3);
    } else {
      const encounterNumber = lobby.state.encounterNumber || 1;
      const unlockedActions = playerData.actions.filter(action => {
        const requiredLevel = action.level || 1;
        return encounterNumber >= requiredLevel;
      });
      
      const availableActions = unlockedActions.filter(action => {
        if (action.usesPerCombat) {
          const remainingUses = playerData.abilityUses[action.id] || 0;
          return remainingUses > 0;
        }
        return true;
      });
      
      actionOptions = getRandomActions(availableActions, 3);
    }
  }
  
  // Scale actions for this player
  const scaledActions = [...actionOptions].map(action => scaleActionForPlayer(action, player, lobby));
  
  // Get consumable item actions (always available, separate from random actions)
  const items = getPlayerItems(playerData);
  const consumableActions = [];
  const seenConsumables = new Set();
  items.forEach(item => {
    if (item.consumable && item.on_use && !seenConsumables.has(item.id)) {
      seenConsumables.add(item.id);
      const itemCount = playerData.items.filter(id => id === item.id).length;
      consumableActions.push({
        ...item.on_use,
        consumableItemId: item.id,
        isConsumable: true,
        consumableCount: itemCount
      });
    }
  });
  const scaledConsumables = consumableActions.map(action => scaleActionForPlayer(action, playerData, lobby));
  
  // Get list of already selected action IDs
  const selectedActionIds = pending.actions.map(action => action.action.id);
  
  api.sendToPlayer(player.id, 'actionOptions', {
    actions: scaledActions,
    consumables: scaledConsumables,
    actionIndex: pending.actions.length,
    totalActions: pending.totalActions,
    selectedActionIds: selectedActionIds
  });
}

// Calculate hit chance based on target's defense
// Formula: Base 85% hit chance - (defense / 2)%
// Min 20% hit chance, Max 95%
// Base defense has diminishing returns, status effect defense provides full benefit
function calculateHitChance(target, abilityModifier = 0, attackerItemBonus = 0) {
  const baseHitChance = 85;
  
  // Get base defense (from items/class) and status effect defense separately
  const baseDefense = getBaseDefense(target);
  const statusDefense = getStatusEffectDefense(target);
  
  // Apply diminishing returns to base defense using a logarithmic curve
  // Formula: defense * (1 - 0.5 * log(defense + 1) / log(50))
  // This means defense becomes less effective as it increases
  let effectiveBaseDefense;
  if (baseDefense <= 0) {
    effectiveBaseDefense = 0;
  } else {
    // Diminishing returns curve: starts linear, then curves down
    // At 10 defense: ~90% effectiveness
    // At 25 defense: ~75% effectiveness  
    // At 50 defense: ~60% effectiveness
    const diminishingFactor = 1 - (0.3 * Math.log(baseDefense + 1) / Math.log(50));
    effectiveBaseDefense = baseDefense * Math.max(0.4, diminishingFactor); // Minimum 40% effectiveness
    
    // Debug logging for defense calculations
    if (baseDefense > 20) { // Only log for high defense values
      console.log(`[DEFENSE] ${target.name || target.username}: Base=${baseDefense}, Status=${statusDefense}, Effective=${effectiveBaseDefense}, Factor=${diminishingFactor.toFixed(2)}`);
    }
  }
  
  // Status effect defense provides full linear benefit (no diminishing returns)
  const totalEffectiveDefense = effectiveBaseDefense + statusDefense;
  
  const defenseReduction = totalEffectiveDefense * 1.5; // Enhanced defense effect
  const hitChance = Math.max(20, Math.min(95, baseHitChance - defenseReduction + abilityModifier + attackerItemBonus));
  return Math.round(hitChance);
}

function getValidTargets(lobby, targetType, action = null, attacker = null) {
  const targets = [];

  switch (targetType) {
    case 'enemy':
      lobby.state.combat.enemies.forEach(enemy => {
        if (enemy.currentHealth > 0) {
          const hitChanceModifier = action?.hitChanceModifier || 0;
          const attackerItemBonus = getTotalItemEffectValue(attacker, 'hitChance') || 0;
          const hitChance = calculateHitChance(enemy, hitChanceModifier, attackerItemBonus);
          const curHp = enemy.currentHealth;
          const effectiveDefense = getEffectiveDefense(enemy);
          targets.push({
            id: enemy.id,
            name: enemy.name,
            type: 'enemy',
            defense: effectiveDefense,
            hitChance: hitChance,
            resistances: enemy.resistances || [],
            hp: curHp
          });
        }
      });
      break;

    case 'ally':
      Object.values(lobby.state.players).forEach(player => {
        if (player.health > 0) {
          targets.push({
            id: player.username,  // Use username as ID since players are keyed by username
            name: player.username,
            type: 'player',
            defense: player.defense
          });
        }
      });
      break;

    case 'dead_ally':
      Object.values(lobby.state.players).forEach(player => {
        if (player.health <= 0) {
          targets.push({
            id: player.username,  // Use username as ID since players are keyed by username
            name: player.username,
            type: 'player'
          });
        }
      });
      break;
  }

  return targets;
}

function checkAllActionsSelected(lobby, api) {
  // Check if all alive players have selected all their actions
  const alivePlayers = Object.values(lobby.state.players).filter(p => p.health > 0);
  const allSelected = alivePlayers.every(p => {
    const pending = lobby.state.combat.pendingActions[p.username];
    if (!pending) return false;
    
    // Check if player has selected all required actions
    return pending.actions.length === pending.totalActions && 
           pending.actions.every(action => action.targetSelected === true);
  });

  if (allSelected) {
    // All players ready, resolve combat round
    setTimeout(() => {
      resolveCombatRound(lobby, api);
    }, 1000);
  }
}

async function resolveCombatRound(lobby, api) {
  lobby.state.combat.roundPhase = 'resolving';

  const combatLog = [];

  // Process charged abilities first
  for (const player of Object.values(lobby.state.players)) {
    if (player.chargingAbility && player.health > 0) {
      const chargedAction = player.chargingAbility.action;
      const chargedTargetId = player.chargingAbility.targetId;
      
      const animationData = {
        actorId: player.id,
        actorType: 'player',
        actionType: chargedAction.type,
        actionName: chargedAction.name,
        actionId: chargedAction.id,
        action: chargedAction.name,
        targetId: chargedTargetId,
        animType: chargedAction.animType || 'spell',  // Animation type sent from server
        sound: chargedAction.sound || chargedAction.id,  // Use action.sound or default to action.id
        animTime: chargedAction.animTime || 1500,  // Animation duration in ms, default 1.5s
        sprite: chargedAction.sprite,  // Override sprite/texture name
        tint: chargedAction.tint  // Color tint for the effect
      };
      
      const repeats = Math.max(1, (chargedAction.repeats+1) || 1);
      for (let r = 0; r < repeats; r++) {
        const subAnim = { ...animationData };
        if (r > 0) subAnim.subRepeat = true;
        if (r > 0) subAnim.noUseDecrement = true;
        let result = executePlayerAction(lobby, api, player, chargedAction, chargedTargetId, subAnim);
        result.charged = true; // Mark as charged ability
        combatLog.push(result);
        
        // Add hit/crit/damage/heal info to animation data for visual feedback
        subAnim.hit = result.hit !== false;
        subAnim.crit = result.crit || false;
        subAnim.damage = result.damage || 0;
        subAnim.heal = result.heal || 0;
        
        api.sendToHost('animateAction', subAnim);
      }
      
      // Brief settle after full charged execution
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Clear charging state
      player.chargingAbility = null;
    }
  }

  // Process status effects (DoT, etc.) at start of round
  const statusLog = processStatusEffects(lobby, api);
  if (statusLog.length > 0) {
    combatLog.push(...statusLog);
    
    // Show status effect damage
    api.sendToHost('hostGameUpdate', {
      phase: 'combat',
      round: lobby.state.round,
      combatLog: [...statusLog],
      message: 'Status effects activating...',
      players: Object.values(lobby.state.players).map(p => ({
        id: p.id,
        username: p.username,
        class: p.class,
        health: p.health,
        maxHealth: p.maxHealth,
        defense: p.defense,
        statusEffects: getActiveStatusEffects(p)
      })),
      enemies: lobby.state.combat.enemies.map(e => ({
        id: e.id,
        name: e.name,
        health: e.currentHealth,
        maxHealth: e.maxHealth,
        defense: e.currentDefense,
        statusEffects: getActiveStatusEffects(e),
        sprite: e.sprite,
        scale: e.scale,
        tint: e.tint,
        summonedBy: e.summonedBy
      })),
      turnOrder: lobby.state.combat.turnOrder
    });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Notify that combat resolution is starting
  api.sendToHost('hostGameUpdate', {
    phase: 'combat',
    round: lobby.state.round,
    message: 'Resolving combat round...',
    players: Object.values(lobby.state.players).map(p => ({
      id: p.id,
      username: p.username,
      class: p.class,
      health: p.health,
      maxHealth: p.maxHealth,
      defense: p.defense
    })),
    enemies: lobby.state.combat.enemies.map(e => ({
      id: e.id,
      name: e.name,
      health: e.currentHealth,
      maxHealth: e.maxHealth,
      defense: e.currentDefense,
      sprite: e.sprite,
      scale: e.scale,
      tint: e.tint,
      summonedBy: e.summonedBy
    })),
    turnOrder: lobby.state.combat.turnOrder
  });

  // Process each turn in order WITH DELAYS
  for (let i = 0; i < lobby.state.combat.turnOrder.length; i++) {
    const turn = lobby.state.combat.turnOrder[i];
    let result;
    let animationData = null;

    if (turn.type === 'player') {
      const player = lobby.state.players[turn.username];
      const pending = lobby.state.combat.pendingActions[turn.username];

      if (player && player.health > 0 && pending) {
        // Check if player is stunned
        if (hasStatusEffect(player, 'stun')) {
          result = {
            actor: player.username,
            action: 'Stunned',
            results: [`${player.username} is stunned and cannot act!`],
            hit: false,
            crit: false,
            damage: 0,
            heal: 0
          };
          combatLog.push(result);
        } else {
          // Execute all queued actions for this player with delays
          for (let actionIndex = 0; actionIndex < pending.actions.length; actionIndex++) {
            const queuedAction = pending.actions[actionIndex];
            
            // Prepare animation data
            animationData = {
              actorId: player.id,
              targetId: queuedAction.target,
              action: queuedAction.action.name,
              actionId: queuedAction.action.id,
              animType: queuedAction.action.animType || 'support',
              sound: queuedAction.action.sound || queuedAction.action.id,
              animTime: queuedAction.action.animTime || 1500,
              sprite: queuedAction.action.sprite,
              tint: queuedAction.action.tint
            };
            
            const repeats = Math.max(1, (queuedAction.action.repeats+1) || 1);
            for (let r = 0; r < repeats; r++) {
              const subAnim = { ...animationData };
              if (r > 0) subAnim.subRepeat = true;
              if (r > 0) subAnim.noUseDecrement = true;
              result = executePlayerAction(lobby, api, player, queuedAction.action, queuedAction.target, subAnim);
              combatLog.push(result);
              
              // Add hit/crit/damage/heal info to animation data for visual feedback
              subAnim.hit = result.hit !== false;
              subAnim.crit = result.crit || false;
              subAnim.damage = result.damage || 0;
              subAnim.heal = result.heal || 0;
              
              // Send animation for this repeat
              api.sendToHost('animateAction', subAnim);
              
              // no await here: we cannot use await in this non-async map; rely on outer pacing
            }
            
            // Wait for animation to complete before next action (1.5 seconds)
            if (actionIndex < pending.actions.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
          }
        }
      }
    } else {
      // Enemy turn
      const enemy = lobby.state.combat.enemies.find(e => e.id === turn.id);
      if (enemy && enemy.currentHealth > 0) {
        // Skip enemy actions in puzzle encounters
        if (lobby.state.combat.encounterType === ENCOUNTER_TYPE_PUZZLE) {
          result = {
            actor: enemy.name,
            action: 'Wait',
            results: [`${enemy.name} does nothing.`],
            hit: false,
            crit: false,
            damage: 0,
            heal: 0
          };
          combatLog.push(result);
        } else {
          // Check if enemy is stunned
          if (hasStatusEffect(enemy, 'stun')) {
            result = {
              actor: enemy.name,
              action: 'Stunned',
              results: [`${enemy.name} is stunned and cannot act!`],
              hit: false,
              crit: false,
              damage: 0,
              heal: 0
            };
            combatLog.push(result);
          } else {
            animationData = {
              actorId: enemy.id,
              action: 'Attack',
              actionId: 'enemy_attack',
              animType: 'melee',  // Enemy basic attacks are melee
              sound: 'enemy_attack',  // Generic enemy attack sound
              animTime: 1500  // Default animation time
            };
            
            result = executeEnemyAction(lobby, enemy, animationData);
            combatLog.push(result);
          }
        }
      }
    }

    // Animation is now handled inside the multi-action loop for players
    // This section is only for single actions or enemy actions
    if (animationData && result && turn.type === 'enemy') {
      if (result.charging) {
        // Special charging animation - show casting sprite and charging indicator
        api.sendToHost('animateCharging', {
          actorId: animationData.actorId,
          action: animationData.action,
          actionId: animationData.actionId
        });
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        // Normal action animation with full visual feedback
        // Add hit/crit/damage/heal info to animation data
        animationData.hit = result.hit !== false;
        animationData.crit = result.crit || false;
        animationData.damage = result.damage || 0;
        animationData.heal = result.heal || 0;
        
        api.sendToHost('animateAction', animationData);
        
        // Wait a bit for animation to start
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Send update after EACH action with current combat log
    if (result) {
      // Update players with their current HP (NO COMBAT LOG)
      api.sendToAll('healthUpdate', {
        players: Object.values(lobby.state.players).map(p => ({
          id: p.id,
          username: p.username,
          health: p.health,
          maxHealth: p.maxHealth
        })),
        enemies: lobby.state.combat.enemies.map(e => ({
          id: e.id,
          name: e.name,
          health: e.currentHealth,
          maxHealth: e.maxHealth,
          sprite: e.sprite,
          scale: e.scale,
          tint: e.tint,
          summonedBy: e.summonedBy
        }))
      });

      // Update host with combat log
      api.sendToHost('hostGameUpdate', {
        phase: 'combat',
        round: lobby.state.round,
        combatLog: [...combatLog], // Send accumulated log
        message: `${result.actor}'s turn...`,
        players: Object.values(lobby.state.players).map(p => ({
          id: p.id,
          username: p.username,
          class: p.class,
          health: p.health,
          maxHealth: p.maxHealth,
          defense: p.defense,
          statusEffects: getActiveStatusEffects(p)
        })),
        enemies: lobby.state.combat.enemies.map(e => ({
          id: e.id,
          name: e.name,
          health: e.currentHealth,
          maxHealth: e.maxHealth,
          defense: e.currentDefense,
          statusEffects: getActiveStatusEffects(e),
          sprite: e.sprite,
          scale: e.scale,
          tint: e.tint
        })),
        turnOrder: lobby.state.combat.turnOrder
      });

      // Wait 2.5 seconds before next action
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
  }

  // Final update after all actions resolved
  api.sendToAll('combatRoundComplete', {
    players: Object.values(lobby.state.players).map(p => ({
      id: p.id,
      username: p.username,
      health: p.health,
      maxHealth: p.maxHealth
    })),
    enemies: lobby.state.combat.enemies.map(e => ({
      id: e.id,
      name: e.name,
      health: e.currentHealth,
      maxHealth: e.maxHealth,
      sprite: e.sprite,
      scale: e.scale,
      tint: e.tint
    }))
  });

  // Final host update
  api.sendToHost('hostGameUpdate', {
    phase: 'combat',
    round: lobby.state.round,
    combatLog: combatLog,
    message: 'Round complete!',
    players: Object.values(lobby.state.players).map(p => ({
      id: p.id,
      username: p.username,
      class: p.class,
      health: p.health,
      maxHealth: p.maxHealth,
      defense: p.defense,
      statusEffects: getActiveStatusEffects(p),
      chargingAbility: p.chargingAbility || null
    })),
    enemies: lobby.state.combat.enemies.map(e => ({
      id: e.id,
      name: e.name,
      health: e.currentHealth,
      maxHealth: e.maxHealth,
      defense: e.currentDefense,
      statusEffects: getActiveStatusEffects(e),
        resistances: e.resistances || [],
        specialAbilityQueued: e.specialAbilityQueued ? e.specialAbilityQueued.name : null,
        sprite: e.sprite,
        scale: e.scale,
        tint: e.tint,
        summonedBy: e.summonedBy
      })),
    turnOrder: lobby.state.combat.turnOrder
  });

  // Check win/loss conditions
  const playersAlive = Object.values(lobby.state.players).some(p => p.health > 0);
  const enemiesAlive = lobby.state.combat.enemies.some(e => e.currentHealth > 0);

  if (!enemiesAlive) {
    // Players won!
    setTimeout(() => {
      endCombat(lobby, api, 'victory');
    }, 3000);
  } else if (!playersAlive) {
    // Players lost
    setTimeout(() => {
      endCombat(lobby, api, 'defeat');
    }, 3000);
  } else {
    // Decrement status effect durations
    decrementStatusEffectDurations(lobby);
    
    // Notify players of their status effects
    Object.values(lobby.state.players).forEach(player => {
      if (player.health > 0) {
        const activeEffects = getActiveStatusEffects(player);
        api.sendToPlayer(player.id, 'statusEffectsUpdate', {
          statusEffects: activeEffects
        });
      }
    });
    
    // Check puzzle conditions before next round
    if (lobby.state.combat.encounterType === ENCOUNTER_TYPE_PUZZLE) {
      if (lobby.state.combat.puzzleSuccess) {
        // Puzzle solved - end encounter with victory
        console.log('[PUZZLE] Puzzle solved! Ending encounter.');
        setTimeout(() => {
          endCombat(lobby, api, 'victory');
        }, 3000);
        return;
      }
      
      if (lobby.state.combat.puzzleMaxRounds && lobby.state.round >= lobby.state.combat.puzzleMaxRounds) {
        // Max rounds reached - trigger fail condition
        console.log('[PUZZLE] Max rounds reached! Triggering fail condition.');
        const puzzleConfig = lobby.state.combat.puzzleConfig;
        if (puzzleConfig.onMaxRounds) {
          puzzleConfig.onMaxRounds(lobby, api);
        }
        /*setTimeout(() => {
          endCombat(lobby, api, 'defeat');
        }, 3000);*/
        return;
      }
    }
    
    // Next round
    lobby.state.round++;
    lobby.state.combat.pendingActions = {};
    lobby.state.combat.roundPhase = 'selecting';  // Reset to selecting phase
    
    setTimeout(() => {
      rollInitiative(lobby, api);
    }, 3000);
  }
}

// ============= HELPER: APPLY ATTACK TO SINGLE TARGET =============

function applyHealToTarget(action, attacker, target, attackerItemEffects, attackerStatusEffects, log, lobby) {
  // Get base heal amount
  let baseHeal = action.heal || 0;
  
  const damageType = action.damageType || 'magic';
  const targetStatusEffects = target.statusEffects || [];
  const { crit, damage: finalHeal } = resolveHeal(
    baseHeal, 
    attackerItemEffects, 
    damageType, 
    attackerStatusEffects,
    targetStatusEffects
  );

  if (action.applyStatus == true) {
    applyStatusEffect(target, action.statusEffect, action.duration, attacker.username || attacker.name || '', action.points, lobby);
  }
  
  // Apply healing (cap at maxHealth)
  const oldHealth = target.health || target.currentHealth;
  const maxHealth = target.maxHealth;
  const newHealth = Math.min(maxHealth, oldHealth + finalHeal);
  const actualHeal = newHealth - oldHealth;
  
  if (target.health !== undefined) {
    target.health = newHealth;
  } else {
    target.currentHealth = newHealth;
  }
  
  log.results.push(`${target.name || target.username} heals for ${actualHeal} HP!${crit ? ' ⚡ CRITICAL!' : ''}`);
  log.heal += actualHeal;
  
  return { crit, heal: actualHeal };
}

function applyAttackToTarget(action, attacker, target, attackerItemEffects, attackerStatusEffects, log, lobby) {
  // Check for Execute bonus (double damage if target below 50% HP)
  let baseDamage = action.damage || 0;
  


  
  const damageType = action.damageType || 'physical';
  const targetResistances = target.resistances || [];
  const hitChanceModifier = action.hitChanceModifier || 0;
  const targetStatusEffects = target.statusEffects || [];
  const { hit, crit, damage: finalDamage } = resolveAttack(
    baseDamage, 
    target, 
    attackerItemEffects, 
    damageType, 
    targetResistances, 
    hitChanceModifier, 
    attackerStatusEffects,
    targetStatusEffects
  );

    //Is a player

  
  if (!hit) {
    log.results.push(`${target.name || target.username} - MISS!`);
    return { hit: false, crit: false, damage: 0 };
  }
  
  // Apply damage with taunt reduction, defense reduction, and thorns reflection
  let actualDamage = applyDamageToTarget(target, finalDamage, log, attacker);

  if (action.executeBonus && target.currentHealth < target.maxHealth / 2) {
    actualDamage = Math.floor(actualDamage * 2);
    log.results.push(`EXECUTE! Damage doubled!`);
  }
  
  // Check for Full HP bonus (50% damage bonus if target at maximum HP)
  if (action.fullHpBonus && target.currentHealth >= target.maxHealth) {
    actualDamage = Math.floor(actualDamage * 1.5);
    log.results.push(`FIRST STRIKE! +50% damage bonus!`);
  }

  if(action.id == 'iron_fist' && hasStatusEffect(target, 'mark')) {
    actualDamage = Math.floor(actualDamage * 2);
    log.results.push(`MARKED! +100% damage bonus!`);
  }
  if(action.id == 'flurry_of_blows' && hasStatusEffect(target, 'mark')) {
    actualDamage = Math.floor(actualDamage * 2);
    log.results.push(`MARKED! +100% damage bonus!`);
  }
  if(action.id == 'riposte' && hasStatusEffect(target, 'slow')) {
    actualDamage = Math.floor(actualDamage * 2);
  }
  if(action.id == 'punch' && hasStatusEffect(target, 'mark')) {
    applyStatusEffect(target, 'stun', 1, attacker.username || attacker.name || '', 1, lobby);
  }
  if(action.id == 'kick' && hasStatusEffect(target, 'mark')) {
    actualDamage = Math.floor(actualDamage * 1.5);
    applyStatusEffect(target, 'slow', 3, attacker.username || attacker.name || '', 10, lobby);
  }

  log.results.push(`${target.name || target.username} takes ${actualDamage} damage!${crit ? ' ⚡ CRITICAL HIT!' : ''}`);
  log.damage += actualDamage;
  
  // Lifesteal
  if ((action.lifesteal || hasStatusEffect(attacker, 'lifesteal')) && actualDamage > 0) {
    const healAmount = actualDamage * 0.5;
    attacker.health = Math.min(attacker.maxHealth, attacker.health + healAmount);
    log.results.push(`${attacker.username} heals for ${healAmount} HP!`);
    log.heal = healAmount;
  }
  
  // Vampire effects (heal for percentage of damage dealt based on damage type)
  if (actualDamage > 0) {
    // Use the attackerItemEffects parameter instead of attacker.itemEffects
    const itemEffects = attackerItemEffects || attacker.itemEffects;
    
    if (itemEffects) {
      const damageType = action.damageType || 'physical';
      let vampireHeal = 0;
      
      if (damageType === 'physical' && itemEffects.physicalVamp) {
        vampireHeal = Math.floor(actualDamage * (itemEffects.physicalVamp / 100));
      } else if (damageType === 'magic' && itemEffects.magicVamp) {
        vampireHeal = Math.floor(actualDamage * (itemEffects.magicVamp / 100));
      }
      
      if (vampireHeal > 0) {
        const oldHealth = attacker.health;
        attacker.health = Math.min(attacker.maxHealth, attacker.health + vampireHeal);
        const actualHeal = attacker.health - oldHealth;
        if (actualHeal > 0) {
          log.results.push(`${attacker.username} heals for ${actualHeal} HP from ${damageType} vampirism!`);
          log.heal = (log.heal || 0) + actualHeal;
        }
      }
    }
  }
  
  // Apply status effects (only on living targets that were hit)
  if (action.applyStatus == true && hit == true) {
    applyStatusEffect(target, action.statusEffect, action.duration, attacker.username || attacker.name || '', action.points, lobby);
  }

  // Check if target died
  if (target.currentHealth === 0) {
    log.results.push(`${target.name || target.username} is defeated!`);
  }
  
  // Return actualDamage (after defense) instead of finalDamage (before defense)
  return { hit, crit, damage: actualDamage };
}

// ============= MAIN PLAYER ACTION EXECUTOR =============

function applyItemProcConditions(item, player, targets, finalDamage) {
  let proc = true;
  if(item.hasProcCondition) {
    if(item.procCondition == PROC_CONDITION_SELF_STATUS) {
      proc = hasStatusEffect(player, item.procConditionValue);
    }
    if(item.procCondition == PROC_CONDITION_TARGET_STATUS) {
      proc = false;
      targets.forEach(tar => {
        if(hasStatusEffect(tar, item.procConditionValue)){
          proc = true;
        }
      });
    }
    if(item.procCondition == PROC_CONDITION_ALL_TARGET_STATUS) {
      proc = targets.every(tar => hasStatusEffect(tar, item.procConditionValue));
    }
    if(item.procCondition == PROC_CONDITION_TARGET_HEALTH_LESS_THAN) {
      targets.forEach(tar => {
        if(tar.currentHealth <= tar.maxHealth * item.procConditionValue){
          proc = true;
        }
      });
    }
    if(item.procCondition == PROC_CONDITION_TARGET_HEALTH_GREATER_THAN) {
      targets.forEach(tar => {
        if(tar.currentHealth >= tar.maxHealth * item.procConditionValue){
          proc = true;
        }
      });
    }
    if(item.procCondition == PROC_CONDITION_TARGET_FULL_HP) {
      targets.forEach(tar => {
        if(tar.currentHealth+finalDamage >= tar.maxHealth){
          proc = true;
        }
      });
    }
    if(item.procCondition == PROC_CONDITION_SELF_HEALTH_LESS_THAN) {
      if(player) {
        proc = player.health <= player.maxHealth * item.procConditionValue;
      }
    }
    if(item.procCondition == PROC_CONDITION_SELF_HEALTH_GREATER_THAN) {
      if(player) {
        proc = player.health >= player.maxHealth * item.procConditionValue;
      }
    }
    if(item.procCondition == PROC_CONDITION_SELF_FULL_HP) {
      if(player) {
        proc = player.health+finalDamage >= player.maxHealth;
      }
    }
    if(item.procCondition == PROC_CONDITION_MORE_HEALTH) {
      if(player) {
        proc = player.health > targets.reduce((acc, tar) => acc + tar.currentHealth, 0);
      }
    }
  }
  return proc;
}

function executePlayerAction(lobby, api, player, action, targetId, animationData) {
  let didHit = true;
  
  // Handle consumable item usage
  if (action.isConsumable && action.consumableItemId) {
    const itemId = action.consumableItemId;
    const itemIndex = player.items.indexOf(itemId);
    if (itemIndex !== -1) {
      // Remove one instance of the item
      player.items.splice(itemIndex, 1);
      console.log(`[CONSUMABLE] Player ${player.username} consumed ${itemId}, ${player.items.filter(id => id === itemId).length} remaining`);
      
      // Recalculate item effects since inventory changed
      applyItemEffects(lobby, player.username);
      
      // Send updated inventory to player
      api.sendToPlayer(player.id, 'gameState', {
        phase: lobby.state.phase,
        playerData: {
          items: player.items,
          health: player.health,
          maxHealth: player.maxHealth,
          defense: player.defense,
          itemEffects: player.itemEffects,
          baseHealth: player.class ? CLASSES[player.class].baseHealth : 0,
          baseDefense: player.class ? CLASSES[player.class].baseDefense : 0
        }
      });
    } else {
      console.warn(`[CONSUMABLE] Player ${player.username} tried to use ${itemId} but doesn't have it!`);
    }
  }
  
  // Decrement ability uses if it has usesPerCombat
  if (action.usesPerCombat && player.abilityUses[action.id] > 0 && !(animationData && animationData.noUseDecrement)) {
    player.abilityUses[action.id]--;
    console.log(`[ABILITY USES] Player ${player.username} used ${action.name}, ${player.abilityUses[action.id]} uses remaining`);
  }
  
  // Check for puzzle action custom effects
  if (action.customEffect && lobby.state.combat.encounterType === ENCOUNTER_TYPE_PUZZLE) {
    return action.customEffect(lobby, api, player, targetId, []);
  }
  
  // Check if this is a charge-up ability
  if (action.chargeUp && !player.chargingAbility) {
    // Start charging
    player.chargingAbility = {
      action: action,
      targetId: targetId
    };
    
    const log = {
      actor: player.username,
      action: action.name,
      results: [`${player.username} begins charging ${action.name}!`],
      hit: false,
      crit: false,
      damage: 0,
      heal: 0,
      charging: true
    };
    
    return log;
  }
  
  const log = {
    actor: player.username,
    action: action.name,
    results: [],
    hit: false,  // Will be set to true if any attack hits
    crit: false,
    damage: 0,
    heal: 0
  };

  let finalHit = true;
  let finalDamage = 0;
  let finalCrit = false;

  // Handle self-damage abilities
  if (action.selfDamage) {
    player.health = Math.max(0, player.health - action.selfDamage);
    log.results.push(`${player.username} takes ${action.selfDamage} self-damage!`);
  }

  let targets = []
  if(action.target == 'self'){
    targets.push(player)
    if (animationData) {
      animationData.targetId = player.id;
    }
  }else{
    if(targetId) {
      if(action.target == 'enemy'){
        const enemyTarget = lobby.state.combat.enemies.find(e => e.id === targetId);
        if (enemyTarget) {
          targets.push(enemyTarget);
          if (animationData) {
            animationData.targetId = targetId; // Enemy ID
          }
        } else {
          // Target no longer exists, log and skip
          log.results.push(`${player.username}'s target is no longer available!`);
        }
      }
      if(action.target == 'ally'){
        const allyTarget = targetId ? lobby.state.players[targetId] : player;
        if (allyTarget) {
          targets.push(allyTarget);
          if (animationData) {
            animationData.targetId = allyTarget.id; // Socket ID for animation
          }
        } else {
          // Target no longer exists, log and skip
          log.results.push(`${player.username}'s target is no longer available!`);
        }
      }
    }
  }
  if (action.target === 'two_random_enemies') {
    const aliveEnemies = lobby.state.combat.enemies.filter(e => e.currentHealth > 0);
    if (aliveEnemies.length > 0) {
      targets.push(aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)]);
      if (animationData) {
        animationData.targetId = targets[0].id;
      }
      if (aliveEnemies.length > 1) {
        let secondTarget;
        do {
          secondTarget = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
        } while (secondTarget === targets[0] && aliveEnemies.length > 1);
        targets.push(secondTarget);
      }
    }
  } 
  if (action.target === 'random_enemy') {
    const aliveEnemies = lobby.state.combat.enemies.filter(e => e.currentHealth > 0);
    if (aliveEnemies.length > 0) {
      targets.push(aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)]);
      if (animationData) {
        animationData.targetId = targets[0].id;
      }
    }
  } 
  if (action.target === 'all_enemies') {
    // All enemies
    targets = lobby.state.combat.enemies.filter(e => e.currentHealth > 0);
    if (animationData) {
      animationData.targetId = 'all_enemies';
    }
  }
  if (action.target === 'all_allies') {
    // All allies
    targets = Object.values(lobby.state.players).filter(p => p.health > 0);
    if (animationData) {
      animationData.targetId = 'all_players';
    }
  }
  
  if (action.type === 'attack') {    
    // Apply attack to all targets using helper function
    targets.forEach(target => {
      const result = applyAttackToTarget(action, player, target, player.itemEffects, player.statusEffects, log, lobby);
      // Track overall hit/crit/damage for animation
      finalHit = result.hit;
      finalDamage = result.damage;
      finalCrit = result.crit;
      if (result.hit) {
        log.hit = true;
        if (result.crit) log.crit = true;
      }
    });
  }
  if (action.type === 'heal') {
    targets.forEach(target => {
      if(target.health){
        if(target.health > 0){
          log.hit = true;  // Heal always succeeds
          const heal = action.heal || 0;
          const result = applyHealToTarget(action, player, target, player.itemEffects, player.statusEffects, log, lobby);
          finalDamage = result.heal;
          finalCrit = result.crit;
        }
      }
    });
  }

  if(action.type === 'buff' || action.type === 'debuff' || action.type === 'support'){
    targets.forEach(target => {
      if(target){
        if((target.health || target.currentHealth)){
          if((target.health || target.currentHealth) > 0){
            log.hit = true;  // Buff/debuff/support always succeeds
            applyStatusEffect(target, action.statusEffect, action.duration, player.username, action.points, lobby);
          }
        }
      }
    });
  }

  
  if (action.type === 'buff') {
    // Buff action (always succeeds)
    if (action.target === 'self') {
      const defense = action.defense || 0;
      if (defense > 0 && !hasStatusEffect(player, 'defense_buff')) {
        applyStatusEffect(player, 'defense_buff', 2, player.username, 0, lobby);
        log.results.push(`${player.username} gains ${defense} defense!`);
      }
      
      // Apply Rage buff (Barbarian)
      if (action.ragebuff && !hasStatusEffect(player, 'rage')) {
        applyStatusEffect(player, 'rage', 2, player.username, 0, lobby);
        log.results.push(`${player.username} enters a RAGE!`);
      }
      
      // Set targetId to self for animation
      if (animationData) {
        animationData.targetId = player.id;
      }
    } else if (action.target === 'ally') {
      // Single ally target (targetId is now username)
      const target = lobby.state.players[targetId];
      if (target && target.health > 0) {
        // Apply defense buff
        if (action.defense && !hasStatusEffect(target, 'defense_buff')) {
          applyStatusEffect(target, 'defense_buff', 2, player.username, 0, lobby);
          const defense = action.defense || 0;
          log.results.push(`${target.username} gains ${defense} defense!`);
        }
        
        // Apply physical damage buff
        if (action.physicalBuff && !hasStatusEffect(target, 'physical_buff')) {
          applyStatusEffect(target, 'physical_buff', 3, player.username, 0, lobby);
          log.results.push(`${target.username} gains physical damage boost!`);
        }
        
        // Apply magic damage buff
        if (action.magicBuff && !hasStatusEffect(target, 'magic_buff')) {
          applyStatusEffect(target, 'magic_buff', 3, player.username, 0, lobby);
          log.results.push(`${target.username} gains magic damage boost!`);
        }
        
        if (animationData) {
          animationData.targetId = target.id;
        }
      }
    } else if (action.target === 'all_allies') {
      const defense = action.defense || 0;
      if (defense > 0) {
        Object.values(lobby.state.players).forEach(p => {
          if (p.health > 0 && !hasStatusEffect(p, 'defense_buff')) {
            applyStatusEffect(p, 'defense_buff', 2, player.username, 0, lobby);
          }
        });
        log.results.push(`All allies gain ${defense} defense!`);
      }
      
      if (action.physicalBuff) {
        Object.values(lobby.state.players).forEach(ally => {
          if (ally.health > 0 && !hasStatusEffect(ally, 'physical_buff')) {
            applyStatusEffect(ally, 'physical_buff', 3, player.username, 0, lobby);
          }
        });
        log.results.push(`All allies gain physical damage boost!`);
      }
      
      if (action.magicBuff) {
        Object.values(lobby.state.players).forEach(ally => {
          if (ally.health > 0 && !hasStatusEffect(ally, 'magic_buff')) {
            applyStatusEffect(ally, 'magic_buff', 3, player.username, 0, lobby);
          }
        });
        log.results.push(`All allies gain magic damage boost!`);
      }
      
      if (animationData) {
        animationData.targetId = 'all_players';
      }
    }
  } else if (action.type === 'debuff') {
    if (action.target === 'enemy' && targetId) {
      const enemy = lobby.state.combat.enemies.find(e => e.id === targetId);
      if (enemy && enemy.currentHealth > 0) {
        if (action.vulnerable && !hasStatusEffect(enemy, 'vulnerable')) {
          applyStatusEffect(enemy, 'vulnerable', 3, player.username, 0, lobby);
          log.results.push(`${enemy.name} is marked as VULNERABLE!`);
          log.results.push(`${enemy.name} will take 50% increased damage for 3 turns!`);
        }
        
        if (animationData) {
          animationData.targetId = enemy.id;
        }
      }
    }
  }

  const items = getPlayerItems(player);
  items.forEach((item) => {
    if(item.hasProc && action.id != item.procAction.id){
      let chance = item.procChance;
      let proc = false;
      if(chance < 0 || chance == 100)chance=101;
      if(Math.random() * 100 < chance){
        if(item.procTrigger == PROC_MISS_ATTACK) {
          proc = finalHit == false && action.type == 'attack';
        }
        if(item.procTrigger === PROC_HIT_ATTACK){
          proc = finalHit && action.type == 'attack' && finalDamage > 0;
        }
        if(item.procTrigger === PROC_HIT_HEAL){
          proc = finalHit && action.type == 'heal' && finalDamage > 0;
        }
        if(item.procTrigger === PROC_CRIT_ATTACK){
          proc = finalHit &&finalCrit && action.type == 'attack' && finalDamage > 0;
        }
        if(item.procTrigger === PROC_EXECUTE_ATTACK){
          if(finalHit && action.type == 'attack' && finalDamage > 0){
            targets.forEach(tar => {
              if(tar.currentHealth <= tar.maxHealth * 0.5){
                proc = true;
              }
            });
          }
        }
        if(item.procType === PROC_ANY) {
          proc = true;
        }
        if(item.procType === PROC_STUN) {
          proc = action.statusEffect == 'stun';
        }
        if(item.procType === PROC_AOE_ENEMY) {
          proc = action.target == 'all_enemies';
        }
        if(item.procType === PROC_AOE_ALLY) {
          proc = action.target == 'all_allies';
        }
        if(item.procType === PROC_KILL_ENEMY) {
          targets.forEach(tar => {
            if(tar.currentHealth && tar.currentHealth <= 0){
              proc = true;
            }
          });
        }
        if(item.procType === PROC_AOE_ANY) {
          proc = action.target == 'all_enemies' || action.target == 'all_allies';
        }
      }
      if(proc) {
        proc = applyItemProcConditions(item, player, targets);
      }
      if(proc){
        let procAction = {...item.procAction};
        const procAnimationData = {
          actorId: player.id,
          targetId: targetId,
          action: procAction.name,
          actionId: procAction.id,
          animType: procAction.animType || 'support',  // Animation type sent from server
          sound: procAction.sound || procAction.action.id,  // Use action.sound or default to action.id
          animTime: procAction.animTime || 1500,  // Animation duration in ms, default 1.5s
          sprite: procAction.sprite,  // Override sprite/texture name
          tint: procAction.tint  // Color tint for the effect
        };

        if(item.procPointsCarry) {
          procAction.points = finalDamage * item.procPointsCarry;
        }
        if(item.procDamageOrHealCarry) {
          procAction.damage = finalDamage * item.procPointsCarry;
          procAction.heal = finalDamage * item.procPointsCarry;
        }
        
        result = executePlayerAction(lobby, api, player, procAction, targetId, procAnimationData);
      }
    }
  });

  if(action.cleanseEffect && targets) {
    targets.forEach(target => {
      const removedEffects = [];
      
      // Filter out negative status effects
      target.statusEffects = target.statusEffects.filter(effect => {
        const effectDef = STATUS_EFFECTS[effect.effectId];
        if (effectDef && effectDef.negative === true) {
          removedEffects.push(effectDef.name || effect.effectId);
        }
      });
      
      if (removedEffects.length > 0) {
        log.results.push(`Cleansed ${target.username}: removed ${removedEffects.join(', ')}`);
        log.hit = true;
      }
    });
    
    if (log.hit) {
      log.results.unshift(`Cleanse removes all negative status effects from all allies!`);
    }
  }

  if(action.dispelEffect && targets) {
    targets.forEach(target => {
      const removedEffects = [];
      
      // Filter out negative status effects
      target.statusEffects = target.statusEffects.filter(effect => {
        const effectDef = STATUS_EFFECTS[effect.effectId];
        if (effectDef && effectDef.negative === false) {
          removedEffects.push(effectDef.name || effect.effectId);
        }
      });
      
      if (removedEffects.length > 0) {
        log.hit = true;
      }
    });
  }

  if(action.failDamage && action.failDamage > 0 && !finalHit){
    player.health = player.health - (player.maxHealth * (action.failDamage / 100));
  }

  return log;
}

function executeEnemySpecialAbility(lobby, enemy, ability, animationData) {
  const log = {
    actor: enemy.name,
    action: ability.name,
    results: [],
    hit: false,  // Will be set to true if any attack hits
    crit: false,
    damage: 0,
    heal: 0,
    special: true
  };
  
  // Add animation time, sound, and type for special ability
  animationData.animTime = ability.animTime || 1500;
  animationData.sound = ability.sound || ability.id;
  animationData.action = ability.name;
  animationData.actionId = ability.id;
  animationData.animType = ability.animType || 'spell';
  animationData.sprite = ability.sprite;
  animationData.tint = ability.tint;
  
  // Build targets array based on ability target type
  let targets = [];
  
  if (ability.type === 'summon') {
    // Handle summon separately (doesn't use targets array)
    return handleEnemySummon(lobby, enemy, ability, animationData, log);
  }
  
  // Build targets based on ability target type
  const alivePlayers = Object.values(lobby.state.players).filter(p => p.health > 0);
  const aliveEnemies = lobby.state.combat.enemies.filter(e => e.currentHealth > 0);
  
  if (ability.target === 'all_players') {
    targets = alivePlayers;
    animationData.targetId = 'all_players';
  } else if (ability.target === 'single_player') {
    if (alivePlayers.length > 0) {
      const target = getEnemyTarget(alivePlayers);
      if (target) {
        targets = [target];
        animationData.targetId = target.id;
      }
    }
  } else if (ability.target === 'self') {
    targets = [enemy];
    animationData.targetId = enemy.id;
  } else if (ability.target === 'random_friend') {
    const friendEnemies = aliveEnemies.filter(e => e.id !== enemy.id);
    if (friendEnemies.length > 0) {
      const target = friendEnemies[Math.floor(Math.random() * friendEnemies.length)];
      targets = [target];
      animationData.targetId = target.id;
    }
  } else if (ability.target === 'all_friends') {
    targets = aliveEnemies;
    animationData.targetId = 'all_enemies';
  }
  
  // Process ability based on type
  if (ability.type === 'attack' && ability.damage) {
    // Attack-type abilities
    targets.forEach(target => {
      const { hit, crit, damage: finalDamage } = resolveAttack(
        ability.damage, 
        target, 
        {}, 
        ability.damageType || 'physical', 
        [], 
        0, 
        enemy.statusEffects, 
        target.statusEffects
      );
      
      if (hit) {
        log.hit = true;
        if (crit) log.crit = true;
        const actualDamage = dealEnemyDamage(enemy, target, finalDamage, log, enemy);
        log.results.push(`${target.username || target.name} takes ${actualDamage} damage!${crit ? ' ⚡ CRITICAL!' : ''}`);
        log.damage += actualDamage;
        
        // Apply status effects if ability has them
        if (ability.applyStatus && ability.statusEffect) {
          applyStatusEffect(target, ability.statusEffect, ability.duration || 2, enemy.name, ability.points, lobby);
        }
      } else {
        log.results.push(`${target.username || target.name} dodged!`);
      }
    });
  } else if (ability.type === 'heal' && ability.heal) {
    // Heal-type abilities
    log.hit = true;
    targets.forEach(target => {
      dealEnemyHealing(enemy, target, ability.heal, log);
    });
  } else if (ability.type === 'buff' || ability.type === 'support') {
    // Buff/support abilities (always succeed)
    log.hit = true;
    
    targets.forEach(target => {
      // Apply status effect if defined
      if (ability.applyStatus && ability.statusEffect) {
        applyStatusEffect(target, ability.statusEffect, ability.duration || 2, enemy.name, ability.points, lobby);
      }
    });
  }
  
  return log;
}

// Helper function to handle enemy summon abilities
function handleEnemySummon(lobby, enemy, ability, animationData, log) {
  const summonedEnemyTemplate = ENEMIES.find(e => e.id === ability.summonEnemyId);
  
  if (summonedEnemyTemplate) {
    // Generate unique ID for summoned enemy
    const summonedEnemyIndex = lobby.state.combat.enemies.length;
    const encounterNumber = lobby.state.encounterNumber || 1;
    
    const summonedEnemy = {
      ...summonedEnemyTemplate,
      id: `enemy_${encounterNumber}_${summonedEnemyIndex}_summoned`,
      maxHealth: summonedEnemyTemplate.health,
      currentHealth: summonedEnemyTemplate.health,
      currentDefense: summonedEnemyTemplate.defense,
      damageMultiplier: enemy.damageMultiplier || 1,  // Inherit scaling from summoner
      statusEffects: [],
      specialAbilityQueued: null,
      summoned: true,
      summonedBy: enemy.id,  // Track who summoned this enemy
      sprite: summonedEnemyTemplate.sprite,
      scale: summonedEnemyTemplate.scale,
      tint: summonedEnemyTemplate.tint
    };
    
    // Add to combat enemies
    lobby.state.combat.enemies.push(summonedEnemy);
    
    log.hit = true;
    log.results.push(`${enemy.name} summons a ${summonedEnemy.name}!`);
    console.log(`[SUMMON] ${enemy.name} summoned ${summonedEnemy.name} (ID: ${summonedEnemy.id})`);
    
    // Set animation target to indicate summoning
    animationData.targetId = 'summon';
    animationData.summonedEnemy = {
      id: summonedEnemy.id,
      name: summonedEnemy.name,
      health: summonedEnemy.currentHealth,
      maxHealth: summonedEnemy.maxHealth
    };
  } else {
    log.hit = false;
    log.results.push(`${enemy.name} failed to summon!`);
    console.log(`[SUMMON] ERROR: Enemy template not found: ${ability.summonEnemyId}`);
  }
  
  return log;
}

// Resolve attack with hit/miss and critical strike mechanics
// Returns: { hit: boolean, crit: boolean, damage: number }
function resolveAttack(baseDamage, target, attackerItemEffects = {}, damageType = 'physical', targetResistances = [], hitChanceModifier = 0, attackerStatusEffects = [], targetStatusEffects = []) {
  // Calculate hit chance with ability modifier and item bonus
  const attackerItemBonus = attackerItemEffects.hitChance || 0;
  const hitChance = calculateHitChance(target, hitChanceModifier, attackerItemBonus);
  const hitRoll = Math.random() * 100;

  let statusCritBonus = 0;
  
  // Check for Rage status effect
  if (attackerStatusEffects) {
    attackerStatusEffects.forEach(effect => {
      if (effect.effectId === 'rage') {
        statusCritBonus += effect.points;
      }
      if (effect.effectId === 'hitChanceBonus') {
        hitChance += effect.points;
      }
    });
  }
  
  if (hitRoll > hitChance) {
    // Miss!
    return { hit: false, crit: false, damage: 0 };
  }
  
  // Hit! Check for critical strike (base 5% + item bonuses + status effects)
  const baseCritChance = 5;
  const itemCritBonus = attackerItemEffects.critChance || 0;
 
  
  const totalCritChance = baseCritChance + itemCritBonus + statusCritBonus;
  
  const critRoll = Math.random() * 100;
  const isCrit = critRoll < totalCritChance;
  
  // Add item damage bonuses based on damage type
  let totalDamage = baseDamage;
  if (damageType === 'physical' && attackerItemEffects.physicalDamage) {
    totalDamage += (totalDamage || 0) * (attackerItemEffects.physicalDamage / 100);
  } else if (damageType === 'magic' && attackerItemEffects.magicDamage) {
    totalDamage += (totalDamage || 0) * (attackerItemEffects.magicDamage / 100);
  }
  
  // Apply status effect damage buffs
  if (attackerStatusEffects) {
    attackerStatusEffects.forEach(effect => {
      const statusEffect = STATUS_EFFECTS[effect.effectId];
      if (statusEffect && effect.points) {
        if (damageType === 'physical' && effect.effectId == 'physical_buff') {
          totalDamage += (totalDamage || 0) * (effect.points / 100);
        }
        if (damageType === 'magic' && effect.effectId == 'magic_buff') {
          totalDamage += (totalDamage || 0) * (effect.points / 100);
        }
      }
    });
  }
  
  // Apply curse damage reduction (attacker is cursed)
  if (attackerStatusEffects) {
    attackerStatusEffects.forEach(effect => {
      const statusEffect = STATUS_EFFECTS[effect.effectId];
      if (statusEffect && statusEffect.damageReduction) {
        // effect.points is a percentage (e.g., 25 means 25%)
        const reductionPct = Math.max(0, Math.min(100, effect.points));
        totalDamage = Math.floor(totalDamage * (1 - reductionPct / 100));
      }
    });
  }
  
  // Apply damage resistance (half damage if resistant)
  if (targetResistances.includes(damageType)) {
    const originalDamage = totalDamage;
    totalDamage = Math.floor(totalDamage / 2);
    console.log(`Resistance applied: ${damageType} damage reduced from ${originalDamage} to ${totalDamage}`);
  }
  
  // Apply vulnerability amplification (target takes increased damage)
  if (targetStatusEffects) {
    targetStatusEffects.forEach(effect => {
      const statusEffect = STATUS_EFFECTS[effect.effectId];
      if (statusEffect && statusEffect.damageAmplification && effect.points) {
        const originalDamage = totalDamage;
        // Use the effect points as the percentage increase (e.g., 50 points = 50% increase)
        totalDamage = Math.floor(totalDamage * (1 + effect.points / 100));
        console.log(`Vulnerability applied: damage amplified from ${originalDamage} to ${totalDamage} (${effect.points}% increase)`);
      }
    });
  }
  
  // Apply status damage bonus (attacker deals extra damage to targets with specific status effects)
  if (attackerItemEffects.statusDamageBonus && targetStatusEffects) {
    targetStatusEffects.forEach(effect => {
      const bonus = attackerItemEffects.statusDamageBonus[effect.effectId];
      if (bonus) {
        const originalDamage = totalDamage;
        totalDamage = Math.floor(totalDamage * (1 + bonus / 100));
        console.log(`Status damage bonus applied: +${bonus}% damage vs ${effect.effectId} - damage increased from ${originalDamage} to ${totalDamage}`);
      }
    });
  }
  
  // Add 20% damage variance
  const variance = 0.20;
  const minDamage = totalDamage * (1 - variance);
  const maxDamage = totalDamage * (1 + variance);
  const variedDamage = Math.floor(Math.random() * (maxDamage - minDamage + 1) + minDamage);
  
  const finalDamage = isCrit ? variedDamage * 2 : variedDamage;
  
  return { hit: true, crit: isCrit, damage: finalDamage };
}

function resolveHeal(baseDamage, casterItemEffects = {}, damageType = 'magic', casterStatusEffects = [], targetStatusEffects = []) {
  const baseCritChance = 5;
  const itemCritBonus = casterItemEffects.critChance || 0;
  let statusCritBonus = 0;
  
  // Check for Rage status effect
  if (casterStatusEffects) {
    casterStatusEffects.forEach(effect => {
      if (effect.effectId === 'rage') {
        statusCritBonus += effect.points;
      }
    });
  }  
  
  const totalCritChance = baseCritChance + itemCritBonus + statusCritBonus;
  
  const critRoll = Math.random() * 100;
  const isCrit = critRoll < totalCritChance;
  
  // Add item healing bonuses
  let totalDamage = baseDamage;
  if (casterItemEffects.healingBonus) {
    totalDamage += (totalDamage || 0) * (casterItemEffects.healingBonus / 100);
  }
  
  // Apply status effect damage buffs
  if (casterStatusEffects) {
    casterStatusEffects.forEach(effect => {
      if(effect && effect.effectId === 'healBonus'){
        totalDamage += (totalDamage || 0) * (1 + effect.points / 100);
      }
    });
  }
  
  // Apply curse damage reduction (attacker is cursed)
  if (targetStatusEffects) {
    targetStatusEffects.forEach(effect => {
      if (effect && effect.effectId === 'healReduction') {
        const reductionPct = Math.max(0, Math.min(100, effect.points || 0));
        totalDamage = Math.floor((totalDamage || 0) * (1 - reductionPct / 100));
      }
    });
  }
  
  // Add 20% damage variance
  const variance = 0.20;
  const minDamage = totalDamage * (1 - variance);
  const maxDamage = totalDamage * (1 + variance);
  const variedDamage = Math.floor(Math.random() * (maxDamage - minDamage + 1) + minDamage);
  
  const finalDamage = isCrit ? variedDamage * 2 : variedDamage;
  
  return { crit: isCrit, damage: finalDamage };
}

function executeEnemyAction(lobby, enemy, animationData) {
  // Check if enemy is using special ability
  if (enemy.specialAbilityQueued) {
    return executeEnemySpecialAbility(lobby, enemy, enemy.specialAbilityQueued, animationData);
  }

  const log = {
    actor: enemy.name,
    action: 'Attack',
    results: [],
    hit: true,
    crit: false,
    damage: 0
  };

  // Enemy attacks a random player
  const alivePlayers = Object.values(lobby.state.players).filter(p => p.health > 0);
  
  if (alivePlayers.length > 0) {
    const target = getEnemyTarget(alivePlayers);
    const { hit, crit, damage: finalDamage } = resolveAttack(enemy.damage, target, {}, 'physical', [], 0, enemy.statusEffects, target.statusEffects);
    
    // Apply damage multiplier for display purposes (actual damage application also applies it)
    const scaledDamage = Math.floor(finalDamage * (enemy.damageMultiplier || 1));
    
    // Store for animation
    log.hit = hit;
    log.crit = crit;
    
    if (animationData) {
      animationData.targetId = target.id;
    }
    
    if (!hit) {
      log.results.push(`${target.username} - MISS!`);
      log.damage = 0;
    } else {
      const actualDamage = dealEnemyDamage(enemy, target, finalDamage, log, enemy);
      log.damage = actualDamage; // Use actualDamage (after defense) for floating text
      log.results.push(`${target.username} takes ${actualDamage} damage!${crit ? ' ⚡ CRITICAL HIT!' : ''}`);

      const items = getPlayerItems(target);
      if(items)
      items.forEach((item) => {
        if(item.hasProc){
          let chance = item.procChance;
          let proc = false;
          if(chance < 0 || chance == 100)chance=101;
          if(Math.random() * 100 < chance){
            if(item.procTrigger == PROC_TAKE_ATTACK) {
              proc = hit == true;
            }
            if(item.procTrigger == PROC_DODGE_ATTACK) {
              proc = hit == false;
            }
          }
          if(proc) {
            proc = applyItemProcConditions(item, target, [enemy]);
          }
          if(proc){
            let procAction = {...item.procAction};
            const procAnimationData = {
              actorId: target.id,
              targetId: enemy.id,
              action: procAction.name,
              actionId: procAction.id,
              animType: procAction.animType || 'support',  // Animation type sent from server
              sound: procAction.sound || procAction.action.id,  // Use action.sound or default to action.id
              animTime: procAction.animTime || 1500,  // Animation duration in ms, default 1.5s
              sprite: procAction.sprite,  // Override sprite/texture name
              tint: procAction.tint  // Color tint for the effect
            };
    
            if(item.procPointsCarry) {
              procAction.points = finalDamage * item.procPointsCarry;
            }
            if(item.procDamageOrHealCarry) {
              procAction.damage = finalDamage * item.procPointsCarry;
              procAction.heal = finalDamage * item.procPointsCarry;
            }
            
            result = executePlayerAction(lobby, api, target, procAction, enemy.id, procAnimationData);
          }
        }
      });
      
      if (target.health === 0) {
        log.results.push(`${target.username} has been defeated!`);
      }
    }
  }

  return log;
}

function endCombat(lobby, api, result) {
  if (result === 'victory') {
    // Show victory banner on host only (not sending combatEnded to all)
    api.sendToHost('showVictoryBanner', {
      message: 'Victory! The enemies have been defeated!'
    });

    // Wait 3 seconds before showing loot
    setTimeout(() => {
      // Generate loot for victory
      const encounterNumber = lobby.state.encounterNumber || 0;
      const lootModifier = lobby.state.currentLootModifier || 'Normal';
      const loot = generateLoot('medium', lobby, encounterNumber, lootModifier);
      
      // Show loot screen on host
      api.sendToHost('showLootScreen', {
        items: loot,
        currentItemIndex: 0,
        totalItems: loot.length
      });
      
      // Initialize loot state
      lobby.state.loot = {
        items: loot,
        currentItemIndex: 0,
        playerActions: {},
        rolls: {}
      };
      
      // Show first item to all players
      if (loot.length > 0) {
        const firstItemId = loot[0];
        const firstItem = ITEMS[firstItemId];
        
        if (!firstItem) {
          console.error(`[LOOT] ERROR: Item with ID ${firstItemId} not found in ITEMS database!`);
          console.log(`[LOOT] Available ITEMS:`, Object.keys(ITEMS));
          return;
        }
        
        console.log(`[LOOT] Showing first item to players: ${firstItem.name}`);
        
        // Send to all players
        api.sendToAll('lootItem', {
          itemId: firstItemId,
          icon: firstItem.icon,
          iconFallback: firstItem.iconFallback,
          name: firstItem.name,
          description: firstItem.description,
          rarity: firstItem.rarity
        });
        
        // Also send to host
        api.sendToHost('lootItem', {
          itemId: firstItemId,
          icon: firstItem.icon,
          iconFallback: firstItem.iconFallback,
          name: firstItem.name,
          description: firstItem.description,
          rarity: firstItem.rarity
        });
      }
    }, 3000);
  } else {
    api.sendToAll('combatEnded', {
      result: 'defeat',
      message: 'Defeat! The party has been defeated...'
    });

    api.sendToHost('hostGameUpdate', {
      phase: 'defeat',
      message: 'Defeat! The party has been defeated...'
    });
    
    // End the game only on defeat
    setTimeout(() => {
      api.sendToAll('gameEnded', {
        result: result
      });
    }, 5000);
  }
}