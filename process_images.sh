#!/bin/bash
SRC_DIR="/Users/surajgiri/.gemini/antigravity/brain/8f053e33-04c0-4e42-bacc-c8114a914a30"
DEST_DIR="/Users/surajgiri/Desktop/facadelightingdubai/assets/images"

mkdir -p "$DEST_DIR/heroes" "$DEST_DIR/building-types" "$DEST_DIR/areas" "$DEST_DIR/technical" "$DEST_DIR/specialty" "$DEST_DIR/case-studies" "$DEST_DIR/inline" "$DEST_DIR/og"

declare -A map
# Heroes
map[home_hero]="heroes/home-hero.webp"
map[design_hero]="heroes/design-hero.webp"
map[led_tech_hero]="heroes/led-technology-hero.webp"
map[regulations_hero]="heroes/regulations-hero.webp"
map[installation_hero]="heroes/installation-hero.webp"
map[bldg_types_hero]="heroes/building-types-hero.webp"
map[cost_hero]="heroes/cost-hero.webp"
map[case_studies_hero]="heroes/case-studies-hero.webp"
map[services_hero2]="heroes/services-hero.webp"
# OG / Global
map[facade_og]="og/facade-lighting-dubai-og.jpg"
map[services_og]="og/facade-lighting-services-dubai.jpg"
map[favicon_source]="og/favicon-source.png"
# Building Types
map[villa_hero]="building-types/villa-hero.webp"
map[hotel_hero]="building-types/hotel-hero.webp"
map[com_tower_hero]="building-types/commercial-tower-hero.webp"
map[mosque_hero]="building-types/mosque-hero.webp"
map[retail_mall_hero]="building-types/retail-mall-hero.webp"
# Areas
map[marina_hero]="areas/marina-jbr-hero.webp"
map[downtown_hero]="areas/downtown-hero.webp"
map[palm_hero]="areas/palm-hero.webp"
map[difc_hero]="areas/difc-hero.webp"
map[emirates_hero]="areas/emirates-hills-hero.webp"
# Technical
map[wall_washing]="technical/wall-washing.webp"
map[grazing]="technical/grazing.webp"
map[accent_spot]="technical/accent-spot.webp"
map[color_temp]="technical/color-temperature.webp"
map[ip_rating]="technical/ip-rating.webp"
map[dmx_controls]="technical/dmx-controls.webp"
map[thermal_manage]="technical/thermal-management.webp"
map[sandstorm_prot]="technical/sandstorm-protection.webp"
map[photo_report]="technical/photometric-report.webp"
map[retrofit_vs]="technical/retrofit-vs-new.webp"
map[al_safat]="technical/al-safat.webp"
map[roi_analysis]="technical/roi-analysis.webp"
# Specialty
map[media_facade]="specialty/media-facade.webp"
map[pixel_mapping]="specialty/pixel-mapping.webp"
map[kinetic_responsive]="specialty/kinetic-responsive.webp"
map[arabic_heritage]="specialty/arabic-heritage.webp"
map[minimalist_trends]="specialty/minimalist-trends.webp"
map[sustainable_light]="specialty/sustainable.webp"
map[dynamic_interact]="specialty/dynamic-interactive.webp"
map[villa_ideas]="specialty/villa-ideas.webp"
# Case Studies
map[cs_tower_hero]="case-studies/case-study-1-hero.webp"
map[cs_resort_hero]="case-studies/case-study-2-hero.webp"
map[cs_gov_hero]="case-studies/case-study-3-hero.webp"
map[cs_mall_hero]="case-studies/case-study-4-hero.webp"
# Inline
map[inline_design]="inline/inline-design-process.jpg"
map[inline_led_qual]="inline/inline-led-quality.jpg"
map[inline_ba]="inline/inline-before-after.jpg"
map[inline_mount]="inline/inline-mounting.jpg"
map[inline_wiring]="inline/inline-wiring.jpg"
map[inline_focus]="inline/inline-focusing.jpg"

for key in "${!map[@]}"; do
    src_file=$(ls "$SRC_DIR"/${key}_*.png 2>/dev/null | head -n 1)
    if [[ -z "$src_file" ]]; then
        src_file=$(ls "$SRC_DIR"/${key}.png 2>/dev/null | head -n 1)
    fi
    
    if [[ -n "$src_file" ]]; then
        dest="$DEST_DIR/${map[$key]}"
        ext="${dest##*.}"
        if [[ "$ext" == "webp" ]]; then
            if command -v sips &> /dev/null && sips -s format webp "$src_file" --out "$dest" &>/dev/null; then
                true
            elif command -v cwebp &> /dev/null && cwebp -q 90 "$src_file" -o "$dest" &>/dev/null; then
                true
            elif command -v ffmpeg &> /dev/null; then
                ffmpeg -y -hide_banner -loglevel error -i "$src_file" "$dest"
            else
                cp "$src_file" "$dest"
            fi
        elif [[ "$ext" == "jpg" ]]; then
            if command -v sips &> /dev/null && sips -s format jpeg "$src_file" --out "$dest" &>/dev/null; then
                true
            elif command -v ffmpeg &> /dev/null; then
                ffmpeg -y -hide_banner -loglevel error -i "$src_file" "$dest"
            else
                cp "$src_file" "$dest"
            fi
        else
            cp "$src_file" "$dest"
        fi
        echo "Processed $key -> ${map[$key]}"
    else
        echo "WARNING: Could not find source for $key"
    fi
done
