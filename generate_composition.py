#!/usr/bin/env python3
"""
Générateur de composition musicale pour VideoSequencer
Crée une composition de 128 mesures avec break
"""
import json

def generate_clips(total_beats=512):
    """Génère les clips pour une composition complète"""
    clips = []
    clip_id = 0

    # SECTION 1: INTRO (0-63) - 16 mesures - Rythmique de base
    print("Génération Section 1: Intro (0-63)")
    # Grosse caisse: tous les 2 beats
    for beat in range(0, 64, 2):
        clips.append({
            "id": f"clip-{clip_id}",
            "instrumentId": "inst-grosse-caisse",
            "startTime": beat,
            "duration": 1,
            "trackIndex": 0
        })
        clip_id += 1

    # Caisse claire: contretemps (beats impairs)
    for beat in range(1, 64, 2):
        clips.append({
            "id": f"clip-{clip_id}",
            "instrumentId": "inst-caisse-claire",
            "startTime": beat,
            "duration": 1,
            "trackIndex": 1
        })
        clip_id += 1

    # Charleston: tous les 2 beats (pour réduire le nombre de clips)
    for beat in range(0, 64, 2):
        clips.append({
            "id": f"clip-{clip_id}",
            "instrumentId": "inst-charleston",
            "startTime": beat,
            "duration": 1,
            "trackIndex": 2
        })
        clip_id += 1

    print(f"  Section 1: {len(clips)} clips")

    # SECTION 2: BUILD-UP (64-191) - 32 mesures - Ajout basses + pads
    print("Génération Section 2: Build-up (64-191)")
    section2_start = len(clips)

    # Continuer rythmique
    for beat in range(64, 192, 2):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-grosse-caisse", "startTime": beat, "duration": 1, "trackIndex": 0})
        clip_id += 1
    for beat in range(65, 192, 2):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-caisse-claire", "startTime": beat, "duration": 1, "trackIndex": 1})
        clip_id += 1
    for beat in range(64, 192, 2):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-charleston", "startTime": beat, "duration": 1, "trackIndex": 2})
        clip_id += 1

    # Basses: notes longues (4 beats)
    for beat in range(64, 192, 4):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-basse-1", "startTime": beat, "duration": 4, "trackIndex": 4})
        clip_id += 1
    for beat in range(66, 192, 4):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-basse-2", "startTime": beat, "duration": 3, "trackIndex": 5})
        clip_id += 1

    # Pads: sections de 16 beats
    for beat in range(64, 192, 16):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-pad-1", "startTime": beat, "duration": 16, "trackIndex": 6})
        clip_id += 1

    print(f"  Section 2: {len(clips) - section2_start} clips")

    # SECTION 3: CLIMAX (192-255) - 16 mesures - Full band
    print("Génération Section 3: Climax (192-255)")
    section3_start = len(clips)

    # Rythmique
    for beat in range(192, 256, 2):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-grosse-caisse", "startTime": beat, "duration": 1, "trackIndex": 0})
        clip_id += 1
    for beat in range(193, 256, 2):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-caisse-claire", "startTime": beat, "duration": 1, "trackIndex": 1})
        clip_id += 1
    for beat in range(192, 256, 2):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-charleston", "startTime": beat, "duration": 1, "trackIndex": 2})
        clip_id += 1

    # Shaker: accents toutes les 8 mesures
    for beat in range(196, 256, 8):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-shaker", "startTime": beat, "duration": 1, "trackIndex": 3})
        clip_id += 1

    # Basses
    for beat in range(192, 256, 4):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-basse-1", "startTime": beat, "duration": 4, "trackIndex": 4})
        clip_id += 1
    for beat in range(194, 256, 4):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-basse-2", "startTime": beat, "duration": 3, "trackIndex": 5})
        clip_id += 1

    # Pads
    for beat in range(192, 256, 16):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-pad-1", "startTime": beat, "duration": 16, "trackIndex": 6})
        clip_id += 1
    for beat in range(200, 256, 16):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-pad-2", "startTime": beat, "duration": 16, "trackIndex": 7})
        clip_id += 1

    # Mélodies
    for beat in range(192, 256, 4):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-melodie-principale", "startTime": beat, "duration": 3, "trackIndex": 8})
        clip_id += 1
    for beat in range(193, 256, 4):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-contre-melodie", "startTime": beat, "duration": 3, "trackIndex": 9})
        clip_id += 1

    # Arpège
    for beat in range(192, 256, 2):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-arpege", "startTime": beat, "duration": 2, "trackIndex": 10})
        clip_id += 1

    # Riff
    for beat in range(193, 256, 4):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-riff", "startTime": beat, "duration": 2, "trackIndex": 11})
        clip_id += 1

    print(f"  Section 3: {len(clips) - section3_start} clips")

    # SECTION 4: BREAK (256-271) - 4 mesures - Silence relatif
    print("Génération Section 4: Break (256-271)")
    section4_start = len(clips)

    # Seulement claps et voix
    for beat in [256, 260, 264, 268]:
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-clap", "startTime": beat, "duration": 1, "trackIndex": 13})
        clip_id += 1

    clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-voix-lead", "startTime": 258, "duration": 2, "trackIndex": 14})
    clip_id += 1
    clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-voix-lead", "startTime": 266, "duration": 2, "trackIndex": 14})
    clip_id += 1

    print(f"  Section 4: {len(clips) - section4_start} clips")

    # SECTION 5: DROP (272-447) - 44 mesures - Maximum énergie
    print("Génération Section 5: Drop (272-447)")
    section5_start = len(clips)

    # Rythmique complète
    for beat in range(272, 448, 2):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-grosse-caisse", "startTime": beat, "duration": 1, "trackIndex": 0})
        clip_id += 1
    for beat in range(273, 448, 2):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-caisse-claire", "startTime": beat, "duration": 1, "trackIndex": 1})
        clip_id += 1
    for beat in range(272, 448, 2):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-charleston", "startTime": beat, "duration": 1, "trackIndex": 2})
        clip_id += 1

    # Shaker: accents
    for beat in range(276, 448, 8):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-shaker", "startTime": beat, "duration": 1, "trackIndex": 3})
        clip_id += 1

    # Basses
    for beat in range(272, 448, 4):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-basse-1", "startTime": beat, "duration": 4, "trackIndex": 4})
        clip_id += 1
    for beat in range(274, 448, 4):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-basse-2", "startTime": beat, "duration": 3, "trackIndex": 5})
        clip_id += 1

    # Pads
    for beat in range(272, 448, 16):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-pad-1", "startTime": beat, "duration": 16, "trackIndex": 6})
        clip_id += 1
    for beat in range(280, 448, 16):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-pad-2", "startTime": beat, "duration": 16, "trackIndex": 7})
        clip_id += 1

    # Mélodies
    for beat in range(272, 448, 4):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-melodie-principale", "startTime": beat, "duration": 3, "trackIndex": 8})
        clip_id += 1
    for beat in range(273, 448, 4):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-contre-melodie", "startTime": beat, "duration": 3, "trackIndex": 9})
        clip_id += 1

    # Arpège
    for beat in range(272, 448, 2):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-arpege", "startTime": beat, "duration": 2, "trackIndex": 10})
        clip_id += 1

    # Riff
    for beat in range(273, 448, 4):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-riff", "startTime": beat, "duration": 2, "trackIndex": 11})
        clip_id += 1

    # Souffle: dernières mesures
    for beat in range(400, 448, 2):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-souffle", "startTime": beat, "duration": 1, "trackIndex": 12})
        clip_id += 1

    # Claps: accents
    for beat in range(292, 448, 16):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-clap", "startTime": beat, "duration": 1, "trackIndex": 13})
        clip_id += 1

    # Voix lead: moments clés
    for beat in range(304, 448, 32):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-voix-lead", "startTime": beat, "duration": 2, "trackIndex": 14})
        clip_id += 1

    print(f"  Section 5: {len(clips) - section5_start} clips")

    # SECTION 6: OUTRO (448-511) - 16 mesures - Fade out progressif
    print("Génération Section 6: Outro (448-511)")
    section6_start = len(clips)

    # Rythmique s'arrête progressivement
    for beat in range(448, 480, 2):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-grosse-caisse", "startTime": beat, "duration": 1, "trackIndex": 0})
        clip_id += 1
    for beat in range(449, 480, 2):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-caisse-claire", "startTime": beat, "duration": 1, "trackIndex": 1})
        clip_id += 1

    # Pads continuent
    for beat in range(448, 512, 16):
        clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-pad-1", "startTime": beat, "duration": 16, "trackIndex": 6})
        clip_id += 1

    # FX final
    clips.append({"id": f"clip-{clip_id}", "instrumentId": "inst-fx-final", "startTime": 496, "duration": 16, "trackIndex": 15})
    clip_id += 1

    print(f"  Section 6: {len(clips) - section6_start} clips")
    print(f"\nTotal: {len(clips)} clips")

    return clips

