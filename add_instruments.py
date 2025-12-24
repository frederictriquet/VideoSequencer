#!/usr/bin/env python3
import json

# Charger le fichier de base
with open('composition_rythmique_break.json', 'r') as f:
    composition = json.load(f)

clips = composition['clips']
next_id = len(clips) + 1

print(f"Base: {len(clips)} clips")

# Ajouter les basses (P5, P6) - Entrent au beat 16, présentes jusqu'au break, reprennent après
print("Ajout des basses...")
for beat in range(16, 48, 4):
    clips.append({"id": f"bass1-{beat}", "instrumentId": "inst-basse-1", "startTime": beat, "duration": 4, "trackIndex": 4})
for beat in range(18, 48, 4):
    clips.append({"id": f"bass2-{beat}", "instrumentId": "inst-basse-2", "startTime": beat, "duration": 3, "trackIndex": 5})

for beat in range(64, 112, 4):
    clips.append({"id": f"bass1-drop-{beat}", "instrumentId": "inst-basse-1", "startTime": beat, "duration": 4, "trackIndex": 4})
for beat in range(66, 112, 4):
    clips.append({"id": f"bass2-drop-{beat}", "instrumentId": "inst-basse-2", "startTime": beat, "duration": 3, "trackIndex": 5})

print(f"  Basses: {len(clips) - next_id + 1} nouveaux clips")
next_id = len(clips) + 1

# Ajouter les pads (P7, P8) - Ambiance harmonique + pendant break
print("Ajout des pads...")
for beat in range(16, 48, 16):
    clips.append({"id": f"pad1-{beat}", "instrumentId": "inst-pad-1", "startTime": beat, "duration": 16, "trackIndex": 6})
for beat in range(24, 48, 16):
    clips.append({"id": f"pad2-{beat}", "instrumentId": "inst-pad-2", "startTime": beat, "duration": 16, "trackIndex": 7})

# Pads pendant le break pour maintenir l'ambiance
clips.append({"id": "pad1-break", "instrumentId": "inst-pad-1", "startTime": 48, "duration": 16, "trackIndex": 6})
clips.append({"id": "pad2-break", "instrumentId": "inst-pad-2", "startTime": 56, "duration": 8, "trackIndex": 7})

for beat in range(64, 112, 16):
    clips.append({"id": f"pad1-drop-{beat}", "instrumentId": "inst-pad-1", "startTime": beat, "duration": 16, "trackIndex": 6})
for beat in range(72, 112, 16):
    clips.append({"id": f"pad2-drop-{beat}", "instrumentId": "inst-pad-2", "startTime": beat, "duration": 16, "trackIndex": 7})

print(f"  Pads: {len(clips) - next_id + 1} nouveaux clips")
next_id = len(clips) + 1

# Ajouter les mélodies (P9, P10, P11, P12) - Actives après le break
print("Ajout des mélodies...")
for beat in range(64, 112, 4):
    clips.append({"id": f"mel-{beat}", "instrumentId": "inst-melodie-principale", "startTime": beat, "duration": 3, "trackIndex": 8})
for beat in range(65, 112, 4):
    clips.append({"id": f"cmel-{beat}", "instrumentId": "inst-contre-melodie", "startTime": beat, "duration": 3, "trackIndex": 9})

for beat in range(64, 112, 2):
    clips.append({"id": f"arp-{beat}", "instrumentId": "inst-arpege", "startTime": beat, "duration": 2, "trackIndex": 10})

for beat in range(65, 112, 4):
    clips.append({"id": f"riff-{beat}", "instrumentId": "inst-riff", "startTime": beat, "duration": 2, "trackIndex": 11})

print(f"  Mélodies: {len(clips) - next_id + 1} nouveaux clips")
next_id = len(clips) + 1

# Ajouter souffle (P13) - Build-up avant break, PENDANT le break, et dans le drop
print("Ajout du souffle...")
for beat in range(40, 48):
    clips.append({"id": f"souffle-{beat}", "instrumentId": "inst-souffle", "startTime": beat, "duration": 1, "trackIndex": 12})

# Pendant le break - créer de la tension
for beat in range(56, 64, 2):
    clips.append({"id": f"souffle-break-{beat}", "instrumentId": "inst-souffle", "startTime": beat, "duration": 1, "trackIndex": 12})

for beat in range(96, 112, 2):
    clips.append({"id": f"souffle-drop-{beat}", "instrumentId": "inst-souffle", "startTime": beat, "duration": 1, "trackIndex": 12})

