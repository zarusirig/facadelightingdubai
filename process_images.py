import os
import glob
import subprocess
import shutil

src_dir = "/Users/surajgiri/.gemini/antigravity/brain/8f053e33-04c0-4e42-bacc-c8114a914a30"
dest_dir = "/Users/surajgiri/Desktop/facadelightingdubai/assets/images"

dirs_to_create = ["heroes", "building-types", "areas", "technical", "specialty", "case-studies", "inline", "og"]
for d in dirs_to_create:
    os.makedirs(os.path.join(dest_dir, d), exist_ok=True)

mapping = {
    # Heroes
    "home_hero": "heroes/home-hero.webp",
    "design_hero": "heroes/design-hero.webp",
    "led_tech_hero": "heroes/led-technology-hero.webp",
    "regulations_hero": "heroes/regulations-hero.webp",
    "installation_hero": "heroes/installation-hero.webp",
    "bldg_types_hero": "heroes/building-types-hero.webp",
    "cost_hero": "heroes/cost-hero.webp",
    "case_studies_hero": "heroes/case-studies-hero.webp",
    "services_hero2": "heroes/services-hero.webp",
    
    # OG / Global
    "facade_og": "og/facade-lighting-dubai-og.jpg",
    "services_og": "og/facade-lighting-services-dubai.jpg",
    "favicon_source": "og/favicon-source.png",
    
    # Building Types
    "villa_hero": "building-types/villa-hero.webp",
    "hotel_hero": "building-types/hotel-hero.webp",
    "com_tower_hero": "building-types/commercial-tower-hero.webp",
    "mosque_hero": "building-types/mosque-hero.webp",
    "retail_mall_hero": "building-types/retail-mall-hero.webp",
    
    # Areas
    "marina_hero": "areas/marina-jbr-hero.webp",
    "downtown_hero": "areas/downtown-hero.webp",
    "palm_hero": "areas/palm-hero.webp",
    "difc_hero": "areas/difc-hero.webp",
    "emirates_hero": "areas/emirates-hills-hero.webp",
    
    # Technical
    "wall_washing": "technical/wall-washing.webp",
    "grazing": "technical/grazing.webp",
    "accent_spot": "technical/accent-spot.webp",
    "color_temp": "technical/color-temperature.webp",
    "ip_rating": "technical/ip-rating.webp",
    "dmx_controls": "technical/dmx-controls.webp",
    "thermal_manage": "technical/thermal-management.webp",
    "sandstorm_prot": "technical/sandstorm-protection.webp",
    "photo_report": "technical/photometric-report.webp",
    "retrofit_vs": "technical/retrofit-vs-new.webp",
    "al_safat": "technical/al-safat.webp",
    "roi_analysis": "technical/roi-analysis.webp",
    
    # Specialty
    "media_facade": "specialty/media-facade.webp",
    "pixel_mapping": "specialty/pixel-mapping.webp",
    "kinetic_responsive": "specialty/kinetic-responsive.webp",
    "arabic_heritage": "specialty/arabic-heritage.webp",
    "minimalist_trends": "specialty/minimalist-trends.webp",
    "sustainable_light": "specialty/sustainable.webp",
    "dynamic_interact": "specialty/dynamic-interactive.webp",
    "villa_ideas": "specialty/villa-ideas.webp",
    
    # Case Studies
    "cs_tower_hero": "case-studies/case-study-1-hero.webp",
    "cs_resort_hero": "case-studies/case-study-2-hero.webp",
    "cs_gov_hero": "case-studies/case-study-3-hero.webp",
    "cs_mall_hero": "case-studies/case-study-4-hero.webp",
    
    # Inline
    "inline_design": "inline/inline-design-process.jpg",
    "inline_led_qual": "inline/inline-led-quality.jpg",
    "inline_ba": "inline/inline-before-after.jpg",
    "inline_mount": "inline/inline-mounting.jpg",
    "inline_wiring": "inline/inline-wiring.jpg",
    "inline_focus": "inline/inline-focusing.jpg"
}

def convert_image(src, dest):
    ext = dest.split('.')[-1].lower()
    if ext == 'webp':
        try:
            subprocess.run(['sips', '-s', 'format', 'webp', src, '--out', dest], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
        except:
            pass
        try:
            subprocess.run(['cwebp', '-q', '90', src, '-o', dest], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
        except:
            pass
    elif ext == 'jpg':
        try:
            subprocess.run(['sips', '-s', 'format', 'jpeg', src, '--out', dest], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
        except:
            pass
            
    # Fallback to pure copy if nothing else worked
    shutil.copy(src, dest)
    return True

for key, dest_path in mapping.items():
    # Find matching file
    matches = glob.glob(os.path.join(src_dir, f"{key}_*.png"))
    if not matches:
        matches = glob.glob(os.path.join(src_dir, f"{key}.png"))
        
    if matches:
        src_file = matches[0]
        dest_file = os.path.join(dest_dir, dest_path)
        convert_image(src_file, dest_file)
        print(f"Processed {key} -> {dest_path}")
    else:
        print(f"WARNING: Could not find source for {key}")