# Générer la composition
clips = generate_clips()

# Créer le JSON complet
composition = {
    "version": "1.0",
    "bpm": 120,
    "totalBeats": 512,
    "gridSize": {"rows": 4, "cols": 4},
    "loopMode": False,
    "instruments": [
        {"id": "inst-grosse-caisse", "name": "Grosse Caisse", "color": "#ff6b6b", "gridPosition": 0, "offset": 0, "maxDuration": 0},
        {"id": "inst-caisse-claire", "name": "Caisse Claire", "color": "#4ecdc4", "gridPosition": 1, "offset": 0, "maxDuration": 0},
        {"id": "inst-charleston", "name": "Charleston", "color": "#45b7d1", "gridPosition": 2, "offset": 0, "maxDuration": 0},
        {"id": "inst-shaker", "name": "Shaker", "color": "#96ceb4", "gridPosition": 3, "offset": 0, "maxDuration": 0},
        {"id": "inst-basse-1", "name": "Basse 1", "color": "#ffeaa7", "gridPosition": 4, "offset": 0, "maxDuration": 0},
        {"id": "inst-basse-2", "name": "Basse 2", "color": "#fdcb6e", "gridPosition": 5, "offset": 0, "maxDuration": 0},
        {"id": "inst-pad-1", "name": "Pad 1", "color": "#a29bfe", "gridPosition": 6, "offset": 0, "maxDuration": 0},
        {"id": "inst-pad-2", "name": "Pad 2", "color": "#6c5ce7", "gridPosition": 7, "offset": 0, "maxDuration": 0},
        {"id": "inst-melodie-principale", "name": "Mélodie Principale", "color": "#fd79a8", "gridPosition": 8, "offset": 0, "maxDuration": 0},
        {"id": "inst-contre-melodie", "name": "Contre-Mélodie", "color": "#e17055", "gridPosition": 9, "offset": 0, "maxDuration": 0},
        {"id": "inst-arpege", "name": "Arpège", "color": "#74b9ff", "gridPosition": 10, "offset": 0, "maxDuration": 0},
        {"id": "inst-riff", "name": "Riff Vocal", "color": "#a29bfe", "gridPosition": 11, "offset": 0, "maxDuration": 0},
        {"id": "inst-souffle", "name": "Souffle Rythmique", "color": "#dfe6e9", "gridPosition": 12, "offset": 0, "maxDuration": 0},
        {"id": "inst-clap", "name": "Clap Collectif", "color": "#fab1a0", "gridPosition": 13, "offset": 0, "maxDuration": 0},
        {"id": "inst-voix-lead", "name": "Voix Lead", "color": "#ff7675", "gridPosition": 14, "offset": 0, "maxDuration": 0},
        {"id": "inst-fx-final", "name": "FX Final", "color": "#fd79a8", "gridPosition": 15, "offset": 0, "maxDuration": 0}
    ],
    "clips": clips
}

# Sauvegarder
output_file = "composition_128_mesures_complete.json"
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(composition, f, indent=2, ensure_ascii=False)

print(f"\n✅ Composition sauvegardée dans {output_file}")
print(f"   Structure: Intro → Build-up → Climax → Break → Drop → Outro")
print(f"   Durée: 512 beats = ~4min 16sec à 120 BPM")