print(f"  Souffle: {len(clips) - next_id + 1} nouveaux clips")
next_id = len(clips) + 1

# Ajouter plus de claps (P14) - Tout au long
print("Ajout de claps supplémentaires...")
for beat in range(28, 48, 8):
    clips.append({"id": f"clap-intro-{beat}", "instrumentId": "inst-clap", "startTime": beat, "duration": 1, "trackIndex": 13})

for beat in range(76, 112, 8):
    clips.append({"id": f"clap-drop-{beat}", "instrumentId": "inst-clap", "startTime": beat, "duration": 1, "trackIndex": 13})

print(f"  Claps: {len(clips) - next_id + 1} nouveaux clips")
next_id = len(clips) + 1

# Ajouter plus de voix lead (P15) - Moments clés + pendant break
print("Ajout de voix lead supplémentaires...")
clips.append({"id": "voix-intro", "instrumentId": "inst-voix-lead", "startTime": 32, "duration": 2, "trackIndex": 14})

# Pendant le break - plusieurs interventions
clips.append({"id": "voix-break-58", "instrumentId": "inst-voix-lead", "startTime": 58, "duration": 2, "trackIndex": 14})
clips.append({"id": "voix-break-62", "instrumentId": "inst-voix-lead", "startTime": 62, "duration": 2, "trackIndex": 14})

for beat in range(80, 112, 16):
    clips.append({"id": f"voix-drop-{beat}", "instrumentId": "inst-voix-lead", "startTime": beat, "duration": 2, "trackIndex": 14})

print(f"  Voix lead: {len(clips) - next_id + 1} nouveaux clips")
next_id = len(clips) + 1

# Ajouter FX Final (P16) - Plusieurs moments + pendant break
print("Ajout de FX supplémentaires...")
clips.append({"id": "fx-intro", "instrumentId": "inst-fx-final", "startTime": 0, "duration": 4, "trackIndex": 15})
clips.append({"id": "fx-buildup", "instrumentId": "inst-fx-final", "startTime": 44, "duration": 4, "trackIndex": 15})

# FX pendant le break pour créer de l'ambiance
clips.append({"id": "fx-break-start", "instrumentId": "inst-fx-final", "startTime": 48, "duration": 4, "trackIndex": 15})
clips.append({"id": "fx-break-mid", "instrumentId": "inst-fx-final", "startTime": 56, "duration": 4, "trackIndex": 15})

clips.append({"id": "fx-drop", "instrumentId": "inst-fx-final", "startTime": 64, "duration": 4, "trackIndex": 15})
clips.append({"id": "fx-outro-108", "instrumentId": "inst-fx-final", "startTime": 108, "duration": 4, "trackIndex": 15})
clips.append({"id": "fx-outro-116", "instrumentId": "inst-fx-final", "startTime": 116, "duration": 4, "trackIndex": 15})
clips.append({"id": "fx-outro-124", "instrumentId": "inst-fx-final", "startTime": 124, "duration": 4, "trackIndex": 15})

print(f"  FX: {len(clips) - next_id + 1} nouveaux clips")
next_id = len(clips) + 1

# Ajouter outro enrichi (beats 112-127)
print("Ajout d'instruments dans l'outro...")

# Quelques pads pour l'ambiance
clips.append({"id": "pad-outro", "instrumentId": "inst-pad-1", "startTime": 112, "duration": 16, "trackIndex": 6})

# Charleston doux
for beat in range(112, 128, 4):
    clips.append({"id": f"charleston-outro-{beat}", "instrumentId": "inst-charleston", "startTime": beat, "duration": 2, "trackIndex": 2})

# Voix lead finale
clips.append({"id": "voix-outro", "instrumentId": "inst-voix-lead", "startTime": 120, "duration": 2, "trackIndex": 14})

# Clap final
clips.append({"id": "clap-outro", "instrumentId": "inst-clap", "startTime": 124, "duration": 1, "trackIndex": 13})

print(f"  Outro: {len(clips) - next_id + 1} nouveaux clips")

composition['clips'] = clips

# Sauvegarder
with open('composition_complete_1min.json', 'w') as f:
    json.dump(composition, f, indent=2)

print(f"\n✅ Total final: {len(clips)} clips")
print(f"   Fichier: composition_complete_1min.json")
print(f"   Tous les 16 instruments sont utilisés!")
