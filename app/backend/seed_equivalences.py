"""
Seed the equivalences table with curated cultural translation data.
Run: python seed_equivalences.py
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(os.environ["SUPABASE_URL"], os.environ.get("SUPABASE_SERVICE_KEY"))

EQUIVALENCES = [
    # ========== INDIAN ==========
    {"home_item": "paneer", "home_cuisine": "Indian", "us_equivalent": "queso fresco", "us_brand": "Cacique", "match_score": 65, "notes": "Queso fresco is softer and slightly saltier. For grilled paneer dishes, halloumi works better. Best option: make it at home with whole milk + lemon juice in 20 min.", "can_make_at_home": True, "home_recipe_summary": "Boil 4 cups whole milk, add 2 tbsp lemon juice, strain through cheesecloth, press for 20 min.", "aisle_hint": "Cheese aisle / Hispanic foods"},
    {"home_item": "atta (whole wheat flour)", "home_cuisine": "Indian", "us_equivalent": "whole wheat flour", "us_brand": "Bob's Red Mill", "match_score": 70, "notes": "Bob's Red Mill stone ground is closest. Indian atta is finer milled -- sift twice for soft rotis.", "can_make_at_home": False, "aisle_hint": "Baking aisle"},
    {"home_item": "ghee", "home_cuisine": "Indian", "us_equivalent": "clarified butter / ghee", "us_brand": "4th & Heart", "match_score": 95, "notes": "4th & Heart Original Ghee is excellent. Or make at home: simmer unsalted butter 15 min, strain.", "can_make_at_home": True, "home_recipe_summary": "Simmer 1 lb unsalted butter on low for 15-20 min until milk solids brown, strain.", "aisle_hint": "Health foods / butter aisle"},
    {"home_item": "basmati rice", "home_cuisine": "Indian", "us_equivalent": "basmati rice", "us_brand": "India Gate / Tilda", "match_score": 90, "notes": "India Gate Sella (parboiled) for biryani, Royal/Tilda for everyday. Avoid generic 'long grain'.", "can_make_at_home": False, "aisle_hint": "Rice aisle / International"},
    {"home_item": "curd / dahi", "home_cuisine": "Indian", "us_equivalent": "plain whole milk yogurt", "us_brand": "Fage 5%", "match_score": 75, "notes": "Fage Total 5% is thick like Indian curd. For thinner curd, mix with milk. Avoid Greek strained.", "can_make_at_home": True, "home_recipe_summary": "Heat milk to 110°F, mix in 2 tbsp existing yogurt, leave warm 8 hours.", "aisle_hint": "Dairy"},
    {"home_item": "moong dal", "home_cuisine": "Indian", "us_equivalent": "split yellow mung beans", "us_brand": "Swad / 24 Mantra", "match_score": 95, "notes": "Best at Indian grocery. Whole Foods carries it under 'split mung'.", "can_make_at_home": False, "aisle_hint": "Beans/legumes aisle"},
    {"home_item": "garam masala", "home_cuisine": "Indian", "us_equivalent": "garam masala", "us_brand": "MDH / Everest", "match_score": 90, "notes": "MDH and Everest brands are most authentic. McCormick version is bland.", "can_make_at_home": True, "home_recipe_summary": "Roast 2 tbsp coriander, 1 tbsp cumin, 1 tbsp cardamom, 1 cinnamon stick, grind.", "aisle_hint": "Spices / International"},
    {"home_item": "asafoetida (hing)", "home_cuisine": "Indian", "us_equivalent": "hing powder", "us_brand": "Vandevi / LG", "match_score": 90, "notes": "Only available at Indian grocery stores. There's no American substitute -- worth a special trip.", "can_make_at_home": False, "aisle_hint": "Indian grocery only"},
    {"home_item": "fresh curry leaves", "home_cuisine": "Indian", "us_equivalent": "frozen curry leaves", "us_brand": "Swad", "match_score": 70, "notes": "Frozen retains flavor better than dried. Bay leaves are NOT a substitute -- different flavor entirely.", "can_make_at_home": False, "aisle_hint": "Indian grocery freezer section"},
    {"home_item": "mustard oil", "home_cuisine": "Indian", "us_equivalent": "mustard oil", "us_brand": "KTC / Pure", "match_score": 85, "notes": "US-sold mustard oil is labeled 'for external use' due to FDA. Most home cooks heat it past smoke point first to remove erucic acid concerns.", "can_make_at_home": False, "aisle_hint": "Indian grocery"},

    # ========== ITALIAN ==========
    {"home_item": "ricotta salata", "home_cuisine": "Italian", "us_equivalent": "ricotta salata", "us_brand": "Locatelli", "match_score": 80, "notes": "Whole Foods or Italian deli only. Aged feta is a poor substitute -- too salty, wrong texture. Eataly carries DOP version.", "can_make_at_home": False, "aisle_hint": "Specialty cheese counter"},
    {"home_item": "pecorino romano", "home_cuisine": "Italian", "us_equivalent": "pecorino romano DOP", "us_brand": "Locatelli / Fulvi", "match_score": 95, "notes": "Locatelli is the standard. Avoid pre-grated -- flavor degrades fast. Get a wedge.", "can_make_at_home": False, "aisle_hint": "Cheese counter"},
    {"home_item": "guanciale", "home_cuisine": "Italian", "us_equivalent": "guanciale", "us_brand": "Niman Ranch / Bellentani", "match_score": 90, "notes": "Pancetta is acceptable. American bacon is NOT -- too smoky for proper carbonara/amatriciana.", "can_make_at_home": False, "aisle_hint": "Italian deli / specialty meats"},
    {"home_item": "san marzano tomatoes", "home_cuisine": "Italian", "us_equivalent": "San Marzano DOP tomatoes", "us_brand": "Cento / La Valle", "match_score": 90, "notes": "Look for 'DOP' seal -- many fakes. Cento Certified are reliable. Hunt's whole peeled work in a pinch.", "can_make_at_home": False, "aisle_hint": "Canned tomatoes"},
    {"home_item": "fresh mozzarella di bufala", "home_cuisine": "Italian", "us_equivalent": "buffalo mozzarella", "us_brand": "BelGioioso / Mozzarella Co.", "match_score": 75, "notes": "Whole Foods stocks BelGioioso. For real bufala, find an Italian deli -- imported is in water packets.", "can_make_at_home": False, "aisle_hint": "Cheese counter"},
    {"home_item": "00 flour (tipo 00)", "home_cuisine": "Italian", "us_equivalent": "00 flour", "us_brand": "Caputo", "match_score": 95, "notes": "Caputo Pizzeria is the standard. King Arthur 00 also works. All-purpose flour is an OK substitute for pasta but not pizza.", "can_make_at_home": False, "aisle_hint": "Baking / Italian"},
    {"home_item": "polenta", "home_cuisine": "Italian", "us_equivalent": "stone-ground cornmeal", "us_brand": "Bob's Red Mill / Bramata", "match_score": 80, "notes": "Bob's Red Mill yellow corn polenta is excellent. Avoid 'instant' -- terrible texture.", "can_make_at_home": False, "aisle_hint": "Baking / grains"},
    {"home_item": "primo sale (fresh sheep cheese)", "home_cuisine": "Italian", "us_equivalent": "primo sale", "us_brand": "(specialty only)", "match_score": 50, "notes": "Almost impossible to find. Ricotta salata is closest. Or make it: sheep milk + rennet + salt, 24 hours.", "can_make_at_home": True, "home_recipe_summary": "Heat 1 gal sheep milk to 90°F, add rennet, set 30 min, drain, salt, press 24 hr.", "aisle_hint": "Specialty Italian deli"},
    {"home_item": "pasta secca artigianale", "home_cuisine": "Italian", "us_equivalent": "bronze-die pasta", "us_brand": "De Cecco / Rustichella", "match_score": 80, "notes": "Look for 'bronze die' on packaging -- holds sauce better. Barilla is acceptable but not artisanal.", "can_make_at_home": False, "aisle_hint": "Pasta aisle"},
    {"home_item": "extra virgin olive oil", "home_cuisine": "Italian", "us_equivalent": "Italian EVOO", "us_brand": "California Olive Ranch / Frantoia", "match_score": 75, "notes": "California Olive Ranch Reserve is excellent value. Avoid blends labeled 'Mediterranean' -- often non-Italian.", "can_make_at_home": False, "aisle_hint": "Oils"},

    # ========== MEXICAN ==========
    {"home_item": "queso fresco", "home_cuisine": "Mexican", "us_equivalent": "queso fresco", "us_brand": "Cacique / V&V Supremo", "match_score": 95, "notes": "Cacique is widely available and authentic. Don't substitute with cotija -- too salty.", "can_make_at_home": False, "aisle_hint": "Hispanic foods / dairy"},
    {"home_item": "Mexican crema", "home_cuisine": "Mexican", "us_equivalent": "Mexican crema", "us_brand": "Cacique", "match_score": 90, "notes": "Cacique brand is authentic. Sour cream is too thick and tangy -- thin with milk in a pinch.", "can_make_at_home": False, "aisle_hint": "Dairy / Hispanic foods"},
    {"home_item": "masa harina", "home_cuisine": "Mexican", "us_equivalent": "masa harina", "us_brand": "Maseca", "match_score": 95, "notes": "Maseca is the universal brand. For tortillas: use 'instantánea'; for tamales: 'para tamales'.", "can_make_at_home": False, "aisle_hint": "Hispanic foods"},
    {"home_item": "dried guajillo chiles", "home_cuisine": "Mexican", "us_equivalent": "dried guajillo chiles", "us_brand": "El Guapo / Mexico Lindo", "match_score": 95, "notes": "Available at any Hispanic grocery. Toast briefly before using.", "can_make_at_home": False, "aisle_hint": "Hispanic foods / dried chiles"},
    {"home_item": "epazote", "home_cuisine": "Mexican", "us_equivalent": "dried epazote", "us_brand": "Hispanic specialty", "match_score": 70, "notes": "Fresh is rare in US -- find at Mexican grocery. Dried works for beans. No substitute -- unique flavor.", "can_make_at_home": False, "aisle_hint": "Mexican grocery"},
    {"home_item": "cotija cheese", "home_cuisine": "Mexican", "us_equivalent": "cotija cheese", "us_brand": "Cacique", "match_score": 90, "notes": "Cacique is good. Aged feta works in a pinch but more salty/tangy.", "can_make_at_home": False, "aisle_hint": "Cheese / Hispanic foods"},
    {"home_item": "Oaxacan chocolate", "home_cuisine": "Mexican", "us_equivalent": "Mexican chocolate", "us_brand": "Ibarra / Taza", "match_score": 80, "notes": "Ibarra (in tablets) is widely available. Taza Stone Ground is more artisan but pricier.", "can_make_at_home": False, "aisle_hint": "International foods"},

    # ========== CHINESE ==========
    {"home_item": "light soy sauce (生抽)", "home_cuisine": "Chinese", "us_equivalent": "light soy sauce", "us_brand": "Pearl River Bridge / Lee Kum Kee", "match_score": 95, "notes": "Pearl River Bridge Superior is the standard. Kikkoman is Japanese-style -- different flavor profile.", "can_make_at_home": False, "aisle_hint": "Asian grocery / international"},
    {"home_item": "dark soy sauce (老抽)", "home_cuisine": "Chinese", "us_equivalent": "dark soy sauce", "us_brand": "Pearl River Bridge", "match_score": 95, "notes": "Different from light -- thicker, sweeter, used for color. Don't substitute regular soy sauce.", "can_make_at_home": False, "aisle_hint": "Asian grocery"},
    {"home_item": "Shaoxing wine", "home_cuisine": "Chinese", "us_equivalent": "Shaoxing rice wine", "us_brand": "Pagoda / Gold Plum", "match_score": 90, "notes": "Pagoda is widely available. Dry sherry is acceptable substitute. Don't use 'cooking wine' (salted).", "can_make_at_home": False, "aisle_hint": "Asian grocery"},
    {"home_item": "doubanjiang (Sichuan chili bean paste)", "home_cuisine": "Chinese", "us_equivalent": "Pixian doubanjiang", "us_brand": "Pixian Douban / Lee Kum Kee", "match_score": 95, "notes": "Pixian is THE authentic brand. Lee Kum Kee version is more accessible at Asian groceries.", "can_make_at_home": False, "aisle_hint": "Asian grocery"},
    {"home_item": "Chinese black vinegar (镇江)", "home_cuisine": "Chinese", "us_equivalent": "Chinkiang vinegar", "us_brand": "Gold Plum / Chinkiang", "match_score": 95, "notes": "Gold Plum Chinkiang is authentic. Balsamic is NOT a substitute -- different fermentation.", "can_make_at_home": False, "aisle_hint": "Asian grocery"},
    {"home_item": "fresh wonton wrappers", "home_cuisine": "Chinese", "us_equivalent": "wonton wrappers", "us_brand": "Twin Marquis / Nasoya", "match_score": 80, "notes": "Twin Marquis (in Asian groceries) is best. Nasoya at regular stores is OK but thicker.", "can_make_at_home": True, "home_recipe_summary": "2 cups flour + 1 egg + 1/3 cup water + pinch salt, knead 10 min, rest, roll thin, cut squares.", "aisle_hint": "Refrigerated / Asian grocery"},

    # ========== KOREAN ==========
    {"home_item": "gochujang", "home_cuisine": "Korean", "us_equivalent": "gochujang", "us_brand": "Mother-in-Law / Chung Jung One", "match_score": 95, "notes": "Both brands authentic. Mother-in-Law is more accessible. Sriracha is NOT a substitute.", "can_make_at_home": False, "aisle_hint": "International / Korean grocery"},
    {"home_item": "kimchi", "home_cuisine": "Korean", "us_equivalent": "fresh kimchi", "us_brand": "Mother-in-Law / Jongga", "match_score": 90, "notes": "Mother-in-Law is widely available at Whole Foods. Avoid pre-fermented jars sitting at room temp.", "can_make_at_home": True, "home_recipe_summary": "Salt napa cabbage 2 hours, mix with gochugaru, garlic, ginger, fish sauce, ferment 3 days room temp.", "aisle_hint": "Refrigerated international"},
    {"home_item": "doenjang (Korean soybean paste)", "home_cuisine": "Korean", "us_equivalent": "doenjang", "us_brand": "Sempio / Chung Jung One", "match_score": 95, "notes": "Korean grocery preferred. Japanese miso is similar but sweeter -- doenjang is more pungent.", "can_make_at_home": False, "aisle_hint": "Asian / Korean grocery"},
    {"home_item": "gochugaru (Korean chili flakes)", "home_cuisine": "Korean", "us_equivalent": "Korean red pepper flakes", "us_brand": "Wang / Chung Jung One", "match_score": 95, "notes": "Coarse texture is essential -- different from generic crushed red pepper.", "can_make_at_home": False, "aisle_hint": "Korean grocery"},
    {"home_item": "Korean rice cakes (tteok)", "home_cuisine": "Korean", "us_equivalent": "frozen tteokbokki rice cakes", "us_brand": "Assi / Pulmuone", "match_score": 95, "notes": "Frozen at any Korean grocery. Soak frozen ones 30 min before cooking.", "can_make_at_home": False, "aisle_hint": "Korean grocery freezer"},

    # ========== VIETNAMESE ==========
    {"home_item": "fish sauce (nước mắm)", "home_cuisine": "Vietnamese", "us_equivalent": "Vietnamese fish sauce", "us_brand": "Red Boat 40°N / Three Crabs", "match_score": 95, "notes": "Red Boat 40°N is premium. Three Crabs is everyday standard. Avoid Thai brands -- different style.", "can_make_at_home": False, "aisle_hint": "Asian / international"},
    {"home_item": "rice paper wrappers (bánh tráng)", "home_cuisine": "Vietnamese", "us_equivalent": "spring roll rice paper", "us_brand": "Three Ladies / Red Rose", "match_score": 95, "notes": "Three Ladies brand is most authentic and widely available.", "can_make_at_home": False, "aisle_hint": "Asian aisle"},
    {"home_item": "Vietnamese coffee (cà phê)", "home_cuisine": "Vietnamese", "us_equivalent": "Trung Nguyên coffee", "us_brand": "Trung Nguyên / Café du Monde (chicory)", "match_score": 85, "notes": "Trung Nguyên 'Sang Tao' is authentic. Café du Monde is the chicory base used in coffee shops.", "can_make_at_home": False, "aisle_hint": "Coffee aisle / international"},

    # ========== FILIPINO ==========
    {"home_item": "coconut vinegar (suka)", "home_cuisine": "Filipino", "us_equivalent": "coconut vinegar", "us_brand": "Datu Puti", "match_score": 95, "notes": "Datu Puti is the household brand. Distilled white vinegar is NOT a substitute -- different fruity flavor.", "can_make_at_home": False, "aisle_hint": "Filipino grocery / international"},
    {"home_item": "fish sauce (patis)", "home_cuisine": "Filipino", "us_equivalent": "Filipino fish sauce", "us_brand": "Rufina / Datu Puti", "match_score": 90, "notes": "Filipino patis is lighter than Vietnamese nuoc mam. Rufina is a household name.", "can_make_at_home": False, "aisle_hint": "Filipino grocery"},
    {"home_item": "calamansi", "home_cuisine": "Filipino", "us_equivalent": "calamansi or lime+orange juice", "us_brand": "(frozen Filipino grocery)", "match_score": 60, "notes": "Fresh is rare. Frozen calamansi at Filipino grocery is good. Mix lime + orange juice 3:1 in a pinch.", "can_make_at_home": False, "aisle_hint": "Filipino grocery freezer"},

    # ========== NIGERIAN ==========
    {"home_item": "egusi (melon seeds)", "home_cuisine": "Nigerian", "us_equivalent": "ground egusi", "us_brand": "African grocery", "match_score": 90, "notes": "Available at African groceries. Pre-ground is convenient. Pumpkin seeds are NOT a substitute -- different flavor.", "can_make_at_home": False, "aisle_hint": "African grocery"},
    {"home_item": "palm oil", "home_cuisine": "Nigerian", "us_equivalent": "red palm oil", "us_brand": "Zomi / Praise", "match_score": 95, "notes": "Look for unrefined red palm oil at African groceries. NOT same as palm KERNEL oil.", "can_make_at_home": False, "aisle_hint": "African grocery"},
    {"home_item": "scotch bonnet peppers", "home_cuisine": "Nigerian", "us_equivalent": "scotch bonnet or habanero", "us_brand": "(produce)", "match_score": 85, "notes": "Habaneros are interchangeable -- same heat, similar fruity profile. Caribbean groceries carry both.", "can_make_at_home": False, "aisle_hint": "Produce / Caribbean grocery"},

    # ========== POLISH ==========
    {"home_item": "kielbasa", "home_cuisine": "Polish", "us_equivalent": "Polish smoked kielbasa", "us_brand": "Hillshire Farm (basic) / Krakus / Polana", "match_score": 75, "notes": "Polana or Krakus at Polish delis are authentic. Hillshire Farm is cheap but lacks depth.", "can_make_at_home": False, "aisle_hint": "Polish deli / international"},
    {"home_item": "twaróg (Polish farmer cheese)", "home_cuisine": "Polish", "us_equivalent": "farmer cheese", "us_brand": "Friendship / Polana", "match_score": 85, "notes": "Friendship Farmer Cheese works for pierogi. Polish delis carry imported twaróg.", "can_make_at_home": True, "home_recipe_summary": "Heat 1 gal milk + 2 cups buttermilk to 180°F, drain through cheesecloth, press 1 hour.", "aisle_hint": "Dairy"},
    {"home_item": "kapusta kiszona (sour kraut)", "home_cuisine": "Polish", "us_equivalent": "Polish-style sauerkraut", "us_brand": "Krakus / Bubbies", "match_score": 90, "notes": "Krakus jarred is authentic. Bubbies (refrigerated) is unpasteurized = more probiotic.", "can_make_at_home": False, "aisle_hint": "Pickled / international"},

    # ========== TURKISH ==========
    {"home_item": "Turkish yogurt (süzme)", "home_cuisine": "Turkish", "us_equivalent": "strained yogurt", "us_brand": "Karoun / Fage", "match_score": 80, "notes": "Karoun Mediterranean is closest. Fage Total 5% is acceptable but slightly tangier.", "can_make_at_home": True, "home_recipe_summary": "Strain plain yogurt through cheesecloth 4-6 hours in refrigerator.", "aisle_hint": "Dairy / Mediterranean"},
    {"home_item": "sumac", "home_cuisine": "Turkish", "us_equivalent": "ground sumac", "us_brand": "Sadaf / Penzeys", "match_score": 95, "notes": "Sadaf is authentic. Penzeys is high quality. No substitute -- unique sour-fruity flavor.", "can_make_at_home": False, "aisle_hint": "Spices / Middle Eastern"},
    {"home_item": "Turkish bulgur", "home_cuisine": "Turkish", "us_equivalent": "fine bulgur", "us_brand": "Duru / Sunnyland", "match_score": 95, "notes": "Duru #1 fine grind for kibbeh; #3 coarse for pilaf. Bob's Red Mill is OK alternative.", "can_make_at_home": False, "aisle_hint": "Grains / Middle Eastern"},
    {"home_item": "Aleppo pepper", "home_cuisine": "Turkish", "us_equivalent": "Aleppo pepper / pul biber", "us_brand": "Penzeys / Sadaf", "match_score": 90, "notes": "Penzeys Aleppo is reliable. Don't substitute crushed red pepper -- Aleppo is fruitier, less hot.", "can_make_at_home": False, "aisle_hint": "Middle Eastern / specialty spices"},
]


def seed():
    print(f"Seeding {len(EQUIVALENCES)} equivalences...")
    # Clear existing
    supabase.table("equivalences").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    # Insert in batches of 20
    for batch_start in range(0, len(EQUIVALENCES), 20):
        batch = EQUIVALENCES[batch_start:batch_start + 20]
        supabase.table("equivalences").insert(batch).execute()
        print(f"  Inserted batch {batch_start // 20 + 1} ({len(batch)} rows)")
    print(f"Done. Total: {len(EQUIVALENCES)}")


if __name__ == "__main__":
    seed()
